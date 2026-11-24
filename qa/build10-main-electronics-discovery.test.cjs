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

test('Failed or malformed catalogue responses never clear existing Main App records',()=>{
  const start=source.indexOf('function applySnapshot(d,fromCache=false){');
  const end=source.indexOf('async function loadSnapshot(',start);
  assert.ok(start>=0&&end>start,'snapshot function available');
  for(const response of [null,{success:false,products:[],vendors:[]},{ok:false,products:[],vendors:[]},{error:'backend failure',products:[],vendors:[]},{products:[]},{vendors:[]}]){
    const commerceConfig={products:[{id:'existing-product',type:'electronics'}],vendors:[{id:'existing-vendor',type:'electronics'}]};
    const S={locationSig:'qa',location:null};
    const context={commerceConfig,S,LIVE_TYPES:types,liveProduct:p=>p,liveVendor:v=>v,window:{},Date};
    vm.runInNewContext(source.slice(start,end)+';globalThis.applySnapshot=applySnapshot;',context);
    assert.equal(context.applySnapshot(response),false);
    assert.equal(commerceConfig.products.length,1,'products preserved on invalid response');
    assert.equal(commerceConfig.vendors.length,1,'vendors preserved on invalid response');
    assert.equal(S.ready,undefined,'invalid response cannot mark catalogue ready');
  }
});

test('Malformed records and mapper failures preserve last known-good Electronics snapshot',()=>{
  const start=source.indexOf('function applySnapshot(d,fromCache=false){');
  const end=source.indexOf('async function loadSnapshot(',start);
  assert.ok(start>=0&&end>start);
  for(const mode of ['null-product','null-vendor','mapper-throws','mapper-null']){
    const commerceConfig={products:[{id:'existing-product',type:'electronics'}],vendors:[{id:'existing-vendor',type:'electronics'}]};
    const S={locationSig:'qa'};
    const context={commerceConfig,S,LIVE_TYPES:types,liveProduct:p=>{if(mode==='mapper-throws')throw Error('bad product');return mode==='mapper-null'?null:p;},liveVendor:v=>v,window:{},Date};
    vm.runInNewContext(source.slice(start,end)+';globalThis.applySnapshot=applySnapshot;',context);
    const response={products:[mode==='null-product'?null:{id:'new',type:'electronics'}],vendors:[mode==='null-vendor'?null:{id:'new-vendor',type:'electronics'}]};
    assert.equal(context.applySnapshot(response),false,mode);
    assert.equal(commerceConfig.products[0].id,'existing-product',mode);
    assert.equal(commerceConfig.vendors[0].id,'existing-vendor',mode);
    assert.equal(S.ready,undefined,mode);
  }
});

test('Rejected catalogue snapshots do not trigger successful refresh rendering',()=>{
  const start=source.indexOf('async function loadSnapshot(');
  const end=source.indexOf('function installStableSectionRenderer(',start);
  assert.ok(start>=0&&end>start,'loadSnapshot available');
  const load=source.slice(start,end);
  assert.match(load,/if\(!applySnapshot\(d\)\)return null;return d/,
    'failed snapshot validation must return null to callers');
  assert.match(source,/if\(d&&currentType\(\)===t&&marketOpen\(\)\)renderCurrentOnce\(\)/,
    'refresh caller must render only after a successful snapshot');
});

test('GPS and location refreshes never rerender after rejected catalogue responses',()=>{
  assert.doesNotMatch(source,/loadSnapshot\(true\)\.then\(\(\)=>renderCurrentOnce\(\)\)/);
  const guards=source.match(/loadSnapshot\(true\)\.then\(d=>\{if\(d\)renderCurrentOnce\(\)\}\)/g)||[];
  assert.equal(guards.length,2,'GPS control and location-change listener must guard rendering');
});

