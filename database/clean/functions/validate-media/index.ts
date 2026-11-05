import { Image } from 'npm:imagescript@3.13.1';

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_PIXELS = 20_000_000;
const headers = {
  'Content-Type': 'application/json', 'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, value: object) => new Response(JSON.stringify(value), { status, headers });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function boundedBytes(response: Response, limit: number): Promise<Uint8Array> {
  const declared = Number(response.headers.get('content-length'));
  if (declared > limit || !response.body) throw new Error('Invalid content size');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > limit) throw new Error('Content too large');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

function imageType(bytes: Uint8Array): string {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes.length >= 8 && bytes.slice(0, 8).every((v, i) => v === [137,80,78,71,13,10,26,10][i])) {
    // Gallery/inspection assets are still photographs. Do not decode only one
    // frame of an animation and then attest to the entire animated object.
    const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 8, ended = false;
    while (offset + 12 <= bytes.length) {
      const size = data.getUint32(offset);
      if (offset + 12 + size > bytes.length) throw new Error('Truncated PNG');
      const kind = ascii(offset + 4, offset + 8);
      if (kind === 'acTL') throw new Error('Animated images are not supported');
      offset += 12 + size;
      if (kind === 'IEND') { ended = true; break; }
    }
    if (!ended || offset !== bytes.length) throw new Error('Invalid PNG');
    return 'image/png';
  }
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 &&
      bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217) return 'image/jpeg';
  if (bytes.length >= 20 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') {
    const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (data.getUint32(4, true) + 8 !== bytes.length) throw new Error('Invalid WebP');
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const kind = ascii(offset, offset + 4), size = data.getUint32(offset + 4, true);
      if (offset + 8 + size > bytes.length) throw new Error('Truncated WebP');
      if (kind === 'ANIM' || kind === 'ANMF') throw new Error('Animated images are not supported');
      offset += 8 + size + size % 2;
    }
    return 'image/webp';
  }
  throw new Error('Unsupported image content');
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply(405, { error: 'POST required' });
  const origin = Deno.env.get('SUPABASE_URL');
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  // The historical archive is never a reconstruction target.
  if (!origin || !publicKey || !serviceKey || new URL(origin).hostname === 'mcjjplnltatdmcuffhhf.supabase.co') {
    return reply(503, { error: 'Media validation is not configured' });
  }
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return reply(401, { error: 'Sign in required' });
  const callerHeaders = { apikey: publicKey, Authorization: authorization };
  const caller = (path: string) => fetch(origin + path, {
    headers: callerHeaders, redirect: 'error', signal: AbortSignal.timeout(15_000),
  });
  try {
    const userResponse = await caller('/auth/v1/user');
    if (!userResponse.ok) return reply(401, { error: 'Sign in required' });
    const user = await userResponse.json();
    if (!uuid.test(user.id)) return reply(401, { error: 'Sign in required' });
    const roleResponse = await caller('/rest/v1/user_roles?select=role&user_id=eq.' + user.id);
    if (!roleResponse.ok) return reply(503, { error: 'Role lookup unavailable' });
    const roles = await roleResponse.json();
    if (roles.length !== 1 || roles[0].role !== 'admin') return reply(403, { error: 'Staff access required' });

    let body;
    try {
      const raw = await boundedBytes(new Response(request.body), 1024);
      body = JSON.parse(new TextDecoder().decode(raw));
    } catch { return reply(400, { error: 'Invalid request' }); }
    if (!body || !uuid.test(body.media_id) || typeof body.inspection !== 'boolean') {
      return reply(400, { error: 'A media reference and inspection flag are required' });
    }
    const table = body.inspection ? 'inspection_media' : 'vehicle_media';
    const bucket = body.inspection ? 'rental-inspections' : 'fleet-gallery';
    const mediaResponse = await caller('/rest/v1/' + table +
      '?select=id,object_path,content_type,byte_length,state&id=eq.' + body.media_id);
    if (!mediaResponse.ok) return reply(503, { error: 'Media lookup unavailable' });
    const rows = await mediaResponse.json();
    if (rows.length !== 1 || rows[0].state === 'discarded') return reply(404, { error: 'Media unavailable' });
    const media = rows[0];
    const objectPath = media.object_path.split('/').map(encodeURIComponent).join('/');
    const infoPath = '/storage/v1/object/info/' + bucket + '/' + objectPath;
    const infoResponse = await caller(infoPath);
    if (!infoResponse.ok) return reply(409, { error: 'Upload the media object first' });
    const info = await infoResponse.json();
    if (!uuid.test(info.id)) return reply(409, { error: 'Storage object identity unavailable' });
    const download = await caller('/storage/v1/object/authenticated/' + bucket + '/' + objectPath);
    if (!download.ok) return reply(409, { error: 'Uploaded media unavailable' });
    let bytes: Uint8Array, decoded;
    try {
      bytes = await boundedBytes(download, MAX_BYTES);
      if (bytes.length !== media.byte_length || imageType(bytes) !== media.content_type) throw new Error('Content mismatch');
      decoded = await Image.decode(bytes, { maxPixels: MAX_PIXELS, threads: 1, applyOrientation: false, applyColorProfile: false });
      if (decoded.width < 1 || decoded.height < 1 || decoded.width > 10000 || decoded.height > 10000 ||
          decoded.width * decoded.height > MAX_PIXELS) throw new Error('Image dimensions exceed limit');
    } catch {
      return reply(422, { error: 'Upload a valid still JPEG, PNG or WebP image within the size and pixel limits' });
    }
    const afterResponse = await caller(infoPath);
    if (!afterResponse.ok) return reply(409, { error: 'Storage object changed during validation' });
    const after = await afterResponse.json();
    if (info.id !== after.id || info.version !== after.version || info.etag !== after.etag) {
      return reply(409, { error: 'Storage object changed during validation' });
    }
    const digest = await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer);
    const sha256 = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
    const recorded = await fetch(origin + '/rest/v1/rpc/record_media_validation', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000),
      headers: { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_media_id: media.id, p_inspection: body.inspection, p_object_id: info.id,
        p_sha256: sha256, p_content_type: media.content_type, p_byte_length: bytes.length,
        p_width: decoded.width, p_height: decoded.height,
      }),
    });
    if (!recorded.ok) return reply(409, { error: 'Media changed or validation could not be recorded; retry safely' });
    return reply(200, { media_id: media.id, sha256, width: decoded.width, height: decoded.height });
  } catch { return reply(503, { error: 'Media validation unavailable; retry later' }); }
});

