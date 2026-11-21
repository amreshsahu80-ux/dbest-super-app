'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('hotel-public-guest.html','utf8'),r=fs.readFileSync('hotel-review/reconciliation-20261031-summary.json','utf8'),audit=JSON.parse(r);
const m=/const STATIC_HOTELS=(\[[^\n]*\]);/.exec(src);if(!m)throw Error('catalogue not found');const catalog=JSON.parse(m[1]);
test('all 41 uniquely identified tariff replies through 31 Oct staged without fabricated prices',()=>{
 assert.equal(audit.stagedCount,41);
 assert.equal(audit.previewPropertiesBefore,258);
 assert.equal(audit.previewPropertiesAfter,299);
 assert.equal(catalog.length,299);
 assert.equal(new Set(catalog.map(x=>x.id)).size,299);
 const added=catalog.filter(x=>x.tariffStatus==='RECEIVED_PENDING_VALIDATION');
 assert.equal(added.length,41);
 assert.ok(added.every(x=>x.contractedSellingReference===null&&x.rateCount>0&&x.roomTypes.length>0));
 for(const item of audit.stagedProperties){
  const match=added.find(x=>x.id===item.id);
  assert.ok(match,'missing staged hotel: '+item.name);
  assert.equal(match.name,item.name);
  assert.equal(match.city,item.city);
 }
});
test('ambiguous guest hotel rate identity mappings do not leak into new catalogue',()=>{
 assert.equal(audit.heldForIdentityReview.length,25);
 const statuses=audit.sourceGroupCounts;
 assert.equal(statuses.PRESENT,249);
 assert.equal(statuses.SAFE_NEW,41);
 assert.equal(statuses.MISSING_ID,19);
 assert.equal(statuses.DUPLICATED_MASTER_ID,4);
 assert.equal(statuses.IDENTITY_MISMATCH_IN_PREVIEW,2);
 for(const x of audit.heldForIdentityReview)if(x.id&&x.reason==='DUPLICATED_MASTER_ID')assert.ok(!catalog.some(h=>h.id===x.id&&h.tariffStatus==='RECEIVED_PENDING_VALIDATION'));
});
test('unverified selling rates remain visible as pending and never enabled for real checkout',()=>{
 assert.match(src,/DBest tariff received/);
 assert.match(src,/Stay-specific price pending validation/);
 assert.match(src,/No booking submitted/);
 assert.match(src,/No payment collected/);
 assert.match(src,/TEST PREVIEW/);
 new vm.Script([...src.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1]);
});
