import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

// Supply synthetic accounts and the publishable key on stdin from a secret store.
// Requests are restricted to the disposable project. No tokens or user bodies are logged.
const { project, key, accounts } = JSON.parse(readFileSync(0, 'utf8').replace(/^\uFEFF/, ''));
assert.equal(project, 'eqxajqvaatjcbtxhwksv');
assert.equal(accounts.length, 3);
assert.ok(accounts.every(account => account.email.endsWith('@orbit-demo.example.invalid')));
const origin = 'https://' + project + '.supabase.co';
const sessions = new Map();
const passed = [];

async function request(path, { method = 'GET', token, data } = {}) {
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const response = await fetch(origin + path, {
    method, headers, body: data ? JSON.stringify(data) : undefined,
    redirect: 'error', signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}
function expect(response, status, check) {
  if (![].concat(status).includes(response.status)) throw Error(check + ' failed: HTTP ' + response.status);
  return response.body;
}
async function signIn(account) {
  const result = await request('/auth/v1/token?grant_type=password', {
    method: 'POST', data: { email: account.email, password: account.password },
  });
  const session = expect(result, 200, 'Password sign-in');
  assert.equal(session.user.id, account.id);
  sessions.set(account.id, session);
  return session;
}
async function signOut(account) {
  const session = sessions.get(account.id);
  if (!session) return;
  expect(await request('/auth/v1/logout?scope=local', { method: 'POST', token: session.access_token }), [200,204], 'Sign out');
  sessions.delete(account.id);
}
const customers = accounts.filter(a => a.role === 'customer');
const [a,b] = customers;
const admin = accounts.find(account => account.role === 'admin');
assert.ok(admin && customers.length === 2);
let restoreName = false, restoreMetadata = false;
const tokenFor = account => sessions.get(account.id).access_token;
const profile = async (viewer, id) => expect(await request('/rest/v1/user_profiles?select=user_id,display_name&user_id=eq.' + id, { token: tokenFor(viewer) }), 200, 'Profile read');
const rpc = (viewer, name, args) => request('/rest/v1/rpc/' + name, { method: 'POST', token: tokenFor(viewer), data: args });
const claimsFor = async account => expect(await request('/rest/v1/user_roles?select=user_id,role', {token: tokenFor(account)}), 200, 'Role read');
try {
  expect(await request('/rest/v1/user_profiles?select=user_id'), [401,403], 'Anonymous profile denial');
  for (const account of accounts) {
    await signIn(account);
    const identity = expect(await request('/auth/v1/user', { token: tokenFor(account) }), 200, 'Verified user');
    assert.equal(identity.id, account.id);
    assert.ok(identity.email_confirmed_at);
    const roles = await claimsFor(account);
    assert.equal(roles.find(r => r.user_id === account.id)?.role, account.role);
    if (account.role === 'customer') assert.equal(roles.length, 1);
  }
  passed.push('Password sign-in, confirmed emails and database roles for all three accounts');
  assert.equal((await profile(a,b.id)).length,0);
  assert.equal((await profile(b,a.id)).length,0);
  assert.equal((await profile(admin,a.id))[0].display_name, a.display_name);
  assert.equal((await claimsFor(admin)).length,3);
  expect(await request('/rest/v1/user_roles?user_id=eq.' + a.id, {method:'PATCH',token:tokenFor(a),data:{role:'admin'}}),[401,403],'Direct role change denial');
  expect(await request('/rest/v1/user_profiles?user_id=eq.' + b.id,{method:'PATCH',token:tokenFor(a),data:{display_name:'unauthorized'}}),[401,403],'Direct profile change denial');
  passed.push('Anonymous/customer/admin visibility, wrong-owner write and role forgery rejection');
  const updated = expect(await request('/auth/v1/user',{method:'PUT',token:tokenFor(a),data:{data:{role:'admin'}}}),200,'User-editable metadata update');
  restoreMetadata=true;
  assert.equal(updated.user_metadata.role,'admin');
  assert.equal((await claimsFor(a))[0].role,'customer');
  const denied=await rpc(a,'set_vehicle_publication',{p_vehicle_id:'00000000-0000-0000-0000-000000000000',p_published:true});
  expect(denied,403,'Staff-only fleet command denial');
  assert.equal(denied.body.code,'42501');
  passed.push('Forged Auth metadata confers no staff access');
  const name=a.display_name+' (updated)';
  const invalid=await rpc(a,'update_my_profile',{p_display_name:'   '});
  expect(invalid,400,'Invalid profile name');
  assert.equal(invalid.body.code,'22023');
  expect(await rpc(a,'update_my_profile',{p_display_name:name}),200,'Owner profile edit');
  restoreName=true;
  assert.equal((await profile(admin,a.id))[0].display_name,name);
  const oldSession=sessions.get(a.id);
  const refreshed=expect(await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',data:{refresh_token:oldSession.refresh_token}}),200,'Session refresh');
  assert.equal(refreshed.user.id,a.id);
  sessions.set(a.id,refreshed);
  assert.equal((await profile(a,a.id))[0].display_name,name);
  expect(await request('/auth/v1/user',{method:'PUT',token:tokenFor(a),data:{data:{role:null}}}),200,'Clear test metadata');
  restoreMetadata=false;
  await signOut(a);
  expect(await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',data:{refresh_token:refreshed.refresh_token}}),[400,401,403],'Logged-out refresh rejection');
  await signIn(a);
  assert.equal((await profile(a,a.id))[0].display_name,name);
  passed.push('Owner profile edit persists across refresh, sign-out and re-login');
  passed.push('Session refresh fails after sign-out');
} finally {
  try {
    if (restoreMetadata && sessions.has(a.id)) expect(await request('/auth/v1/user',{method:'PUT',token:tokenFor(a),data:{data:{role:null}}}),200,'Restore fixture metadata');
    if (restoreName && sessions.has(a.id)) expect(await rpc(a,'update_my_profile',{p_display_name:a.display_name}),200,'Restore fixture display name');
  } finally {
    for (const account of accounts) await signOut(account);
  }
}
for (const check of passed) console.log('PASS ' + check);

