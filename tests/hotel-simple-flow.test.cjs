'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const policy=require('../hotel-review/simple-flow-policy.js');
const intake=require('../hotel-review/approval-gate.js');
const source={
 id:'ND-01',hotelId:'HOTEL-NANDAN-GHY',hotel:'Hotel Nandan',room:'Deluxe',
 occupancy:'Double',amount:4725,meal:'Breakfast',taxes:'Not specified',
 validity:'2026-27 dates pending',cancellation:'72h',
 sourceReference:'source-email-id',sourceReview:'Quote received'
};
const template={
 approval:'AUTO_ACCEPTED_DBEST',taxInclusiveTotal:6500,taxIncluded:true,
 validityConfirmed:true,hotelConfirmation:true,redistributionAuthorized:true,
 hotelId:'HOTEL-NANDAN-GHY',checkIn:'2026-11-15',checkOut:'2026-11-16',
 roomMappingId:'hotel-nandan-deluxe-double',adults:2,rooms:1,
 meal:'Breakfast',cancellationClass:'flexible',currency:'INR'
};
test('all incoming outreach tariffs are accepted commercially without individual approval',()=>{
 const rows=policy.autoAccept([source,{...source,id:'ND-02',amount:null}]);
 assert.equal(rows.length,2);
 assert.ok(rows.every(r=>r.approval==='AUTO_ACCEPTED_DBEST'));
 assert.ok(rows.every(r=>r.bookable===false&&r.supplierPricePrivate===true));
 assert.ok(rows.every(r=>r.customerPriceStatus==='REQUEST_FINAL_QUOTE'));
 assert.equal(rows[1].supplierB2BAmount,null);
 const withCSV=intake.importQueue(intake.rateHistoryRequired.join(',')+'\n'+intake.rateHistoryRequired.map(k=>({
  'Rate ID':'ND-01','Hotel ID':'HOTEL-NANDAN-GHY','Hotel Name':'Hotel Nandan','Rate INR':'4725'
 }[k]||'')).join(','));
 assert.equal(withCSV.records[0].commercialApproval,'AUTO_ACCEPTED_DBEST');
 assert.equal(withCSV.records[0].guestRatePublished,false);
 assert.equal(withCSV.publicationEnabled,false);
});
test('markup is an Owner-controlled arithmetic operation, not public net tariff',()=>{
 assert.equal(policy.markup(4000,12.5),4500);
 assert.equal(policy.markup(4725,0),4725);
 assert.throws(()=>policy.markup(4725,-1),/Invalid/);
 assert.throws(()=>policy.markup(4725,51),/Invalid/);
});
test('savings require real, authorized, tax-inclusive and truly matching live rates',()=>{
 const now=Date.parse('2026-11-01T12:00:00Z');
 const ota={...template,platform:'Booking.com',taxInclusiveTotal:7300,
  audience:'PUBLIC_B2C',sourceRateType:'SELL',
  authorizedFeed:true,checkedAt:'2026-11-01T11:58:00Z'};
 const valid=policy.comparison(template,[ota],now);
 assert.equal(valid.savings,800);
 assert.equal(valid.lowestOTA,7300);
 assert.equal(valid.reason,'LIVE_COMPARISON');
 for(const bad of [
  {...ota,authorizedFeed:false},
  {...ota,audience:'B2B_AGENT'},
  {...ota,audience:'PUBLIC_B2C',sourceRateType:'NET'},
  {...ota,sourceRateType:'CORPORATE'},
  {...ota,checkedAt:'2026-11-01T11:20:00Z'},
  {...ota,roomMappingId:'a-different-room'},
  {...ota,meal:'Room only'},
  {...ota,checkIn:'2026-11-16'},
  {...ota,cancellationClass:'non-refundable'},
  {...ota,taxIncluded:false},
  {...ota,redistributionAuthorized:false}
 ])assert.equal(policy.comparableRate(template,bad,now),false);
 const unavailable=policy.comparison(template,[{...ota,authorizedFeed:false}],now);
 assert.equal(unavailable.savings,null);
 assert.equal(unavailable.reason,'NO_AUTHORIZED_COMPARABLE_LIVE_OTA');
 assert.equal(policy.comparison({...template,taxIncluded:false},[ota],now).savings,null);
});
test('received contracted tariff does not need fresh individual Owner approval or hotel booking confirmation for commercial pricing',()=>{
 const eligible={...template,hotelConfirmation:false};
 assert.equal(policy.hasConfirmedSupplierTotal(eligible),true);
 assert.equal(policy.isPublicB2C({...template,sourceRateType:'SELL',audience:'PUBLIC_B2C',authorizedFeed:true}),true);
 assert.equal(policy.isPublicB2C({...template,sourceRateType:'NET',audience:'PUBLIC_B2C',authorizedFeed:true}),false);
});
test('direct booking action sends a request, never a confirmed booking',()=>{
 const q=policy.bookingRequest({hotel:'Hotel Nandan',checkIn:'2026-11-15',
 checkOut:'2026-11-16',adults:2,rooms:1});
 assert.equal(q.status,'REQUEST_ONLY_NOT_BOOKED');
 assert.match(q.body,/NOT yet confirmed/);
 assert.match(q.body,/confirm room inventory/);
 assert.throws(()=>policy.bookingRequest({hotel:'Hotel Nandan',checkIn:'2026-11-16',checkOut:'2026-11-15',adults:2,rooms:1}),/Invalid stay dates/);
});
test('new guest screen uses licensed property images and no fictional OTA rates',()=>{
 const page=fs.readFileSync('hotel-simple-flow.html','utf8');
 assert.match(page,/Actual property photograph/);
 assert.match(page,/commons\.wikimedia\.org/);
 assert.match(page,/No verified comparison yet/);
 assert.match(page,/B2C price pending/);
 assert.match(page,/on-demand lookup|On-demand lookup/);
 assert.match(page,/Request direct booking/);
 assert.match(page,/mailto:support@thebestservices.org.in/);
 assert.doesNotMatch(page,/\"ota\":\s*\[\d+/);
 assert.doesNotMatch(page,/\"base\":\s*\d+/);
 const scripts=[...page.matchAll(/<script>\s*([\s\S]+?)<\/script>/g)];
 assert.equal(scripts.length,1);scripts.forEach(s=>new vm.Script(s[1]));
});

test('editable destination combines catalogue cities, property names, partial matching, and mobile-accessible suggestions',()=>{
 const page=fs.readFileSync('hotel-simple-flow.html','utf8');
 assert.match(page,/<input id="destination"[^>]*type="search"[^>]*role="combobox"/);
 assert.match(page,/id="destinationSuggestions"[^>]*role="listbox"/);
 assert.match(page,/aria-expanded="false"/);
 assert.match(page,/function buildDestinationIndex\(/);
 assert.match(page,/function showDestinations\(/);
 assert.match(page,/No catalogue suggestions found/);
 assert.match(page,/if\(document\.activeElement===\$\('destination'\)\)showDestinations\(\)/);
 const start=page.indexOf('function destinationMatches(');
 const end=page.indexOf('function closeDestinations()',start);
 assert.ok(start>0&&end>start);
 const suggestion=vm.runInNewContext(page.slice(start,end)+'\ndestinationMatches');
 const items=[
  {value:'Jaipur',kind:'city'}, {value:'Udaipur',kind:'city'},
  {value:'Rambagh Palace',kind:'property'}, {value:'Guwahati',kind:'city'},
  {value:'Royal Orchid Jaipur',kind:'property'}
 ];
 assert.deepEqual(Array.from(suggestion('jai',items),v=>v.value),['Jaipur','Royal Orchid Jaipur']);
 assert.deepEqual(Array.from(suggestion('PALACE',items),v=>v.value),['Rambagh Palace']);
 assert.deepEqual(Array.from(suggestion('UDA',items),v=>v.value),['Udaipur']);
 assert.equal(suggestion('not a city',items).length,0);
});

test('DBest booking is visible, includes selected room, and does not pretend a confirmed reservation',()=>{
 const page=fs.readFileSync('hotel-simple-flow.html','utf8');
 assert.match(page,/Book with DBest/);
 assert.match(page,/class="direct-panel"/);
 assert.match(page,/data-room=/);
 assert.match(page,/requestedRoom/);
 assert.match(page,/DBest Advantage/);
 assert.match(page,/No verified comparison yet/);
 assert.match(page,/No reservation or room hold is created/);
 const request=policy.bookingRequest({hotel:'Hotel Nandan',room:'Deluxe Double',
  checkIn:'2026-11-15',checkOut:'2026-11-16',adults:2,rooms:1});
 assert.equal(request.status,'REQUEST_ONLY_NOT_BOOKED');
 assert.match(request.body,/Room: Deluxe Double/);
 assert.match(request.body,/NOT yet confirmed/);
});
test('owner markup is private and auto-acceptance does not enable unauthenticated publication',()=>{
 const owner=fs.readFileSync('hotel-owner-rate-review.html','utf8');
 assert.match(owner,/id="hotelOwnerWorkbench" hidden/);
 assert.match(owner,/id="hotelMarkup"/);
 assert.match(owner,/commercialApproval==='AUTO_ACCEPTED_DBEST'/);
 assert.match(owner,/owner-only|Only the authenticated Owner/i);
 assert.match(owner,/no instant booking/);
 const scripts=[...owner.matchAll(/<script>\s*([\s\S]+?)<\/script>/g)];
 scripts.forEach(s=>new vm.Script(s[1]));
});
