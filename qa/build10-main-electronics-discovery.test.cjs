'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'marketplace-live-catalog-authority.js'), 'utf8');
const match = source.match(/const LIVE_TYPES=(\[[^;]+\]);/);
assert.ok(match, 'Main App live-catalog type allowlist must exist');
const types = vm.runInNewContext(match[1]);

test('Main App snapshot retains Electronics vendor and product records', () => {
  assert.ok(types.includes('electronics'), 'Electronics must be in live type allowlist');
  const existing = [{type:'restaurant',id:'old'}, {type:'electronics',id:'stale'}];
  const refreshed = existing.filter(p => !types.includes(p.type));
  const incoming = [{market_type:'electronics',vendor_id:'VND8597199',id:'sku-1'}];
  const result = refreshed.concat(incoming.map(p=>({...p,type:p.market_type})).filter(p=>types.includes(p.type)));
  assert.equal(result.filter(p=>p.type==='electronics').length,1);
  assert.equal(result.find(p=>p.type==='electronics').vendor_id,'VND8597199');
});

test('Existing restaurant grocery and digital categories remain enabled',()=>{
  for(const type of ['restaurant','grocery','digital'])assert.ok(types.includes(type),type);
});
