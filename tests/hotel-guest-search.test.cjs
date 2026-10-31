'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('hotel-guest-search.html','utf8');
test('guest-first search has destination dates occupancy and one Search hotels action',()=>{
 assert.match(html,/id="destination"/);
 assert.match(html,/id="checkIn"/);
 assert.match(html,/id="checkOut"/);
 assert.match(html,/id="guests"/);
 assert.match(html,/>Search hotels</);
 assert.match(html,/function searchHotels\(\)/);
});
test('hotel cards show property photo or honest fallback and side-by-side DBest and public OTAs',()=>{
 assert.match(html,/class="photo"/);
 assert.match(html,/Property image coming soon/);
 assert.match(html,/alt="Photograph of /);
 assert.match(html,/DBest Special Rate/);
 assert.match(html,/Other public OTA rates/);
 for(const name of ['MakeMyTrip','Goibibo','Booking.com']) assert.ok(html.includes(name));
 assert.match(html,/difference/);
 assert.match(html,/data-book/);
 assert.match(html,/class="btn book"/);
});
test('rates are real sources only, exact stay and guest matched, no fabricated discounts',()=>{
 assert.match(html,/\/api\/hotel-public-google/);
 assert.match(html,/\/api\/hotel-public-catalog/);
 assert.match(html,/\/api\/hotel-guest-rate/);
 assert.match(html,/data\.status!=='DBEST_OCCUPANCY_REFERENCES'/);
 assert.match(html,/result\.stay\.checkIn===state\.checkIn/);
 assert.match(html,/result\.stay\.checkOut===state\.checkOut/);
 assert.match(html,/Object\.assign\(\{\},q,\{adults:state\.adults,rooms:state\.rooms\}\)/);
 assert.match(html,/not guaranteed savings/);
 assert.doesNotMatch(html,/Math\.random\(\)/);
 assert.doesNotMatch(html,/hotel-catalog\?view=owner/);
});
test('Book is actionable but isolated preview never charges guest or invents booking',()=>{
 assert.match(html,/\$\('results'\)\.addEventListener\('click'/);
 assert.match(html,/\$\('bookingModal'\)\.showModal\(\)/);
 assert.match(html,/\$\('guestForm'\)\.addEventListener\('submit'/);
 assert.match(html,/No booking submitted/);
 assert.match(html,/No payment collected/);
 assert.match(html,/TEST PREVIEW/);
 assert.doesNotMatch(html,/razorpay\.open/);
});
test('guest HTML JavaScript parses',()=>{
 const chunks=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 assert.equal(chunks.length,1);
 for(const match of chunks)new vm.Script(match[1]);
});

test('Hotel Nandan selling reference respects the selected room and two-adult occupancy',()=>{
 assert.match(html,/nandanSelling=Object\.freeze/);
 assert.match(html,/'2:1':\{Deluxe:4961\.25,Executive:5433\.75,Suite:6692\.70\}/);
 assert.match(html,/'1:1':\{Deluxe:4016\.25,Executive:4488\.75,Suite:6692\.70\}/);
 assert.match(html,/roomSelections\.get\(h\.id\)/);
 assert.match(html,/selected&&!String\(q\.room\)/);
 assert.match(html,/Starting rate; selected occupancy unconfirmed/);
});
test('missing OTA prices have real consumer search links, explanatory status and retry',()=>{
 assert.match(html,/function otaConsumerLink\(h,name\)/);
 assert.match(html,/Check price/);
 assert.match(html,/No date-verified public OTA rates were returned/);
 assert.match(html,/Public OTA rate source is temporarily unavailable/);
 assert.match(html,/data-refresh-ota/);
 assert.match(html,/loadOTA\(hotel,searchToken,true\)/);
 assert.match(html,/result\.stay\.checkIn===state\.checkIn/);
 assert.match(html,/result\.stay\.checkOut===state\.checkOut/);
});
test('when property image rights are not confirmed use official gallery link, not an OTA photo copied into DBest',()=>{
 assert.match(html,/galleries=Object\.freeze/);
 assert.match(html,/hotelnandan\.com\/rooms\//);
 assert.match(html,/View hotel’s real photos/);
 assert.doesNotMatch(html,/r2imghtlak\.mmtcdn\.com/);
});


test('public-source hotel photos are identity-bound and remote, not described as public-domain licensed',()=>{
 for(const id of ['HOTEL-NANDAN-GHY','HIST-016','DBEST-REPL-20261026-691','DBEST-REPL-20261026-697']){
  assert.ok(html.includes("'"+id+"':Object.freeze({"),id);
 }
 assert.match(html,/publicPropertyPhotos=Object\.freeze/);
 assert.match(html,/h\.photo\|\|photoById\.get\(h\.id\)\|\|publicPropertyPhotos\[h\.id\]/);
 assert.match(html,/PUBLIC_SOURCE_REUSE_NOT_VERIFIED/);
 assert.match(html,/data-backup/);
 assert.match(html,/View official gallery/);
 for(const host of ['r2imghtlak.mmtcdn.com','cdn.sanity.io','assets.simplotel.com','thevendry.com']){
  assert.ok(html.includes(host),host);
 }
 assert.doesNotMatch(html,/data:image\/jpeg;base64/);
});
