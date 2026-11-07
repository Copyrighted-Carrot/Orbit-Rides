import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

// Run only against the approved disposable staging project. Supply the same
// protected stdin fixture as checkout-api.mjs; never put credentials in arguments.
// This leaves auditable synthetic bookings on a dedicated unpublished vehicle.
// Expiry/clock-boundary tests belong to the transactional SQL regression suite.
const input = JSON.parse(readFileSync(0, 'utf8').replace(/^\uFEFF/, ''));
assert.equal(input.project, 'eqxajqvaatjcbtxhwksv');
assert.equal(input.accounts.length, 3);
assert(input.accounts.every(account => account.email.endsWith('@orbit-demo.example.invalid')));
const customers = input.accounts.filter(account => account.role === 'customer');
const staff = input.accounts.find(account => account.role === 'admin');
assert.equal(customers.length, 2);
assert(staff && input.accounts.filter(account => account.role === 'admin').length === 1);
const [a, b] = customers;
const base = 'https://' + input.project + '.supabase.co';
const tokens = new Map();
const evidence = [];
let vehicleId;
let step = 'authenticate synthetic fixture accounts';

async function http(actor, path, method = 'GET', data) {
  const headers = { apikey: input.key, 'Content-Type': 'application/json' };
  if (tokens.has(actor)) headers.Authorization = 'Bearer ' + tokens.get(actor);
  const response = await fetch(base + path, {
    method, headers, body: data === undefined ? undefined : JSON.stringify(data),
    redirect: 'error', signal: AbortSignal.timeout(20000),
  });
  const body = await response.text();
  return { ok: response.ok, status: response.status, value: body ? JSON.parse(body) : null };
}

function ok(result, label) {
  assert(result.ok, `${label}: HTTP ${result.status}, code ${result.value?.code || 'none'}`);
  return result.value;
}

function denied(result, label) {
  assert(!result.ok && result.status >= 400 && result.status < 500, label);
}

const rpc = (actor, name, args) => http(actor, '/rest/v1/rpc/' + name, 'POST', args);
const read = (actor, query) => http(actor, '/rest/v1/' + query).then(result => ok(result, 'Read ' + query.split('?')[0]));
const call = async (actor, name, args) => ok(await rpc(actor, name, args), name);
const rowsFor = (actor, table, column, id, order = '') => read(actor, `${table}?${column}=eq.${id}${order ? '&order=' + order : ''}`);
const instant = days => new Date(Date.now() + days * 86400000).toISOString();

async function one(actor, table, column, id) {
  const rows = await rowsFor(actor, table, column, id);
  assert.equal(rows.length, 1, 'Exactly one ' + table + ' row');
  return rows[0];
}

async function notices(actor, events) {
  if (!events.length) return [];
  return read(actor, 'notifications?event_id=in.(' + events.map(event => event.id).join(',') + ')&order=event_id');
}

async function graph(actor, bookingId) {
  const booking = await one(actor, 'bookings', 'id', bookingId);
  const quote = await one(actor, 'quotes', 'id', booking.quote_id);
  const session = await one(actor, 'payment_sessions', 'booking_id', bookingId);
  const paymentEvents = await rowsFor(actor, 'payment_events', 'session_id', session.id, 'occurred_at,id');
  const events = await rowsFor(actor, 'booking_events', 'booking_id', bookingId, 'id');
  return { booking, quote, session, paymentEvents, events, notifications: await notices(actor, events) };
}

async function available(interval) {
  return (await call(null, 'available_vehicles', interval)).some(vehicle => vehicle.vehicle_id === vehicleId);
}

function checkEvents(events, expected, owner) {
  assert.deepEqual(events.map(event => event.event_type), expected);
  for (const event of events) {
    assert.equal(event.actor_id, owner.id);
    assert.equal(event.actor_kind, 'customer');
    assert(Number.isFinite(Date.parse(event.occurred_at)));
    assert(typeof event.reason === 'string' && event.reason.trim());
  }
}

