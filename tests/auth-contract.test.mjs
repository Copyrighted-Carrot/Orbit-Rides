import assert from 'node:assert/strict';
import { test } from 'node:test';
import { guardedSupabaseFetch } from '../lib/supabase/transport.ts';
import { safeReturnPath, isAccountRole, configuredApplicationOrigin } from '../lib/auth/paths.ts';
import { validPassword, emailDeliveryError } from '../lib/auth/form.ts';

test('historical archive requests never reach the network, including Auth GET links', async () => {
  const original = globalThis.fetch;
  let called = 0;
  globalThis.fetch = async () => { called++; return new Response('ok'); };
  try {
    const base = 'https://mcjjplnltatdmcuffhhf.supabase.co';
    for (const request of [
      new Request(base + '/auth/v1/verify?token=fake'),
      new Request(base + '/rest/v1/bookings', { method: 'POST', body: '{}' }),
      new Request(base + '/storage/v1/object/cars/test.png', { method: 'DELETE' }),
      new Request(base + '/rest/v1/vehicles'),
    ]) assert.equal((await guardedSupabaseFetch(request)).status, 503);
    assert.equal(called, 0);
    assert.equal((await guardedSupabaseFetch('http://127.0.0.1:54321/auth/v1/user')).status, 200);
    assert.equal(called, 1);
  } finally { globalThis.fetch = original; }
});

test('return paths stay within the trusted account role', () => {
  for (const value of ['https://example.com', '//example.com', '/admin', '/customer/../admin', '/customer\\evil', null, {}]) {
    assert.equal(safeReturnPath(value, 'customer'), '/customer');
  }
  assert.equal(safeReturnPath('/customer/settings?tab=profile', 'customer'), '/customer/settings?tab=profile');
  assert.equal(safeReturnPath('/admin/cars', 'admin'), '/admin/cars');
  assert.equal(safeReturnPath('/customer', 'admin'), '/admin');
  assert.equal(isAccountRole({ role: 'admin' }), false);
  assert.equal(isAccountRole('owner'), false);
});

test('password validation respects bcrypt UTF-8 byte limits', () => {
  assert.equal(validPassword('a'.repeat(12)), true);
  assert.equal(validPassword('a'.repeat(72)), true);
  assert.equal(validPassword('a'.repeat(73)), false);
  assert.equal(validPassword('a'.repeat(11)), false);
  assert.equal(validPassword('€'.repeat(25)), false);
});

test('canonical auth origin requires HTTPS except explicit local development', () => {
  assert.equal(configuredApplicationOrigin('http://127.0.0.1:3211/path'), 'http://127.0.0.1:3211');
  assert.equal(configuredApplicationOrigin('https://orbit.example/path'), 'https://orbit.example');
  for (const invalid of [undefined, 'invalid', 'http://orbit.example', 'ftp://localhost', 'https://user:pass@orbit.example']) {
    assert.equal(configuredApplicationOrigin(invalid), null);
  }
});

test('email throttling is reported truthfully without claiming delivery', () => {
  assert.match(emailDeliveryError({ code: 'over_email_send_rate_limit' }), /temporarily rate-limited/);
  assert.match(emailDeliveryError({ status: 429 }), /wait before requesting/);
  assert.equal(emailDeliveryError({ status: 500 }), null);
  assert.equal(emailDeliveryError(null), null);
});
