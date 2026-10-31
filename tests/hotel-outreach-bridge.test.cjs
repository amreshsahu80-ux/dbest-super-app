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
 assert.match(page,/fetch\('\/api\/hotel-public-catalog'/);
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
 assert.match(guest,/fetch\('\/api\/hotel-public-catalog'/);
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

test('Owner markup must be configured server-side; accepted quotations become customer special rates without supplier disclosure',async()=>{
 const sample=bridge.build(hotelsHeader,hotelRows,ratesHeader,rateRows);
 const source=fs.readFileSync('hotel-review/hotel-catalog-api.template.cjs','utf8')
  .replace('const DATA=__PRIVATE_SNAPSHOT__;', 'const DATA='+JSON.stringify(sample)+';');
 const auth={_test:{cookieToken:()=>'',validateOwner:async()=>false}};
 function create(env){
  const moduleStub={exports:{}};
  vm.runInNewContext(source,{module:moduleStub,require:()=>auth,URL,process:{env},console});
  return moduleStub.exports;
 }
 function response(){
  const headers={};return {res:{statusCode:200,setHeader(k,v){headers[k.toLowerCase()]=v},end(s){this.body=JSON.parse(s)}},headers};
 }
 const req={method:'GET',url:'/api/hotel-catalog?view=offers&hotelId=H-1',
  headers:{host:'dbest-hotel-review-preview.vercel.app'}};
 let call=response();
 await create({})(req,call.res);
 assert.equal(call.res.statusCode,200);
 assert.equal(call.res.body.status,'OWNER_MARKUP_NOT_CONFIGURED');
 assert.equal(call.res.body.offers.length,0);
 call=response();
 await create({HOTEL_REVIEW_MARKUP_PERCENT:'12.5'})(req,call.res);
 const value=call.res.body;
 assert.equal(value.status,'CONTRACTED_SUPPLIER_RATES_WITH_OWNER_MARKUP');
 assert.equal(value.total,2);
 assert.equal(value.offers[0].price,5315.63);
 assert.equal(value.offers[1].price,5062.5);
 assert.equal(value.offers[0].taxStatus,'TAX_TERMS_UNCLEAR');
 assert.equal(value.offers[1].taxStatus,'TAX_INCLUDED');
 assert.ok(value.offers.every(o=>o.commercialStatus==='CONTRACTED_FINAL'));
 const raw=JSON.stringify(value);
 for(const forbidden of ['4725','4500','email-id','sourceRef','review','amount'])
  assert.equal(raw.includes(forbidden),false,'Leaked private field '+forbidden);
 call=response();
 await create({HOTEL_REVIEW_MARKUP_PERCENT:'100'})(req,call.res);
 assert.equal(call.res.body.status,'OWNER_MARKUP_NOT_CONFIGURED');
 const nohotel=response();
 await create({HOTEL_REVIEW_MARKUP_PERCENT:'12.5'})({...req,url:'/api/hotel-catalog?view=offers&hotelId=not-a-hotel'},nohotel.res);
 assert.equal(nohotel.res.statusCode,404);
});
test('customer summary exposes Owner-marked-up contracted references, not net tariffs or fake OTA rates',async()=>{
 const extraRow=['R-3','H-1','Test Contracted Hotel','Extra person','1000','Per person','GST included','CP Breakfast','November','72 hours','email-extra','Quoted'];
 const snapshot=bridge.build(hotelsHeader,hotelRows,ratesHeader,[...rateRows,extraRow]);
 const templateSource=fs.readFileSync('hotel-review/hotel-catalog-api.template.cjs','utf8');
 const compiled=templateSource.replace('const DATA=__PRIVATE_SNAPSHOT__;', 'const DATA='+JSON.stringify(snapshot)+';');
 const moduleStub={exports:{}};
 const auth={_test:{cookieToken:()=>'',validateOwner:async()=>false}};
 vm.runInNewContext(compiled,{module:moduleStub,require:()=>auth,URL,process:{env:{HOTEL_REVIEW_MARKUP_PERCENT:'5'}},console});
 const response={headers:{host:'dbest-hotel-review-preview.vercel.app'},method:'GET',url:'/api/hotel-catalog?view=offers-summary'};
 const output={statusCode:200,setHeader(){},end(body){this.body=JSON.parse(body)}};
 await moduleStub.exports(response,output);
 assert.equal(output.statusCode,200);
 assert.equal(output.body.status,'DBEST_CONTRACTED_SELLING_REFERENCES');
 assert.equal(output.body.hotels.length,1);
 assert.equal(output.body.hotels[0].price,4725); // 4500 room +5%, never the 1000 extra-person tariff
 assert.notEqual(output.body.hotels[0].room,'Extra person');
 assert.equal(output.body.hotels[0].label,'RECEIVED_CONTRACTED_RATE_REFERENCE');
 assert.equal(output.body.liveOTAConnected,false);
 const json=JSON.stringify(output.body);
 for(const key of ['sourceRef','supplierB2BAmount','commercialApproval','markupPercent','sourceEmail'])
  assert.equal(json.includes(key),false);
});
test('B2C comparison and DBest selling price preview are explicit and do not infer OTA prices',()=>{
 const page=fs.readFileSync('hotel-simple-flow.html','utf8');
 assert.match(page,/View DBest Special Rates/);
 assert.match(page,/view=offers&hotelId=/);
 assert.match(page,/Public B2C/);
 assert.match(page,/data-ota=/);
 assert.match(page,/view=offers-summary/);
 assert.match(page,/DBest Special Rate/);
 assert.match(page,/Open consumer hotel search/);
 assert.match(page,/https:\/\/www\.makemytrip\.com\/hotels\//);
 assert.match(page,/https:\/\/www\.goibibo\.com\/hotels\//);
 assert.match(page,/not verified savings/);
 assert.match(page,/Book with DBest/);
 assert.doesNotMatch(page,/ota:\s*\[\d+/);
});
test('guest destination accepts typed city, state or partial text and updates from source catalogue',()=>{
 const page=fs.readFileSync('hotel-simple-flow.html','utf8');
  assert.match(page,/<input id="destination"[^>]*type="search"[^>]*role="combobox"/);
  assert.match(page,/id="destinationSuggestions"[^>]*role="listbox"/);
  assert.match(page,/function buildDestinationIndex\(\)/);
 assert.match(page,/state\.destination\.toLocaleLowerCase\(\)/);
 assert.match(page,/locality\.includes\(destination\)/);
 assert.match(page,/\$\('destination'\)\.addEventListener\('input'/);
  assert.match(page,/buildDestinationIndex\(\);if\(document\.activeElement===\$\('destination'\)\)showDestinations\(\);render\(\)/);
 assert.doesNotMatch(page,/id="city" class="field"><option/);
 const scripts=[...page.matchAll(/<script>\s*([\s\S]+?)<\/script>/g)];
 scripts.forEach(m=>new vm.Script(m[1]));
});

test('Owner markup save is local-only pending private storage and never publishes net prices',()=>{
 const owner=fs.readFileSync('hotel-owner-rate-review.html','utf8');
 assert.match(owner,/id="saveHotelMarkup"/);
 assert.match(owner,/id="hotelMarkupStatus"/);
 assert.match(owner,/dbest:owner-authenticated',loadLocalMarkup/);
 assert.match(owner,/localStorage\.setItem\(markupStorageKey,String\(v\)\)/);
 assert.match(owner,/not published to customer prices/);
 assert.match(owner,/protected isolated Vercel environment setting/);
 assert.match(owner,/id="ownerServerMarkup"/);
 assert.match(owner,/ACTIVE SELLING MARKUP/);
 assert.doesNotMatch(owner,/localStorage\.setItem\([^,]+,\s*JSON\.stringify\(records/);
 assert.match(owner,/v\*2!==Math\.round\(v\*2\)/);
 const scripts=[...owner.matchAll(/<script>\s*([\s\S]+?)<\/script>/g)];
 for(const s of scripts)new vm.Script(s[1]);
});