test('Failure while preparing existing vendor records cannot partially replace Electronics products',()=>{
  const start=source.indexOf('function applySnapshot(d,fromCache=false){');
  const end=source.indexOf('async function loadSnapshot(',start);
  assert.ok(start>=0&&end>start);
  const originalProduct={id:'existing-product',type:'electronics'};
  const originalVendor={id:'existing-vendor',get type(){throw Error('corrupt cached vendor');}};
  const commerceConfig={products:[originalProduct],vendors:[originalVendor]};
  const S={locationSig:'qa'};
  const context={commerceConfig,S,LIVE_TYPES:types,liveProduct:p=>p,liveVendor:v=>v,window:{},Date};
  vm.runInNewContext(source.slice(start,end)+';globalThis.applySnapshot=applySnapshot;',context);
  assert.equal(context.applySnapshot({products:[{id:'new-product',type:'electronics'}],vendors:[{id:'new-vendor',type:'electronics'}]}),false);
  assert.equal(commerceConfig.products[0],originalProduct,'products must retain original reference');
  assert.equal(commerceConfig.vendors[0],originalVendor,'vendors must retain original reference');
  assert.equal(S.ready,undefined,'failed replacement must not become ready');
});

test('Replaying cached Electronics snapshot does not postpone backend refresh TTL',()=>{
  const start=source.indexOf('function applySnapshot(d,fromCache=false){');
  const end=source.indexOf('async function loadSnapshot(',start);
  assert.ok(start>=0&&end>start,'cache-aware snapshot application exists');
  const commerceConfig={products:[],vendors:[]};
  const S={locationSig:'qa',lastLoadedAt:12345};
  const context={commerceConfig,S,LIVE_TYPES:types,liveProduct:p=>p,liveVendor:v=>v,window:{},Date,VERSION:'qa',BUILD:'10'};
  vm.runInNewContext(source.slice(start,end)+';globalThis.applySnapshot=applySnapshot;',context);
  const snapshot={products:[{id:'p',type:'electronics'}],vendors:[{id:'v',type:'electronics'}]};
  assert.equal(context.applySnapshot(snapshot,true),true);
  assert.equal(S.lastLoadedAt,12345,'cache replay must retain original fetch timestamp');
  assert.equal(context.applySnapshot(snapshot),true);
  assert.ok(S.lastLoadedAt>12345,'fresh backend snapshot must advance timestamp');
  assert.match(source,/applySnapshot\(S\.snapshot,true\)/,'marketplace reopen must identify cached replay');
});

test('Incomplete catalogue identities cannot erase known-good Electronics records',()=>{
  const start=source.indexOf('function applySnapshot(d,fromCache=false){');
  const end=source.indexOf('async function loadSnapshot(',start);
  assert.ok(start>=0&&end>start);
  for(const response of [
    {products:[{type:'electronics'}],vendors:[{id:'new-v',type:'electronics'}]},
    {products:[{id:'new-p',type:'electronics'}],vendors:[{type:'electronics'}]},
    {products:[{id:'new-p',type:'electronics'}],vendors:[{id:'new-v'}]},
    {products:[{id:' ',type:'electronics'}],vendors:[{id:'new-v',type:'electronics'}]}
  ]){
    const oldProduct={id:'existing-product',type:'electronics'};
    const oldVendor={id:'existing-vendor',type:'electronics'};
    const commerceConfig={products:[oldProduct],vendors:[oldVendor]};
    const S={locationSig:'qa'};
    const context={commerceConfig,S,LIVE_TYPES:types,liveProduct:p=>p,liveVendor:v=>v,window:{},Date,VERSION:'qa',BUILD:'10'};
    vm.runInNewContext(source.slice(start,end)+';globalThis.applySnapshot=applySnapshot;',context);
    assert.equal(context.applySnapshot(response),false);
    assert.equal(commerceConfig.products[0],oldProduct);
    assert.equal(commerceConfig.vendors[0],oldVendor);
    assert.equal(S.ready,undefined);
  }
});

