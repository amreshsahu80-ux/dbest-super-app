'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const bridge=require('../hotel-review/outreach-catalog-bridge.cjs');
const hotelsHeader=['Hotel ID','Hotel Name','City','State / UT','Outreach Status'];
const hotelRows=[
 ['H-1','Test Contracted Hotel','Jaipur','Rajasthan','Rates Received — B2B Tariff'],
 ['H-2','No Rate Hotel','Delhi','Delhi','Sent']
];
const ratesHeader=['Rate ID','Hotel ID','Hotel Name','Room Category','Rate INR','Occupancy','Taxes','Meal Plan','Validity','Cancellation','Email Message ID','Confidence / Review Status'];
const rateRows=[
 ['R-1','H-1','Test Contracted Hotel','Deluxe','4,725','Double','Applicable taxes not specified','CP Breakfast','Dates pending','72 hours','email-id','Quoted'],
 ['R-2','H-1','Test Contracted Hotel','Executive','4500','Double','GST included','Room only','November','Non refundable','email-id2','Quoted']
];
test('connected outreach snapshot auto-accepts genuine quoted rows but never bookable',()=>{
 const snapshot=bridge.build(hotelsHeader,hotelRows,ratesHeader,rateRows);
 assert.equal(snapshot.stats.totalRates,2);assert.equal(snapshot.stats.hotelsWithRates,1);
 assert.ok(snapshot.rates.every(r=>r.commercialApproval==='AUTO_ACCEPTED_DBEST'&&r.bookable===false));
 assert.equal(snapshot.rates[0].amount,4725);
 assert.equal(snapshot.rates[0].taxIncludedConfirmed,false);
 assert.equal(snapshot.rates[1].taxIncludedConfirmed,true);
});
test('guest snapshot excludes B2B amounts, source email IDs and internal review flags',()=>{
 const s=bridge.build(hotelsHeader,hotelRows,ratesHeader,rateRows);
 const publicData=bridge.guestView(s);
 assert.equal(publicData.hotels[0].hotel,'Test Contracted Hotel');
 assert.equal(publicData.hotels[0].rateCount,2);
 const serialized=JSON.stringify(publicData);
 for(const forbidden of ['4725','4500','email-id','sourceRef','commercialApproval','GST included'])
 assert.equal(serialized.includes(forbidden),false,'Leaked '+forbidden);
 assert.equal(publicData.stats.publicBookable,0);
});
test('snapshot rejects non-matching source schemas and duplicated rate identities',()=>{
 assert.throws(()=>bridge.build(['bad'],[],ratesHeader,rateRows),/Hotel Master/);
 assert.throws(()=>bridge.build(hotelsHeader,hotelRows,['bad'],rateRows),/Rate History/);
 assert.equal(bridge.build(hotelsHeader,hotelRows,ratesHeader,[...rateRows,rateRows[0]]).rates.length,2);
});
test('catalogue endpoint remains a template in GitHub, not a public source file',()=>{
 const source=fs.readFileSync('hotel-review/hotel-catalog-api.template.cjs','utf8');
 assert.match(source,/const DATA=__PRIVATE_SNAPSHOT__/);
 assert.match(source,/owner_session_required/);
 assert.match(source,/auth\._test\.validateOwner/);
 assert.doesNotMatch(source,/get_dbest_secret|service_role|gmail\.com/);
 assert.match(source,/liveOTAConnected:false/);
 const page=fs.readFileSync('hotel-simple-flow.html','utf8');
 assert.match(page,/fetch\('\/api\/hotel-catalog'/);
 assert.match(page,/connect-src 'self'/);
 const inline=[...page.matchAll(/<script>\s*([\s\S]+?)<\/script>/g)];
 inline.forEach(m=>new vm.Script(m[1]));
});

test('authenticated Owner workbench loads only the private catalog and never exposes supplier records on guest page',()=>{
 const owner=fs.readFileSync('hotel-owner-rate-review.html','utf8');
 assert.match(owner,/dbest:owner-authenticated/);
 assert.match(owner,/loadOwnerCatalogue/);
 assert.match(owner,/\/api\/hotel-catalog\?view=owner&offset=/);
 assert.match(owner,/credentials:'same-origin'/);
 assert.match(owner,/commercialApproval==='AUTO_ACCEPTED_DBEST'/);
 const scripts=[...owner.matchAll(/<script>\s*([\s\S]+?)<\/script>/g)];
 scripts.forEach(m=>new vm.Script(m[1]));
 const guest=fs.readFileSync('hotel-simple-flow.html','utf8');
 assert.match(guest,/fetch\('\/api\/hotel-catalog'/);
 assert.doesNotMatch(guest,/view=owner/);
});

test('deployed private snapshot API returns only public hotel metadata to guests',async()=>{
 const sample=bridge.build(hotelsHeader,hotelRows,ratesHeader,rateRows);
 sample.snapshotGeneratedAt='2026-10-30T00:00:00.000Z';
 const source=fs.readFileSync('hotel-review/hotel-catalog-api.template.cjs','utf8')
  .replace('const DATA=__PRIVATE_SNAPSHOT__;', 'const DATA='+JSON.stringify(sample)+';');
 const moduleStub={exports:{}};
 const auth={_test:{cookieToken:()=>'',validateOwner:async()=>false}};
 vm.runInNewContext(source,{module:moduleStub,require:()=>auth,URL,process:{env:{}},console});
 const handler=moduleStub.exports;
 function reply(){
  const headers={};
  return {res:{statusCode:200,setHeader(k,v){headers[k.toLowerCase()]=v;},end(txt){this.body=JSON.parse(txt)}},headers};
 }
 let call=reply();
 await handler({method:'GET',url:'/api/hotel-catalog',headers:{host:'dbest-hotel-review-preview.vercel.app'}},call.res);
 assert.equal(call.res.statusCode,200);
 assert.equal(call.res.body.hotels.length,1);
 assert.equal(call.res.body.snapshotGeneratedAt,sample.snapshotGeneratedAt);
 const payload=JSON.stringify(call.res.body);
 for(const forbidden of ['4725','4500','email-id','sourceRef','commercialApproval'])
  assert.equal(payload.includes(forbidden),false,'Guest price disclosure: '+forbidden);
 call=reply();
 await handler({method:'GET',url:'/api/hotel-catalog?view=owner',headers:{host:'dbest-hotel-review-preview.vercel.app'}},call.res);
 assert.equal(call.res.statusCode,401);
 assert.match(call.res.body.error,/owner_session_required/);
 auth._test.cookieToken=()=> 'test-owner-session';
 auth._test.validateOwner=async()=>true;
 call=reply();
 await handler({method:'GET',url:'/api/hotel-catalog?view=owner&offset=0&limit=2',headers:{host:'dbest-hotel-review-preview.vercel.app'}},call.res);
 assert.equal(call.res.statusCode,200);
 assert.equal(call.res.body.rows[0].amount,4725);
 assert.equal(call.headers['cache-control'].includes('no-store'),true);
 call=reply();
 await handler({method:'GET',url:'/api/hotel-catalog',headers:{host:'dbest4u.com'}},call.res);
 assert.equal(call.res.statusCode,403);
});

test('guest destination accepts typed city, state or partial text and updates from source catalogue',()=>{
 const page=fs.readFileSync('hotel-simple-flow.html','utf8');
 assert.match(page,/<input id="destination"[^>]*type="search"[^>]*list="destinations"/);
 assert.match(page,/<datalist id="destinations"><\/datalist>/);
 assert.match(page,/function fillDestinations\(\)/);
 assert.match(page,/state\.destination\.toLocaleLowerCase\(\)/);
 assert.match(page,/locality\.includes\(destination\)/);
 assert.match(page,/\$\('destination'\)\.addEventListener\('input'/);
 assert.match(page,/fillDestinations\(\);render\(\)/);
 assert.doesNotMatch(page,/id="city" class="field"><option/);
 const scripts=[...page.matchAll(/<script>\s*([\s\S]+?)<\/script>/g)];
 scripts.forEach(m=>new vm.Script(m[1]));
});
