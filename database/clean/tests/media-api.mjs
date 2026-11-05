import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { crc32, deflateSync } from 'node:zlib';
import { setTimeout } from 'node:timers/promises';

// Receive synthetic staging credentials on stdin. Keep passwords and tokens out of output.
const { project, key, accounts } = JSON.parse(readFileSync(0, 'utf8').replace(/^\uFEFF/, ''));
assert.equal(project, 'eqxajqvaatjcbtxhwksv');
assert.ok(accounts.length === 3 && accounts.every(account => account.email.endsWith('@orbit-demo.example.invalid')));
const origin = 'https://' + project + '.supabase.co';
const admin = accounts.find(account => account.role === 'admin');
const customers = accounts.filter(account => account.role === 'customer');
assert.ok(admin && customers.length === 2);
const sessions = new Map();
const failures = [];
let vehicleId;
let bookingId;

async function request(actor, path, { method = 'GET', data, bytes, contentType = 'application/json' } = {}) {
  const headers = { apikey: key, 'Content-Type': contentType };
  if (sessions.has(actor)) headers.Authorization = 'Bearer ' + sessions.get(actor);
  const response = await fetch(origin + path, {
    method, headers, body: bytes ?? (data === undefined ? undefined : JSON.stringify(data)),
    redirect: 'error', signal: AbortSignal.timeout(20000),
  });
  const content = Buffer.from(await response.arrayBuffer());
  const result = { ok: response.ok, status: response.status, bytes: content };
  if (response.headers.get('content-type')?.includes('application/json')) {
    result.value = content.length ? JSON.parse(content.toString('utf8')) : null;
  }
  return result;
}
function success(result, label) {
  assert.ok(result.ok, label + ' failed with HTTP ' + result.status + ' (' + (result.value?.code ?? '') + ')');
  return result.value;
}
function check(condition, label) {
  if (condition) console.log('PASS ' + label);
  else { failures.push(label); console.log('FAIL ' + label); }
}
const rpc = (actor, command, data) => request(actor, '/rest/v1/rpc/' + command, { method: 'POST', data });
const validate = (actor, media, inspection = false) => request(actor, '/functions/v1/validate-media', {
  method: 'POST', data: { media_id: media.id, inspection },
});
const read = async (actor, query) => success(await request(actor, '/rest/v1/' + query), 'Read ' + query.split('?')[0]);
const mediaColumns = 'id,vehicle_id,category,position,object_path,content_type,byte_length,state';
const mediaRows = actor => read(actor, 'vehicle_media?select=' + mediaColumns + '&vehicle_id=eq.' + vehicleId);
const objectUrl = (bucket, path) => '/storage/v1/object/' + bucket + '/' + path;
const upload = (actor, bucket, media, bytes, contentType = 'image/png') => request(actor, objectUrl(bucket, media.object_path), { method: 'POST', bytes, contentType });
const download = (actor, bucket, media) => request(actor, '/storage/v1/object/authenticated/' + bucket + '/' + media.object_path);
const remove = (actor, bucket, media) => request(actor, '/storage/v1/object/' + bucket, { method: 'DELETE', data: { prefixes: [media.object_path] } });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const prepare = async (bytes, overrides = {}) => success(await rpc(admin, 'prepare_vehicle_media', {
  p_vehicle_id: vehicleId, p_category: 'exterior', p_position: 0,
  p_content_type: 'image/png', p_byte_length: bytes.length, ...overrides,
}), 'Prepare vehicle media');
async function discard(media, inspection = false) {
  const bucket = inspection ? 'rental-inspections' : 'fleet-gallery';
  success(await rpc(admin, inspection ? 'discard_inspection_upload' : 'discard_vehicle_upload', { p_media_id: media.id }), 'Discard upload');
  success(await remove(admin, bucket, media), 'Remove discarded object');
  success(await rpc(admin, 'finish_discarded_upload', { p_media_id: media.id, p_inspection: inspection }), 'Finish discarded upload');
  success(await rpc(admin, 'finish_discarded_upload', { p_media_id: media.id, p_inspection: inspection }), 'Repeat discarded upload cleanup');
  assert.equal((await download(admin, bucket, media)).ok, false);
}
function png(red, green, blue) {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const length = Buffer.alloc(4), checksum = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    checksum.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.from([0, red, green, blue]))), chunk('IEND', Buffer.alloc(0)),
  ]);
}
const originalBytes = png(255, 0, 0), replacementBytes = png(0, 255, 0);

