'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const pilot=require('../hotel-review/public-page-rate-probe.cjs');
const stay={checkIn:'2026-11-15',checkOut:'2026-11-16',adults:2,rooms:1};
const hotel={id:'HOTEL-NANDAN-GHY',hotel:'Hotel Nandan',city:'Guwahati'};
function stub(html){
 return async (url,opts)=>({
  ok:true,status:200,headers:{get:()=> 'text/html; charset=utf-8'},
  text:async()=>html
 });
}
const offer=(inDate,outDate,price)=>'<html><h1>Hotel Nandan</h1><script type="application/ld+json">'+
 JSON.stringify({'@type':'LodgingBusiness',name:'Hotel Nandan',offers:{
  '@type':'Offer',checkinDate:inDate,checkoutDate:outDate,adults:2,
  rooms:1,unitText:'price per night',priceSpecification:{price:price,priceCurrency:'INR'}
 }})+'</script></html>';
test('public-page URL includes requested dates without arbitrary target URLs',()=>{
 assert.match(pilot.pageUrl(pilot.SOURCES[hotel.id][0],stay),/checkin=11152026/);
 assert.match(pilot.pageUrl(pilot.SOURCES[hotel.id][1],stay),/checkout=20261116/);
 assert.equal(pilot.SOURCES[hotel.id].length,2);
});
test('public HTML price only valid when the same offer explicitly states exact stay, INR and nightly price',()=>{
 assert.equal(pilot.fromStructuredHtml('<h1>Hotel Nandan</h1><p>₹4,500</p>',stay),null);
 assert.equal(pilot.fromStructuredHtml(offer('2026-10-15','2026-10-16',4500),stay),null);
 assert.equal(pilot.fromStructuredHtml(offer('2026-11-15','2026-11-16',4500),stay).pricePerNight,4500);
 assert.equal(pilot.fromStructuredHtml(offer('2026-11-15','2026-11-16',99999999),stay),null);
 assert.equal(pilot.fromStructuredHtml(offer('2026-11-15','2026-11-16','none'),stay),null);
});
test('free probe makes only two known public-page requests and can display independently confirmed prices',async()=>{
 let calls=0;
 const response=await pilot.queryPublicPages(hotel,stay,async(url,opts)=>{
  calls++;assert.equal(opts.redirect,'manual');assert.match(url,/hotel_nandan|nandan-hotel/);
  return stub(offer(stay.checkIn,stay.checkOut,4704))(url,opts);
 });
 assert.equal(calls,2);
 assert.equal(response.live,true);
 assert.equal(response.providers.length,2);
 assert.equal(response.providers[0].pricePerNight,4704);
 assert.equal(response.canClaimSavings,false);
 assert.equal(response.providers[0].source,'PUBLIC_PROPERTY_PAGE_STAY_MATCHED');
});
test('unverified public page prices, blocked sites and wrong hotel map never become live rates',async()=>{
 const textPage='<html><h1>Hotel Nandan</h1><p>₹4,800 per night</p></html>';
 const r=await pilot.queryPublicPages(hotel,stay,stub(textPage));
 assert.equal(r.status,'NO_VERIFIED_PUBLIC_PAGE_OFFERS');
 assert.equal(r.live,false);
 assert.equal(r.providers.length,0);
 let calls=0;
 const other=await pilot.queryPublicPages({id:'OTHER',hotel:'Hotel Nandan',city:'Guwahati'},
  stay,async()=>{calls++;throw Error('must not fetch')});
 assert.equal(other.status,'PUBLIC_PAGE_PILOT_NOT_MAPPED');
 assert.equal(calls,0);
});
test('pilot URL source is read-only, fixed source list; guest markup has no raw external HTML',()=>{
 const route=fs.readFileSync('hotel-review/hotel-free-ota-api.template.cjs','utf8');
 assert.match(route,/catalog\._publicHotelById/);
 assert.match(route,/stayValidator\.validateStay/);
 assert.doesNotMatch(route,/\breq\.body\b|DATAFORSEO_PASSWORD|api\.dataforseo\.com/);
 const html=fs.readFileSync('hotel-simple-flow.html','utf8');
 assert.match(html,/\/api\/hotel-free-ota\?/);
 const scripts=[...html.matchAll(/<script>\s*([\s\S]*?)<\/script>/g)];
 for(const script of scripts)new vm.Script(script[1]);
});