try {
  for (const account of input.accounts) {
    const session = ok(await http(null, '/auth/v1/token?grant_type=password', 'POST', {
      email: account.email, password: account.password,
    }), 'Synthetic sign in');
    assert.equal(session.user.id, account.id);
    tokens.set(account, session.access_token);
    assert.equal((await one(account, 'user_roles', 'user_id', account.id)).role, account.role);
  }

  step = 'create dedicated catalogue fixture';
  const pickupRows = await read(a, 'pickup_location?select=name,city,address&singleton=eq.true');
  assert.equal(pickupRows.length, 1, 'Configure the virtual demo pickup before running checkout');
  const [type] = await read(staff, 'vehicle_types?select=id&order=id&limit=1');
  assert(type);
  const catalogue = {
    p_vehicle_type_id: type.id, p_manufacturer: 'Checkout', p_model: 'Contract fixture', p_daily_rate_minor: 12345,
  };
  vehicleId = await call(staff, 'create_vehicle', {
    ...catalogue, p_fleet_code: 'CHK-' + randomUUID().replaceAll('-', '').slice(0, 20).toUpperCase(),
  });
  await call(staff, 'set_vehicle_publication', { p_vehicle_id: vehicleId, p_published: true });
  const startsAt = instant(75);
  const endsAt = new Date(Date.parse(startsAt) + 25 * 3600000).toISOString();
  const interval = { p_starts_at: startsAt, p_ends_at: endsAt };
  const quoteArgs = { p_vehicle_id: vehicleId, ...interval, p_request_id: randomUUID() };
  const [summaryBefore] = await call(a, 'my_rental_summary', {});

  step = 'reject forged quote inputs and direct writes';
  for (const extra of [{ p_amount_minor: 1 }, { p_currency: 'USD' }, { p_booking_status: 'confirmed' }]) {
    denied(await rpc(a, 'create_quote', { ...quoteArgs, ...extra }), 'Unexpected authoritative quote input was accepted');
  }
  denied(await rpc(a, 'create_quote', { ...quoteArgs, p_vehicle_id: randomUUID() }), 'Unknown vehicle accepted');
  denied(await rpc(a, 'create_quote', { ...quoteArgs, p_ends_at: startsAt }), 'Empty interval accepted');
  denied(await rpc(a, 'create_quote', { ...quoteArgs, p_ends_at: instant(74) }), 'Reversed interval accepted');
  denied(await rpc(a, 'create_quote', { ...quoteArgs, p_starts_at: instant(-1) }), 'Past pickup accepted');
  denied(await http(a, '/rest/v1/vehicles?id=eq.' + vehicleId, 'PATCH', { daily_rate_minor: 1 }), 'Customer changed rate');
  const quoteId = await call(a, 'create_quote', quoteArgs);
  // Deliberately discard a successful response before repeating the same request.
  await rpc(a, 'create_quote', quoteArgs);
  assert.equal(await call(a, 'create_quote', quoteArgs), quoteId, 'Lost-response quote retry changed identity');
  denied(await rpc(a, 'create_quote', { ...quoteArgs, p_ends_at: instant(78) }), 'Request ID accepted different interval');
  const quote = await one(a, 'quotes', 'id', quoteId);
  assert.equal(quote.customer_id, a.id);
  assert.equal(quote.vehicle_id, vehicleId);
  assert.equal(quote.rate_minor, catalogue.p_daily_rate_minor);
  assert.equal(quote.billable_days, 2);
  assert.equal(quote.total_minor, 24690);
  assert.equal(quote.currency, 'INR');
  assert.equal(quote.hold_seconds, 600, 'Expected configured ten-minute hold snapshot');
  assert.deepEqual(quote.pickup_location_snapshot, pickupRows[0]);
  assert(Date.parse(quote.expires_at) > Date.parse(quote.created_at));
  assert(Date.parse(quote.expires_at) <= Date.parse(quote.starts_at));
  denied(await http(a, '/rest/v1/quotes?id=eq.' + quoteId, 'PATCH', { rate_minor: 1 }), 'Customer changed quote snapshot');
  await call(staff, 'update_vehicle_catalogue', { ...catalogue, p_vehicle_id: vehicleId, p_daily_rate_minor: 50000 });
  assert.deepEqual(await one(a, 'quotes', 'id', quoteId), quote, 'Catalogue edit rewrote quote snapshot');
  assert.deepEqual(await rowsFor(b, 'quotes', 'id', quoteId), []);
  denied(await rpc(b, 'start_checkout', { p_quote_id: quoteId }), 'Wrong owner started checkout');
  console.log('PASS server-owned quote, immutable snapshot, invalid/forged input and lost-response quote retry');

  step = 'start durable idempotent hold';
  const checkoutArgs = { p_quote_id: quoteId };
  denied(await rpc(a, 'start_checkout', { ...checkoutArgs, p_amount_minor: 1 }), 'Checkout accepted an authored amount');
  const bookingId = await call(a, 'start_checkout', checkoutArgs);
  await rpc(a, 'start_checkout', checkoutArgs);
  const repeatedHolds = await Promise.all([call(a, 'start_checkout', checkoutArgs), call(a, 'start_checkout', checkoutArgs)]);
  assert(repeatedHolds.every(id => id === bookingId));
  assert.equal((await rowsFor(staff, 'bookings', 'quote_id', quoteId)).length, 1);
  let state = await graph(a, bookingId);
  const sessionId = state.session.id;
  const sessionArgs = { p_session_id: sessionId };
  assert.equal(state.booking.state, 'held');
  assert.equal(state.booking.customer_id, a.id);
  assert.equal(state.booking.quote_id, quoteId);
  assert.equal(state.booking.vehicle_id, vehicleId);
  assert(state.booking.reference.startsWith('ORB-'));
  assert.equal(state.session.booking_id, bookingId);
  assert.equal(state.session.provider, 'demo');
  assert.equal(state.session.state, 'pending');
  assert.equal(state.session.amount_minor, quote.total_minor);
  assert.equal(state.session.currency, quote.currency);
  assert(Math.abs(Date.parse(state.booking.hold_expires_at) - Date.parse(state.booking.created_at) - quote.hold_seconds * 1000) <= 1);
  checkEvents(state.events, ['hold_created', 'payment_pending'], a);
  assert.deepEqual(state.paymentEvents.map(event => event.event_type), ['pending']);
  assert.equal(state.notifications.length, 0);
  assert.equal(await available(interval), false);
  assert.equal(await available({ p_starts_at: instant(1), p_ends_at: instant(2) }), true);
  const [allocation] = await rowsFor(staff, 'vehicle_allocations', 'booking_id', bookingId);
  assert(allocation && allocation.released_at === null);

  step = 'QR-equivalent reads and refresh are read-only';
  for (let count = 0; count < 3; count++) {
    await one(a, 'payment_sessions', 'id', sessionId);
    assert.deepEqual(await read(a, 'rpc/booking_receipt?p_booking_id=' + bookingId), []);
  }
  assert.deepEqual(await graph(a, bookingId), state, 'Session/receipt reads mutated the booking graph');
  assert.equal(await call(a, 'finalize_booking', sessionArgs), null, 'Unpaid hold finalized');
  assert.deepEqual(await graph(a, bookingId), state);
  denied(await rpc(b, 'approve_demo_payment', sessionArgs), 'Wrong owner approved payment');
  denied(await rpc(b, 'finalize_booking', sessionArgs), 'Wrong owner finalized booking');
  denied(await rpc(staff, 'approve_demo_payment', sessionArgs), 'Admin approved customer payment');
  denied(await rpc(staff, 'finalize_booking', sessionArgs), 'Admin finalized customer checkout');
  denied(await rpc(a, 'approve_demo_payment', { ...sessionArgs, p_amount_minor: 1 }), 'Approval accepted authored amount');
  denied(await rpc(a, 'approve_demo_payment', { p_session_id: randomUUID() }), 'Forged session accepted');
  denied(await http(a, '/rest/v1/payment_sessions?id=eq.' + sessionId, 'PATCH', { state: 'succeeded' }), 'Direct payment mutation accepted');
  denied(await http(staff, '/rest/v1/payment_sessions?id=eq.' + sessionId, 'PATCH', { state: 'succeeded' }), 'Admin direct payment mutation accepted');
  denied(await http(a, '/rest/v1/bookings?id=eq.' + bookingId, 'PATCH', { state: 'confirmed', vehicle_id: randomUUID() }), 'Direct booking mutation accepted');
  assert.equal((await rowsFor(b, 'payment_sessions', 'id', sessionId)).length, 0);
  console.log('PASS one durable hold/session, interval eligibility, read-only session refresh and owner/payment authority boundaries');

  step = 'explicit demo approval is durable and deduplicated';
  await rpc(a, 'approve_demo_payment', sessionArgs); // response intentionally discarded
  const approvals = await Promise.all([call(a, 'approve_demo_payment', sessionArgs), call(a, 'approve_demo_payment', sessionArgs)]);
  assert(approvals.every(result => result === 'succeeded'));
  state = await graph(a, bookingId);
  assert.equal(state.booking.state, 'awaiting_confirmation');
  assert.equal(state.session.state, 'succeeded');
  assert.equal(state.paymentEvents.filter(event => event.event_type === 'succeeded').length, 1);
  const paid = state.paymentEvents.find(event => event.event_type === 'succeeded');
  assert.equal(paid.actor_id, a.id);
  assert.equal(paid.amount_minor, quote.total_minor);
  assert.equal(paid.currency, quote.currency);
  assert.equal(paid.provider, 'demo');
  assert(Date.parse(paid.occurred_at) < Date.parse(state.booking.hold_expires_at));
  checkEvents(state.events, ['hold_created', 'payment_pending', 'payment_succeeded'], a);
  assert.equal(state.notifications.length, 1);
  assert.equal(state.notifications[0].event_id, state.events.at(-1).id);
  assert.equal(await available(interval), false);

  step = 'finalize in place and preserve the result after lost responses';
  await rpc(a, 'finalize_booking', sessionArgs); // response intentionally discarded
  const finalizations = await Promise.all([call(a, 'finalize_booking', sessionArgs), call(a, 'finalize_booking', sessionArgs)]);
  assert(finalizations.every(id => id === bookingId));
  state = await graph(a, bookingId);
  assert.equal(state.booking.state, 'confirmed');
  checkEvents(state.events, ['hold_created', 'payment_pending', 'payment_succeeded', 'confirmed'], a);
  assert.equal(state.paymentEvents.filter(event => event.event_type === 'succeeded').length, 1);
  assert.equal(state.notifications.length, 2);
  assert.deepEqual(state.notifications.map(notice => notice.event_id), state.events.slice(-2).map(event => event.id));
  assert(state.notifications.every(notice => notice.customer_id === a.id && notice.read_at === null));
  assert.equal((await rowsFor(staff, 'vehicle_allocations', 'booking_id', bookingId))[0].id, allocation.id);
  assert.equal(await available(interval), false);
  const [receipt] = await call(a, 'booking_receipt', { p_booking_id: bookingId });
  assert.equal(receipt.booking_id, bookingId);
  assert.equal(receipt.booking_reference, state.booking.reference);
  assert.equal(receipt.total_minor, quote.total_minor);
  assert.equal(receipt.vehicle_label, quote.vehicle_label);
  assert.equal(receipt.customer_name, quote.customer_name);
  assert.equal(receipt.currency, quote.currency);
  assert.equal(receipt.payment_state, 'succeeded');
  assert.equal(receipt.provider, 'demo');
  assert(receipt.confirmed_at);
  for (let count = 0; count < 3; count++) {
    assert.deepEqual(await read(a, 'rpc/booking_receipt?p_booking_id=' + bookingId), [receipt]);
  }
  assert.deepEqual(await graph(a, bookingId), state, 'Receipt reload mutated persisted state');
  assert.deepEqual(await call(staff, 'booking_receipt', { p_booking_id: bookingId }), [receipt]);
  assert.deepEqual(await call(b, 'booking_receipt', { p_booking_id: bookingId }), []);
  assert.deepEqual(await rowsFor(staff, 'booking_events', 'booking_id', bookingId, 'id'), state.events);
  assert.equal((await one(staff, 'bookings', 'id', bookingId)).reference, state.booking.reference);
  for (const table of ['bookings', 'booking_events']) {
    assert.deepEqual(await rowsFor(b, table, table === 'bookings' ? 'id' : 'booking_id', bookingId), []);
  }
  assert.deepEqual(await rowsFor(b, 'payment_events', 'session_id', sessionId), []);
  assert.deepEqual(await notices(b, state.events), []);
  const [summaryAfter] = await call(a, 'my_rental_summary', {});
  assert.equal(Number(summaryAfter.confirmed_rentals), Number(summaryBefore.confirmed_rentals) + 1);
  assert.equal(Number(summaryAfter.completed_rentals), Number(summaryBefore.completed_rentals));
  assert.equal(Number(summaryAfter.completed_demo_rental_value_minor), Number(summaryBefore.completed_demo_rental_value_minor));
  evidence.push({ bookingId, reference: state.booking.reference, sessionId, bookingEvents: 4, succeededPaymentEvents: 1, notifications: 2 });
  console.log('PASS approval/finalization retries, one booking/reference, canonical events, receipt/history/admin agreement and unchanged completed-demo totals');

  step = 'notification read state persists and remains owner scoped';
  const notificationId = state.notifications.at(-1).event_id;
  await call(b, 'mark_notification_read', { p_event_id: notificationId });
  assert.equal((await notices(a, state.events)).find(notice => notice.event_id === notificationId).read_at, null);
  await call(a, 'mark_notification_read', { p_event_id: notificationId });
  const marked = (await notices(a, state.events)).find(notice => notice.event_id === notificationId);
  assert(marked.read_at);
  await call(a, 'mark_notification_read', { p_event_id: notificationId });
  assert.deepEqual((await notices(a, state.events)).find(notice => notice.event_id === notificationId), marked);
  assert.equal((await graph(a, bookingId)).booking.state, 'confirmed');
  console.log('PASS notification projections and persistent owner-scoped idempotent read state');

  step = 'competing customers can create at most one overlapping hold';
  const raceStart = instant(80), raceEnd = new Date(Date.parse(raceStart) + 86400000).toISOString();
  const raceInterval = { p_starts_at: raceStart, p_ends_at: raceEnd };
  const raceQuotes = await Promise.all(customers.map(actor => call(actor, 'create_quote', {
    p_vehicle_id: vehicleId, ...raceInterval, p_request_id: randomUUID(),
  })));
  const race = await Promise.all(customers.map((actor, index) => rpc(actor, 'start_checkout', { p_quote_id: raceQuotes[index] })));
  assert.equal(race.filter(result => result.ok).length, 1);
  assert.equal(race.find(result => !result.ok).value.code, '23P01');
  const winner = race.findIndex(result => result.ok);
  const raceBookingId = race[winner].value, raceOwner = customers[winner];
  assert.equal(await call(raceOwner, 'start_checkout', { p_quote_id: raceQuotes[winner] }), raceBookingId);
  const allocations = await read(staff, 'vehicle_allocations?vehicle_id=eq.' + vehicleId + '&released_at=is.null');
  assert.equal(allocations.length, 2, 'Expected normal confirmed allocation and exactly one race allocation');
  assert.equal(await available(raceInterval), false);
  const raceSession = await one(raceOwner, 'payment_sessions', 'booking_id', raceBookingId);
  await call(raceOwner, 'approve_demo_payment', { p_session_id: raceSession.id });
  assert.equal(await call(raceOwner, 'finalize_booking', { p_session_id: raceSession.id }), raceBookingId);
  const raceState = await graph(raceOwner, raceBookingId);
  assert.equal(raceState.booking.state, 'confirmed');
  assert.equal(raceState.paymentEvents.filter(event => event.event_type === 'succeeded').length, 1);
  checkEvents(raceState.events, ['hold_created', 'payment_pending', 'payment_succeeded', 'confirmed'], raceOwner);
  assert.equal(raceState.notifications.length, 2);
  assert.deepEqual(await call(staff, 'booking_receipt', { p_booking_id: raceBookingId }), await call(raceOwner, 'booking_receipt', { p_booking_id: raceBookingId }));
  evidence.push({ bookingId: raceBookingId, reference: raceState.booking.reference, sessionId: raceSession.id, winningHolds: 1, competingRequests: 2 });
  console.log('PASS real concurrent reservation race: one hold, one allocation, one confirmed booking and consistent projections');
} catch (error) {
  // Do not print request/response bodies, JWTs, passwords or Auth session objects.
  console.error(`FAIL ${step} (${error.name})`);
  if (vehicleId) console.error('Retained synthetic fixture vehicle: ' + vehicleId);
  process.exitCode = 1;
} finally {
  if (vehicleId && tokens.has(staff)) {
    try {
      ok(await rpc(staff, 'set_vehicle_publication', { p_vehicle_id: vehicleId, p_published: false }), 'Hide synthetic fixture');
      if (evidence.length === 2) {
        assert.equal((await call(a, 'booking_receipt', { p_booking_id: evidence[0].bookingId }))[0].booking_reference, evidence[0].reference);
      }
      console.log('Synthetic fixture unpublished; booking/event history retained.');
    } catch {
      console.error('Fixture publication cleanup failed; review vehicle ' + vehicleId);
      process.exitCode = 1;
    }
  }
  for (const actor of tokens.keys()) {
    try { ok(await http(actor, '/auth/v1/logout?scope=local', 'POST'), 'End fixture session'); }
    catch { console.error('Synthetic fixture session logout failed.'); process.exitCode = 1; }
  }
}

if (!process.exitCode) {
  console.log(JSON.stringify({ result: 'passed', vehicleId, evidence, expiryCoverage: 'Run transactional SQL expiry regression separately; this HTTP suite does not advance server time.' }));
}