try {
  for (const account of accounts) {
    const session = success(await request(null, '/auth/v1/token?grant_type=password', {
      method: 'POST', data: { email: account.email, password: account.password },
    }), 'Fixture sign-in');
    assert.equal(session.user.id, account.id);
    sessions.set(account, session.access_token);
  }
  const [type] = await read(admin, 'vehicle_types?select=id&limit=1');
  assert.ok(type);
  vehicleId = success(await rpc(admin, 'create_vehicle', {
    p_fleet_code: 'MEDIA-' + randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase(),
    p_vehicle_type_id: type.id, p_manufacturer: 'Synthetic', p_model: 'Media regression fixture', p_daily_rate_minor: 10000,
  }), 'Create dedicated vehicle');
  console.log('Fixture vehicle ' + vehicleId);
  const original = await prepare(originalBytes);
  for (const customer of customers) {
    assert.equal((await rpc(customer, 'prepare_vehicle_media', {
      p_vehicle_id: vehicleId, p_category: 'exterior', p_position: 0, p_content_type: 'image/png', p_byte_length: originalBytes.length,
    })).status, 403);
    assert.equal((await upload(customer, 'fleet-gallery', original, originalBytes)).ok, false);
    assert.equal((await rpc(customer, 'publish_vehicle_media', { p_media_id: original.id })).status, 403);
  }
  assert.equal((await upload(admin, 'fleet-gallery', { object_path: vehicleId + '/' + randomUUID() + '.png' }, originalBytes)).ok, false);
  assert.equal((await rpc(admin, 'publish_vehicle_media', { p_media_id: original.id })).ok, false);
  success(await upload(admin, 'fleet-gallery', original, originalBytes), 'Upload original PNG');
  assert.equal((await rpc(admin, 'publish_vehicle_media', { p_media_id: original.id })).ok, false);
  assert.equal((await validate(null, original)).ok, false);
  assert.equal((await validate(customers[0], original)).status, 403);
  assert.equal((await rpc(admin, 'record_media_validation', {
    p_media_id: original.id, p_inspection: false, p_object_id: randomUUID(),
    p_sha256: hash(originalBytes), p_content_type: 'image/png', p_byte_length: originalBytes.length,
    p_width: 1, p_height: 1,
  })).status, 403);
  const decodedOriginal = success(await validate(admin, original), 'Validate decoded PNG');
  assert.equal(decodedOriginal.sha256, hash(originalBytes));
  success(await validate(admin, original), 'Repeat content validation');
  assert.equal((await download(customers[0], 'fleet-gallery', original)).ok, false);
  assert.equal((await mediaRows(customers[0])).length, 0);
  success(await rpc(admin, 'publish_vehicle_media', { p_media_id: original.id }), 'Publish original media');
  assert.equal((await download(null, 'fleet-gallery', original)).ok, false);
  success(await rpc(admin, 'set_vehicle_publication', { p_vehicle_id: vehicleId, p_published: true }), 'Publish fixture vehicle');
  const publicOriginal = await download(null, 'fleet-gallery', original);
  success(publicOriginal, 'Anonymous current gallery image');
  assert.equal(hash(publicOriginal.bytes), hash(originalBytes));
  assert.deepEqual((await mediaRows(customers[0])).map(media => media.id), [original.id]);
  console.log('PASS authorized preparation/upload/publication, checksum, unpublished isolation and customer mutation denial');

  // Start a short synthetic rental so inspection media can be tested without editing seeded rentals.
  const startsAt = new Date(Date.now() + 60000);
  const quoteId = success(await rpc(customers[0], 'create_quote', {
    p_vehicle_id: vehicleId, p_starts_at: startsAt.toISOString(),
    p_ends_at: new Date(startsAt.getTime() + 3600000).toISOString(), p_request_id: randomUUID(),
  }), 'Create inspection fixture quote');
  bookingId = success(await rpc(customers[0], 'start_checkout', { p_quote_id: quoteId }), 'Start inspection fixture checkout');
  const [payment] = await read(customers[0], 'payment_sessions?select=id&booking_id=eq.' + bookingId);
  success(await rpc(customers[0], 'approve_demo_payment', { p_session_id: payment.id }), 'Approve synthetic demo payment');
  success(await rpc(customers[0], 'finalize_booking', { p_session_id: payment.id }), 'Finalize inspection fixture');
  success(await rpc(admin, 'mark_ready', { p_booking_id: bookingId }), 'Mark fixture ready');

  const replacement = await prepare(replacementBytes);
  success(await upload(admin, 'fleet-gallery', replacement, replacementBytes), 'Upload replacement');
  success(await validate(admin, replacement), 'Validate replacement');
  success(await rpc(admin, 'publish_vehicle_media', { p_media_id: replacement.id }), 'Publish replacement');
  success(await rpc(admin, 'publish_vehicle_media', { p_media_id: replacement.id }), 'Repeat publication');
  assert.deepEqual((await mediaRows(null)).map(media => media.id), [replacement.id]);
  assert.equal((await download(customers[0], 'fleet-gallery', original)).ok, false);
  assert.equal(hash((await download(admin, 'fleet-gallery', original)).bytes), hash(originalBytes));
  success(await rpc(admin, 'publish_vehicle_media', { p_media_id: original.id }), 'Restore original version');
  assert.deepEqual((await mediaRows(customers[0])).map(media => media.id), [original.id]);
  assert.equal(hash((await download(null, 'fleet-gallery', original)).bytes), hash(originalBytes));
  assert.equal((await rpc(admin, 'discard_vehicle_upload', { p_media_id: original.id })).ok, false);
  assert.equal((await rpc(admin, 'discard_vehicle_upload', { p_media_id: replacement.id })).ok, false);
  success(await remove(admin, 'fleet-gallery', original), 'Attempt current-object deletion');
  success(await download(admin, 'fleet-gallery', original), 'Current object survives denied deletion');
  console.log('PASS replacement, repeated publication, retired-version privacy, recovery and retained-version deletion denial');

  const missing = await prepare(originalBytes, { p_position: 1 });
  assert.equal((await rpc(admin, 'publish_vehicle_media', { p_media_id: missing.id })).ok, false);
  await discard(missing);
  const oversized = await rpc(admin, 'prepare_vehicle_media', {
    p_vehicle_id: vehicleId, p_category: 'detail', p_position: 1, p_content_type: 'image/png', p_byte_length: 8388609,
  });
  assert.equal(oversized.ok, false);
  const mismatched = await prepare(originalBytes, { p_position: 1, p_byte_length: originalBytes.length + 1 });
  assert.equal((await upload(admin, 'fleet-gallery', mismatched, originalBytes, 'text/plain')).ok, false);
  success(await upload(admin, 'fleet-gallery', mismatched, originalBytes), 'Upload size-mismatch fixture');
  assert.equal((await validate(admin, mismatched)).status, 422);
  assert.equal((await rpc(admin, 'publish_vehicle_media', { p_media_id: mismatched.id })).ok, false);
  success(await rpc(admin, 'discard_vehicle_upload', { p_media_id: mismatched.id }), 'Discard mismatched upload');
  assert.equal((await rpc(admin, 'finish_discarded_upload', { p_media_id: mismatched.id })).ok, false);
  await discard(mismatched);
  assert.equal((await mediaRows(admin)).filter(media => ['pending', 'discarded'].includes(media.state)).length, 0);
  console.log('PASS absent-object, declared-size, MIME and oversize rejection with retriable orphan cleanup');

  const wait = startsAt.getTime() - Date.now() + 1000;
  if (wait > 0) await setTimeout(wait);
  const inspectionId = success(await rpc(admin, 'pick_up', {
    p_booking_id: bookingId, p_condition: 'Synthetic media test', p_fuel_percent: 80, p_odometer_km: 100,
    p_damage: '', p_staff_notes: 'Synthetic fixture, no customer PII',
  }), 'Record fixture pickup');
  const inspection = success(await rpc(admin, 'prepare_inspection_media', {
    p_inspection_id: inspectionId, p_content_type: 'image/png', p_byte_length: originalBytes.length,
  }), 'Prepare inspection image');
  assert.equal((await upload(admin, 'fleet-gallery', inspection, originalBytes)).ok, false);
  assert.equal((await upload(customers[0], 'rental-inspections', inspection, originalBytes)).ok, false);
  success(await upload(admin, 'rental-inspections', inspection, originalBytes), 'Upload inspection image');
  assert.equal((await rpc(admin, 'attach_inspection_media', { p_media_id: inspection.id })).ok, false);
  success(await validate(admin, inspection, true), 'Validate inspection image');
  assert.equal((await rpc(admin, 'attach_inspection_media', { p_media_id: inspection.id })).ok, true);
  assert.equal((await rpc(admin, 'attach_inspection_media', { p_media_id: inspection.id })).ok, true);
  assert.equal(hash((await download(admin, 'rental-inspections', inspection)).bytes), hash(originalBytes));
  assert.equal((await download(customers[0], 'rental-inspections', inspection)).ok, false);
  assert.equal((await download(null, 'rental-inspections', inspection)).ok, false);
  assert.equal((await read(customers[0], 'inspection_media?select=id&inspection_id=eq.' + inspectionId)).length, 0);
  assert.equal((await rpc(admin, 'publish_vehicle_media', { p_media_id: inspection.id })).ok, false);
  assert.equal((await rpc(admin, 'discard_vehicle_upload', { p_media_id: inspection.id })).ok, false);
  assert.equal((await rpc(admin, 'discard_inspection_upload', { p_media_id: inspection.id })).ok, false);
  success(await remove(admin, 'rental-inspections', inspection), 'Attempt attached-evidence deletion');
  success(await download(admin, 'rental-inspections', inspection), 'Attached evidence retained');
  const unfinishedInspection = success(await rpc(admin, 'prepare_inspection_media', {
    p_inspection_id: inspectionId, p_content_type: 'image/png', p_byte_length: originalBytes.length,
  }), 'Prepare unfinished inspection image');
  success(await upload(admin, 'rental-inspections', unfinishedInspection, originalBytes), 'Upload unfinished evidence');
  await discard(unfinishedInspection, true);
  console.log('PASS inspection bucket isolation, customer privacy, attachment retry, evidence retention and unfinished-media cleanup');

  success(await rpc(admin, 'return_vehicle', {
    p_booking_id: bookingId, p_condition: 'Synthetic media test completed', p_fuel_percent: 80, p_odometer_km: 100,
    p_damage: '', p_staff_notes: 'Synthetic fixture completed',
  }), 'Return fixture');
  success(await rpc(admin, 'start_inspection', { p_booking_id: bookingId }), 'Start fixture inspection');
  success(await rpc(admin, 'finish_inspection', {
    p_booking_id: bookingId, p_passed: true, p_reason: 'Synthetic media API verification complete',
  }), 'Complete fixture inspection');

  // A MIME header alone must not make arbitrary bytes into a validated image.
  success(await rpc(admin, 'set_vehicle_publication', { p_vehicle_id: vehicleId, p_published: false }), 'Unpublish fixture');
  const invalidBytes = Buffer.from('Synthetic fixture with an image MIME header but no image bytes.');
  const invalid = await prepare(invalidBytes, { p_category: 'detail', p_position: 31 });
  const invalidUpload = await upload(admin, 'fleet-gallery', invalid, invalidBytes);
  if (invalidUpload.ok) assert.equal((await validate(admin, invalid)).status, 422);
  const invalidPublication = invalidUpload.ok ? await rpc(admin, 'publish_vehicle_media', { p_media_id: invalid.id }) : invalidUpload;
  check(!invalidPublication.ok, 'Image validation rejects non-image bytes even with a matching allowed MIME header and size');
  if (!invalidPublication.ok) await discard(invalid);
} finally {
  try {
    if (vehicleId) {
      success(await rpc(admin, 'set_vehicle_publication', { p_vehicle_id: vehicleId, p_published: false }), 'Hide fixture');
      const archived = await rpc(admin, 'archive_vehicle', { p_vehicle_id: vehicleId });
      if (!archived.ok) {
        console.log('Fixture cleanup requires completing booking ' + bookingId + ' before archiving vehicle ' + vehicleId);
      } else console.log('PASS fixture archived with synthetic media and history retained');
    }
  } finally {
    for (const actor of sessions.keys()) await request(actor, '/auth/v1/logout?scope=local', { method: 'POST' });
  }
}
assert.equal(failures.length, 0, failures.join('; '));
