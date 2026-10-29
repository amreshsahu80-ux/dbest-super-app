'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ota=require('../hotel-review/public-b2c-ota-adapter.cjs');
const hotel={id:'H1',hotel:'Hotel Nandan',city:'Guwahati',state:'Assam'};
const q={checkIn:'2026-11-15',checkOut:'2026-11-16',adults:2,rooms:1};
const gate={
 HOTEL_OTA_LIVE_ENABLED:'true',
 HOTEL_OTA_SPENDING_LIMIT_CONFIRMED:'true',
 HOTEL_OTA_COMMERCIAL_DISPLAY_AUTHORIZED:'true',
 DATAFORSEO_LOGIN:'mock-user',DATAFORSEO_PASSWORD:'mock-secret'
};
const task=result=>({status_code:20000,tasks:[{status_code:20000,result:[result]}]});
test('OTA connection fails closed: no paid request before provider spending cap, rights, credentials and enabled flag',async()=>{
 const configs=[{},
  {HOTEL_OTA_LIVE_ENABLED:'true'},
  {...gate,HOTEL_OTA_SPENDING_LIMIT_CONFIRMED:'false'},
  {...gate,HOTEL_OTA_COMMERCIAL_DISPLAY_AUTHORIZED:'false'},
  {...gate,DATAFORSEO_PASSWORD:''}];
 let calls=0;
 const noFetch=async()=>{calls++;throw Error('PROVIDER SHOULD NOT BE CALLED')};
 for(const env of configs){
  const r=await ota.getPublicB2C(hotel,q,env,noFetch);
  assert.equal(r.live,false);assert.equal(r.providers.length,0);
 }
 assert.equal(calls,0);
});
test('matches only exactly one property, not similarly named hotels or ambiguous matches',()=>{
 const rows=[
  {type:'hotel_search_item',hotel_identifier:'hotelid-aaaaaa1111',title:'Hotel Nandan Palace'},
  {type:'hotel_search_item',hotel_identifier:'hotelid-bbbbbb2222',title:'Hotel Nandan'}
 ];
 assert.equal(ota.hotelMatch(rows,'Hotel Nandan').hotel_identifier,'hotelid-bbbbbb2222');
 assert.equal(ota.hotelMatch(rows,'Nandan'),null);
 assert.equal(ota.hotelMatch([rows[1],rows[1]],'Hotel Nandan'),null);
});
test('filters unsupported or unsafe public provider offers',()=>{
 const raw={check_in:q.checkIn+' 00:00:00 +00:00',check_out:q.checkOut+' 00:00:00 +00:00',
  visitors:2,currency:'INR',items:[
   {type:'hotel_info_price',title:'Booking.com',price:7200,currency:'INR',url:'https://www.booking.com/redirect'},
   {type:'hotel_info_price',title:'Goibibo',price:6600,currency:'INR',url:'javascript:alert(1)'},
   {type:'hotel_info_price',title:'Hotel official',price:3000,currency:'INR',official_site:true},
   {type:'hotel_info_price',title:'Agent hotel',price:1,currency:'USD'},
   {type:'hotel_info_price',title:'Booking.com',price:6900,currency:'INR',url:'https://www.booking.com/other'}
  ]};
 const p=ota.extractOffers(raw,q);
 assert.equal(p.length,2);
 assert.equal(p[0].provider,'Goibibo');
 assert.equal(p[0].url,null);
 assert.equal(p[1].pricePerNight,6900);
 assert.equal(p[1].source,'GOOGLE_HOTELS_PUBLIC_B2C');
 assert.equal(ota.extractOffers({...raw,check_in:'2026-11-21'},q).length,0);
 assert.equal(ota.extractOffers({...raw,visitors:3},q).length,0);
});
test('one-room valid stays only, no past, impossible dates or >30 nights',()=>{
 assert.deepEqual(ota.validateStay(q),q);
 for(const invalid of [
  {...q,checkIn:'2026-01-01'}, {...q,checkOut:q.checkIn},
  {...q,checkOut:'2027-01-20'},{...q,rooms:2},
  {...q,adults:7},{...q,checkIn:'2026-11-31'}
 ]) assert.throws(()=>ota.validateStay(invalid));
});
test('mocked two-stage Google Hotels retrieval returns actual public OTA prices, never supplier net rates',async()=>{
 const calls=[];
 const fetchStub=async(url,options)=>{
  calls.push({url,auth:options.headers.Authorization,request:JSON.parse(options.body)[0]});
  if(url.includes('hotel_searches')){
   return {ok:true,json:async()=>task({items:[{
    type:'hotel_search_item',hotel_identifier:'hotelid-Nandan-1111',title:'Hotel Nandan'}]})};
  }
  return {ok:true,json:async()=>task({prices:{
   currency:'INR',check_in:q.checkIn+' 00:00:00 +00:00',
   check_out:q.checkOut+' 00:00:00 +00:00',visitors:2,
   items:[{type:'hotel_info_price',title:'MakeMyTrip',price:5599,
    currency:'INR',url:'https://www.makemytrip.com/hotels/'}]
  }})};
 };
 const result=await ota.getPublicB2C(hotel,q,gate,fetchStub);
 assert.equal(calls.length,2);
 assert.equal(result.status,'PUBLIC_B2C_OFFERS_FOUND');
 assert.equal(result.providers[0].pricePerNight,5599);
 assert.equal(result.providers[0].provider,'MakeMyTrip');
 assert.equal(result.canClaimSavings,false);
 assert.equal(calls[0].request.currency,'INR');
 assert.equal(calls[1].request.hotel_identifier,'hotelid-Nandan-1111');
 assert.equal(calls[1].request.load_prices_by_dates,undefined);
 assert.doesNotMatch(JSON.stringify(result),/mock-secret|mock-user|supplierB2B|markup|netAmount/i);
});
test('unmatched supplier property stops after search, without paid Hotel Info lookup',async()=>{
 let calls=0;
 const stub=async()=>{calls++;return {ok:true,json:async()=>task({items:[{
 type:'hotel_search_item',hotel_identifier:'Hotel-Unrelated-Identifier',title:'Unrelated Hotel'}]})}};
 const value=await ota.getPublicB2C(hotel,q,gate,stub);
 assert.equal(calls,1);
 assert.equal(value.status,'PROPERTY_NOT_EXACTLY_MATCHED');
});
test('guest comparison endpoint uses only server catalogue property reference, no secret or rate in source',async()=>{
 const source=fs.readFileSync('hotel-review/hotel-ota-api.template.cjs','utf8');
 assert.doesNotMatch(source,/__PRIVATE_SNAPSHOT__|DATAFORSEO_PASSWORD\s*=|api\.dataforseo\.com/);
 assert.match(source,/catalog\._publicHotelById/);
 const cat={_test:{validHost:h=>h==='dbest-hotel-review-preview.vercel.app'},
  _publicHotelById:id=>id==='H1'?hotel:null};
 const moduleStub={exports:{}};
 vm.runInNewContext(source,{
  module:moduleStub,
  require:p=>p.includes('hotel-catalog')?cat:ota,
  URL,process:{env:{}},console,Map,Date
 });
 const headers={};
 const res={setHeader(k,v){headers[k]=v},end(s){this.json=JSON.parse(s)}};
 await moduleStub.exports({method:'GET',
  headers:{host:'dbest-hotel-review-preview.vercel.app'},
  url:'/api/hotel-ota-b2c?hotelId=H1'},res);
 assert.equal(res.statusCode,200);
 assert.equal(res.json.status,'PAID_LOOKUPS_DISABLED');
 assert.equal(res.json.providers.length,0);
 assert.equal(headers['Cache-Control'],'private, no-store');
});
test('status endpoint reports provider readiness without hotel selection or paid calls',async()=>{
 const source=fs.readFileSync('hotel-review/hotel-ota-api.template.cjs','utf8');
 let billed=0;
 const moduleStub={exports:{}},provider={
  configured:()=> 'PAID_LOOKUPS_DISABLED',
  getPublicB2C:async()=>{billed++;throw Error('must not bill');}
 };
 const cat={_test:{validHost:host=>host==='dbest-hotel-review-preview.vercel.app'}};
 vm.runInNewContext(source,{
  module:moduleStub,
  require:p=>p.includes('hotel-catalog')?cat:provider,
  URL,process:{env:{}},console,Map,Date
 });
 const output={setHeader(){},end(s){this.body=JSON.parse(s)}};
 await moduleStub.exports({method:'GET',
  headers:{host:'dbest-hotel-review-preview.vercel.app'},
  url:'/api/hotel-ota-b2c?view=status'},output);
 assert.equal(output.statusCode,200);
 assert.equal(output.body.status,'PAID_LOOKUPS_DISABLED');
 assert.equal(output.body.liveConnected,false);
 assert.equal(billed,0);
 assert.doesNotMatch(JSON.stringify(output.body),/DATAFORSEO_LOGIN|DATAFORSEO_PASSWORD|supplierB2B/);
});
test('guest UI never auto-charges on catalogue load; public OTA requests require click',()=>{
 const page=fs.readFileSync('hotel-simple-flow.html','utf8');
 assert.match(page,/data-ota=/);
 assert.match(page,/e\.target\.closest\('button\[data-ota\]'\)/);
 assert.match(page,/fetch\('\/api\/hotel-google-b2c\?'/);
 assert.match(page,/room, taxes and stay terms/);
 const inline=[...page.matchAll(/<script>\s*([\s\S]+?)<\/script>/g)];
 for(const part of inline)new vm.Script(part[1]);
});
