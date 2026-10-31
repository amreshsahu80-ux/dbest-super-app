'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const google=require('../hotel-review/google-hotels-browser.cjs');
const stay={checkIn:'2026-11-15',checkOut:'2026-11-16',adults:2,rooms:1};
const hotel={id:'HOTEL-NANDAN-GHY',hotel:'Hotel Nandan',city:'Guwahati'};
const overview='Back to hotels\nGuwahati\nHotel Nandan\nNov 15 – 16\nWebsite\nCheck availability\nCheck-in\nCheck-out\n2\nNightly total';
const offers='Back to hotels\nHotel Nandan\nCheck-in\nCheck-out\n2\nNightly total\nAll options\n'+
 'Yatra.com\n₹4,247\nVisit site\nCleartrip.com\nFree cancellation until Nov 13\n,\n₹4,410\nVisit site\n'+
 'Goibibo.com\nFree cancellation until Nov 12\n,\n₹5,302\nVisit site\n'+
 'MakeMyTrip.com\nFree cancellation until Nov 12\n,\n₹5,707\nVisit site\n'+
 'View more options from ₹5,145\nSponsored·Similar hotels\nUnrelated Hotel\n₹1,200\n';
test('Google Hotels TS encodes selected November dates and one night correctly',()=>{
 assert.equal(google.encodeStay(stay),'CAEaIAoCGgASGhIUCgcI6g8QCxgPEgcI6g8QCxgQGAEyAggB');
 assert.match(google.overviewUrl(google.SOURCES[hotel.id].entity,stay),/curr=INR/);
});
test('observed overview must show actual selected dates',()=>{
 assert.equal(google.displayedStayMatches(overview,stay),true);
 assert.equal(google.displayedStayMatches(overview,{...stay,checkIn:'2026-11-21'}),false);
});
test('only exact OTA offer lines before similar hotels are parsed',()=>{
 const rows=google.parsePrices(offers);
 assert.equal(rows.length,4);
 assert.equal(rows.find(x=>x.provider==='MakeMyTrip.com').pricePerNight,5707);
 assert.equal(rows.find(x=>x.provider==='Goibibo.com').pricePerNight,5302);
 assert.ok(rows.every(x=>x.pricePerNight>0&&x.currency==='INR'));
 assert.equal(google.parsePrices('Hotel Nandan\n₹5,707').length,0);
 assert.equal(google.parsePrices('All options\nGoibibo.com\n₹5,302\nNo booking').length,0);
});
test('real browser lookup shape uses confirmed dates and never claims savings',async()=>{
 let evaluated=0,closed=false;
 const page={
  setViewport(){},setDefaultTimeout(){},
  async goto(){return {status:()=>200}},
  async title(){return 'Hotel Nandan - Google hotels'},
  async evaluate(){evaluated++;return evaluated===1?overview:evaluated===2?true:offers},
  async waitForFunction(){return true},
  url(){return 'https://www.google.com/travel/hotels/entity/'+google.SOURCES[hotel.id].entity+'/prices?ts=dated'}
 };
 const mockP={launch:async()=>({newPage:async()=>page,close:async()=>{closed=true}})};
 const mockC={args:[],executablePath:async()=>'/tmp/test-chromium'};
 const r=await google.getPublicGoogleRates(hotel,stay,{puppeteer:mockP,chromium:mockC});
 assert.equal(r.live,true);
 assert.equal(r.providers.length,4);
 assert.equal(r.canClaimSavings,false);
 assert.equal(r.providers.find(x=>x.provider==='MakeMyTrip.com').pricePerNight,5707);
 assert.equal(closed,true);
});
test('Royal Orchid Goa query is limited to a known property and exact selected dates',()=>{
 const mapping=google.SOURCES['DBEST-REPL-20261024-138'];
 assert.equal(mapping.hotel,'Royal Orchid Beach Resort & Spa Goa');
 assert.equal(mapping.city,'Salcete');
 assert.match(google.searchUrl(mapping.query,stay),/q=Royal\+Orchid\+Beach\+Resort/);
 assert.match(google.searchUrl(mapping.query,stay),/curr=INR/);
 assert.equal(google.displayedStayMatches('Royal Orchid Beach Resort & Spa\nNov 15 – 16\nCheck-in\nCheck-out\n2',stay),true);
});
test('unmapped properties do not launch Chrome',async()=>{
 const r=await google.getPublicGoogleRates({id:'OTHER',hotel:'Hotel Nandan',city:'Guwahati'},stay);
 assert.equal(r.status,'PROPERTY_NOT_MAPPED');
 assert.deepEqual(r.providers,[]);
});

test('Google Hotels minor spacing variations retain real B2C offers but never guess prices',()=>{
 const lineBreak=String.fromCharCode(10);
 const spaced=['Hotel Nandan','All options  ','MakeMyTrip.com','₹ 5,707','Visit site','Goibibo.com','₹5,302','Visit site','Sponsored·Similar hotels','Unrelated','₹1,100'].join(lineBreak);
 const got=google.parsePrices(spaced);
 assert.equal(got.length,2);
 assert.equal(got.find(x=>x.provider==='MakeMyTrip.com').pricePerNight,5707);
 assert.equal(got.find(x=>x.provider==='Goibibo.com').pricePerNight,5302);
 assert.deepEqual(google.parsePrices(['Hotel Nandan','MakeMyTrip.com','₹ 5,707','Visit site'].join(lineBreak)),[]);
 assert.deepEqual(google.parsePrices(['All options','Booking.com','₹2,000','₹3,000','Visit site'].join(lineBreak)),[]);
});


test('a date-verified USD public offer is retained in USD, never falsely identified as INR',()=>{
 const usd=['Hotel Nandan','Nov 15 – 16','All options',
 'Expedia.com','Free cancellation','\$52','Visit site',
 'Hotels.com','\$51','Visit site',
 'Sponsored·Similar hotels','Unrelated property','\$5'].join('\n');
 const prices=google.parsePrices(usd);
 assert.equal(prices.length,2);
 assert.deepEqual(prices.map(x=>[x.provider,x.pricePerNight,x.currency]),
  [['Expedia.com',52,'USD'],['Hotels.com',51,'USD']]);
 assert.deepEqual(google.parsePrices(['All options','Expedia.com','$52','No booking link'].join('\n')),[]);
});