test('Mapper-produced incomplete identities cannot replace known-good Electronics',()=>{
  const start=source.indexOf('function applySnapshot(d,fromCache=false){');
  const end=source.indexOf('async function loadSnapshot(',start);
  assert.ok(start>=0&&end>start);
  for(const mode of ['product-id','vendor-id','vendor-type']){
    const originalProduct={id:'existing-product',type:'electronics'};
    const originalVendor={id:'existing-vendor',type:'electronics'};
    const commerceConfig={products:[originalProduct],vendors:[originalVendor]};
    const S={locationSig:'qa'};
    const context={commerceConfig,S,LIVE_TYPES:types,
      liveProduct:p=>mode==='product-id'?{type:p.type}:p,
      liveVendor:v=>mode==='vendor-id'?{type:v.type}:mode==='vendor-type'?{id:v.id}:v,
      window:{},Date,VERSION:'qa',BUILD:'10'};
    vm.runInNewContext(source.slice(start,end)+';globalThis.applySnapshot=applySnapshot;',context);
    assert.equal(context.applySnapshot({products:[{id:'p',type:'electronics'}],vendors:[{id:'v',type:'electronics'}]}),false,mode);
    assert.equal(commerceConfig.products[0],originalProduct,mode);
    assert.equal(commerceConfig.vendors[0],originalVendor,mode);
    assert.equal(S.ready,undefined,mode);
  }
});

test('Duplicate snapshot identities cannot replace known-good Electronics',()=>{
  const start=source.indexOf('function applySnapshot(d,fromCache=false){');
  const end=source.indexOf('async function loadSnapshot(',start);
  assert.ok(start>=0&&end>start);
  for(const response of [
    {products:[{id:'dup',type:'electronics'},{id:'dup',type:'electronics'}],vendors:[{id:'v',type:'electronics'}]},
    {products:[{id:'p',type:'electronics'}],vendors:[{id:'dup',type:'electronics'},{id:'dup',type:'electronics'}]}
  ]){
    const oldProduct={id:'existing-product',type:'electronics'};
    const oldVendor={id:'existing-vendor',type:'electronics'};
    const commerceConfig={products:[oldProduct],vendors:[oldVendor]};
    const S={locationSig:'qa'};
    const context={commerceConfig,S,LIVE_TYPES:types,liveProduct:p=>p,liveVendor:v=>v,window:{},Date,VERSION:'qa',BUILD:'10'};
    vm.runInNewContext(source.slice(start,end)+';globalThis.applySnapshot=applySnapshot;',context);
    assert.equal(context.applySnapshot(response),false);
    assert.equal(commerceConfig.products[0],oldProduct);
    assert.equal(commerceConfig.vendors[0],oldVendor);
    assert.equal(S.ready,undefined);
  }
});


test('Noncanonical mapped category slugs cannot silently remove Electronics inventory',()=>{
  const start=source.indexOf('function applySnapshot(d,fromCache=false){');
  const end=source.indexOf('async function loadSnapshot(',start);
  assert.ok(start>=0&&end>start);
  for(const badType of ['Electronics',' electronics ','ELECTRONICS']){
    const oldProduct={id:'old-product',type:'electronics'};
    const oldVendor={id:'old-vendor',type:'electronics'};
    const commerceConfig={products:[oldProduct],vendors:[oldVendor]};
    const S={locationSig:'qa'};
    const context={commerceConfig,S,LIVE_TYPES:types,liveProduct:p=>p,liveVendor:v=>v,window:{},Date,VERSION:'qa',BUILD:'10'};
    vm.runInNewContext(source.slice(start,end)+';globalThis.applySnapshot=applySnapshot;',context);
    assert.equal(context.applySnapshot({products:[{id:'p',type:badType}],vendors:[{id:'v',type:badType}]}),false,badType);
    assert.equal(commerceConfig.products[0],oldProduct,badType);
    assert.equal(commerceConfig.vendors[0],oldVendor,badType);
    assert.equal(S.ready,undefined,badType);
  }
});
