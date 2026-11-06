import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rentalInstant, rentalLocalValue, parseSearchParams, parseRupees, toSearchParams } from '../lib/fleet/search.ts';

test('rental times use explicit IST and reject calendar overflow', () => {
  assert.equal(rentalInstant('2027-01-02T09:30'), '2027-01-02T04:00:00.000Z');
  assert.equal(rentalLocalValue('2027-01-02T04:00:00.000Z'), '2027-01-02T09:30');
  for (const bad of ['2027-02-29T10:00','2028-02-31T10:00','2027-13-01T10:00','2027-01-01T24:00','01/02/2027','2027-01-01T10:00Z']) assert.equal(rentalInstant(bad), null);
  assert.equal(rentalInstant('2028-02-29T10:00'), '2028-02-29T04:30:00.000Z');
});
test('search rejects partial, past, reversed and duplicate dates', () => {
  const now = Date.parse('2027-01-01T00:00:00Z');
  for (const fields of [{pickup:'2027-02-01T10:00'}, {dropoff:'2027-02-02T10:00'}, {pickup:'2026-01-01T10:00',dropoff:'2027-02-02T10:00'}, {pickup:'2027-02-02T10:00',dropoff:'2027-02-01T10:00'}, {pickup:['2027-02-01T10:00'],dropoff:'2027-02-02T10:00'}]) assert.ok(parseSearchParams(fields,now).error);
  assert.equal(parseSearchParams({},now).error,null);
  assert.equal(parseSearchParams({pickup:'2027-02-01T10:00',dropoff:'2027-02-02T10:00'},now).error,null);
});
test('ordinary daily-price filters remain exact minor-unit values', () => {
  assert.equal(parseRupees('50'),5000); assert.equal(parseRupees('50.01'),5001); assert.equal(parseRupees('0'),0);
  for(const bad of ['-1','1e3','50.001','1000001','NaN'])assert.equal(parseRupees(bad),null);
  assert.equal(parseSearchParams({max:'50'}).maxRateMinor,5000);
});
test('query links carry only scalar canonical fields', () => {
  assert.equal(toSearchParams({q:'a & b',page:2}).get('q'),'a & b');
  assert.equal(parseSearchParams({type:'forged'}).error,'Choose a valid vehicle type.');
  assert.ok(parseSearchParams({page:'1 OR 1=1'}).error);
});
