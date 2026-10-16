// Run: node --test tests/marketplace-quote-comparison.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
require('../marketplace-quote-comparison-v1.js');
const q = globalThis.DBEST_QUOTE_COMPARISON;
test('category radii match existing marketplace rules', () => {
  assert.deepEqual({ ...q.categoryRadiusKm }, { grocery: 10, restaurant: 15, medicine: 15 });
});
test('compare sorts valid vendor quotations by calculated total', () => {
  const offers = [
    { id: 'a', vendor_id: 'v1', items: [{ name: 'Rice', qty: 2, price: 60 }], delivery_fee: 20 },
    { id: 'b', vendor_id: 'v2', items: [{ name: 'Rice', qty: 2, price: 55 }], delivery_fee: 15 }
  ];
  assert.deepEqual(q.compare(offers).map(x => x.id), ['b', 'a']);
  assert.equal(q.compare(offers)[0].totalPaise, 12500);
});
test('rejects invalid quantities and negative prices', () => {
  assert.throws(() => q.normalizeOffer({ id: 'a', vendor_id: 'v', items: [{ name: 'X', qty: 0, price: 1 }] }));
  assert.throws(() => q.normalizeOffer({ id: 'a', vendor_id: 'v', items: [{ name: 'X', qty: 1, price: -1 }] }));
});
test('filters expired offers', () => {
  assert.equal(q.compare([{ id: 'a', vendor_id: 'v', items: [{ name: 'X', qty: 1, price: 1 }], expires_at: '2020-01-01T00:00:00Z' }]).length, 0);
});
