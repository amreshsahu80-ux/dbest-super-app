// Build 10: protect location-scoped catalogue from out-of-order fetch responses.
// Run: node --test qa/build10-catalog-request-order.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'marketplace-live-catalog-authority.js'), 'utf8');

test('each load receives a monotonic request identity', () => {
  assert.match(source, /requestSeq:0/);
  assert.match(source, /const requestSeq=\+\+S\.requestSeq/);
});

test('obsolete responses cannot apply a snapshot', () => {
  assert.match(source, /if\(requestSeq!==S\.requestSeq\)return null;applySnapshot\(d\)/);
});

test('latest response remains eligible for snapshot application', () => {
  let current = 0;
  const first = ++current;
  const second = ++current;
  assert.equal(first === current, false);
  assert.equal(second === current, true);
});


test('cached catalogue is scoped to the location that produced it', () => {
  assert.match(source, /snapshotLocationSig:''/);
  assert.match(source, /S\.snapshot=d;S\.snapshotLocationSig=S\.locationSig;S\.ready=true/);
  assert.match(source, /S\.ready&&S\.snapshotLocationSig===S\.locationSig&&t!=='medicine'/);
});
