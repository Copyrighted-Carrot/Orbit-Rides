import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

// Native PostgreSQL fixture only. Uses the caller's PGPASSFILE; never accepts a URL/password.
assert.equal(process.env.PGHOST, '127.0.0.1');
assert.match(process.env.PGDATABASE ?? '', /^orbit_clean_[a-z0-9_]+$/);
const executable = process.env.PSQL_PATH ?? 'psql';
function start(sql) {
  const child = spawn(executable, ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1'], { stdio: ['pipe','pipe','pipe'], windowsHide: true });
  let stdout = '', stderr = '', locked;
  const lock = new Promise(resolve => { locked = resolve; });
  child.stdout.on('data', data => { stdout += data; if (stdout.includes('LOCKED')) locked(); });
  child.stderr.on('data', data => { stderr += data; });
  const result = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
  child.stdin.end(sql);
  return { lock, result };
}
async function query(sql) {
  const result = await start(sql).result;
  assert.equal(result.code, 0, result.stderr);
  return result.stdout.trim();
}
const literal = value => "'" + String(value).replaceAll("'", "''") + "'";
assert.match(await query('SHOW server_version;'), /^17\./);
const admin = await query("SELECT u.id FROM auth.users u JOIN public.user_roles r ON r.user_id=u.id WHERE u.email='operator@orbit-demo.example.invalid' AND r.role='admin';");
assert.match(admin, /^[a-f0-9-]{36}$/);
const actor = "SELECT set_config('request.jwt.claim.sub'," + literal(admin) + ",true); SET LOCAL ROLE authenticated;";
const vehicle = await query("BEGIN; " + actor + " SELECT public.create_vehicle('RACE-" + randomUUID().slice(0,8).toUpperCase() +
  "',(SELECT id FROM public.vehicle_types LIMIT 1),'Synthetic','Lock regression',10000); COMMIT;");
const vehicleId = vehicle.split('\n').at(-1);
const inspectionId = await query('SELECT id FROM public.inspections ORDER BY id LIMIT 1;');
assert.match(inspectionId, /^[a-f0-9-]{36}$/);
for (const inspection of [false, true]) {
  const bucket = inspection ? 'rental-inspections' : 'fleet-gallery';
  const discard = inspection ? 'discard_inspection_upload' : 'discard_vehicle_upload';
  const prepare = inspection
    ? "public.prepare_inspection_media(" + literal(inspectionId) + ",'image/png',70)"
    : "public.prepare_vehicle_media(" + literal(vehicleId) + ",'detail',0::smallint,'image/png',70)";
  async function create() {
    const output = await query('BEGIN; ' + actor + ' SELECT to_jsonb(m) FROM ' + prepare + ' m; COMMIT;');
    return JSON.parse(output.split('\n').at(-1));
  }
  const insert = media => "INSERT INTO storage.objects(id,bucket_id,name,metadata) VALUES(" +
    literal(randomUUID()) + "," + literal(bucket) + "," + literal(media.object_path) + ", '{\"size\":70,\"mimetype\":\"image/png\"}'::jsonb);";
  const cleanup = media => "SELECT public." + discard + "(" + literal(media.id) + "); SELECT public.finish_discarded_upload(" +
    literal(media.id) + "," + inspection + ");";
  const first = await create();
  const upload = start("BEGIN; " + actor + insert(first) + " SELECT 'LOCKED'; SELECT pg_sleep(2); COMMIT;");
  await Promise.race([upload.lock, upload.result.then(r => { throw new Error('Upload did not hold lock: ' + r.stderr); })]);
  const removal = await start("BEGIN; " + actor + cleanup(first) + " COMMIT;").result;
  assert.equal((await upload.result).code, 0);
  assert.notEqual(removal.code, 0, 'Cleanup deleted an association while upload was committing');
  assert.match(removal.stderr, /remove its object first/);
  // Native stand-in for successful Storage deletion, scoped to this single fixture.
  await query("BEGIN; " + actor + " SELECT public." + discard + "(" + literal(first.id) + "); DELETE FROM storage.objects WHERE bucket_id=" +
    literal(bucket) + " AND name=" + literal(first.object_path) + "; SELECT public.finish_discarded_upload(" + literal(first.id) + "," + inspection + "); COMMIT;");

  const second = await create();
  const deleteFirst = start("BEGIN; " + actor + cleanup(second) + " SELECT 'LOCKED'; SELECT pg_sleep(2); COMMIT;");
  await Promise.race([deleteFirst.lock, deleteFirst.result.then(r => { throw new Error('Cleanup did not hold lock: ' + r.stderr); })]);
  const rejectedUpload = await start("BEGIN; " + actor + insert(second) + " COMMIT;").result;
  assert.equal((await deleteFirst.result).code, 0);
  assert.notEqual(rejectedUpload.code, 0, 'Late upload survived deleted association');
  assert.match(rejectedUpload.stderr, /row-level security/);
  assert.equal(await query("SELECT count(*) FROM storage.objects WHERE bucket_id=" + literal(bucket) + " AND name=" + literal(second.object_path)), '0');
  console.log('PASS ' + bucket + ': upload-first cleanup waits; cleanup-first upload rejected; no orphan object');
}
await query("BEGIN; " + actor + " SELECT public.archive_vehicle(" + literal(vehicleId) + "); COMMIT;");

