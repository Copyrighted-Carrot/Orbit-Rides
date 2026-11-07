import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readConsistentBookings } from '../lib/booking/read-consistency.ts';

const held = { id: 'booking-a', state: 'held', updated_at: '2026-11-07T00:00:00.000001Z' };
const paid = { ...held, state: 'awaiting_confirmation', updated_at: '2026-11-07T00:00:00.000002Z' };

test('approval between booking and payment reads discards the mixed result', async () => {
  let reads = 0;
  const value = await readConsistentBookings(async () => {
    reads++;
    return { bookings: [reads === 1 ? held : paid], value: { booking: reads === 1 ? 'held' : 'awaiting_confirmation', payment: 'succeeded' } };
  }, async ids => { assert.deepEqual(ids, ['booking-a']); return [paid]; });
  assert.equal(reads, 2);
  assert.deepEqual(value, { booking: 'awaiting_confirmation', payment: 'succeeded' });
});

test('exact database timestamps and state both participate in version checks', async () => {
  let reads = 0;
  const laterVersion = { ...held, updated_at: paid.updated_at };
  const value = await readConsistentBookings(async () => ({ value: ++reads, bookings: [reads === 1 ? held : laterVersion] }), async () => [laterVersion]);
  assert.equal(value, 2);
  let fixedClockReads = 0;
  const changed = { ...held, state: 'confirmed' };
  await readConsistentBookings(async () => ({ value: null, bookings: [++fixedClockReads === 1 ? held : changed] }), async () => [changed]);
  assert.equal(fixedClockReads, 2);
});

test('continuous changes and lost access fail closed after bounded retries', async () => {
  let reads = 0;
  await assert.rejects(readConsistentBookings(async () => { reads++; return { value: 'stale', bookings: [held] }; }, async () => []), /changed while loading/);
  assert.equal(reads, 3);
});

test('query failures propagate instead of appearing as empty or successful records', async () => {
  await assert.rejects(readConsistentBookings(async () => ({ value: 'held', bookings: [held] }), async () => { throw new Error('Query failed'); }), /Query failed/);
  assert.deepEqual(await readConsistentBookings(async () => ({ value: [], bookings: [] }), async () => { throw new Error('Unneeded query'); }), []);
});
