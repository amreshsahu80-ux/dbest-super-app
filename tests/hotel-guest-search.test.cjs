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
