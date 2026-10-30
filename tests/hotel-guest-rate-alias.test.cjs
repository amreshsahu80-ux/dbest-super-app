'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const api=fs.readFileSync('hotel-review/hotel-guest-selling-api.template.cjs','utf8');
const proxy=fs.readFileSync('hotel-review/hotel-catalog-alias-proxy.cjs','utf8');
function load(file,lookup){
 const module={exports:{}};
 const ctx={module,exports:module.exports,require:lookup,URL,Number,Object,String,Array,Math,JSON,RegExp,process:{env:{HOTEL_REVIEW_MARKUP_PERCENT:'5'}}};
 vm.runInNewContext(file,ctx);
 return module.exports;
}
const mockHotel={id:'HOTEL-NANDAN-GHY',hotel:'Hotel Nandan',city:'Guwahati'};
const testOffers=[
 {room:'Deluxe',occupancy:'Single',meal:'CP breakfast',price:4016.25,taxStatus:'TAX_TERMS_UNCLEAR'},
 {room:'Deluxe',occupancy:'Double',meal:'CP breakfast',price:4961.25,taxStatus:'TAX_TERMS_UNCLEAR'},
 {room:'Extra person',occupancy:'Per person',price:1312.5}
];
test('two-adult Hotel Nandan rate never uses cheaper one-adult tariff',()=>{
 const service=load(api,()=>({}));
 assert.equal(service._test.bestOffer(testOffers,2).pricePerNight,4961.25);
 assert.equal(service._test.bestOffer(testOffers,1).pricePerNight,4016.25);
 assert.equal(service._test.bestOffer([{room:'Extra person',occupancy:'Per person',price:50}],2),null);
});
test('guest endpoint exposes only marked-up selling price, not supplier net, and validates host',()=>{
 const fake={_publicHotelById:id=>id===mockHotel.id?mockHotel:null,_test:{
  validHost:()=>true,pricedOffers:()=>({status:'CONTRACTED_SUPPLIER_RATES_WITH_OWNER_MARKUP',offers:testOffers})
 }};
 const service=load(api,name=>{assert.equal(name,'./hotel-catalog.js');return fake});
 const req={method:'GET',url:'/?hotelIds=HOTEL-NANDAN-GHY&adults=2&rooms=1',headers:{host:'dbest-hotel-photo-preview.vercel.app'}};
 let body,status;const res={setHeader(){},end(value){body=JSON.parse(value)},set statusCode(v){status=v}};
 service(req,res);
 assert.equal(status,200);
 assert.equal(body.hotels[0].pricePerNight,4961.25);
 assert.equal(body.hotels[0].occupancy,'Double');
 assert.equal(body.hotels[0].allInTotalVerified,false);
 assert.equal(JSON.stringify(body).includes('netPrice'),false);
 assert.equal(JSON.stringify(body).includes('markupPercent'),false);
});
test('catalogue wrapper accepts only the isolated hotel preview alias, not the DBest production site',()=>{
 const service=load(proxy,()=>Object.assign(()=>{},{
  _test:{validHost:()=>true},_publicHotelById:()=>mockHotel
 }));
 assert.equal(service._test.validHost('dbest-hotel-photo-preview.vercel.app'),true);
 assert.equal(service._test.validHost('dbest-hotel-review-preview-guest-rates.vercel.app'),true);
 assert.equal(service._test.validHost('dbest4u.com'),false);
 assert.equal(service._test.validHost('evil.vercel.app'),false);
});
test('customer page routes to deployed endpoints, with no hard-coded fabricated live OTA values',()=>{
 const html=fs.readFileSync('hotel-simple-flow.html','utf8');
 assert.match(html,/\/api\/hotel-guest-rate\?/);
 assert.match(html,/\/api\/hotel-catalog/);
 assert.match(html,/\/api\/hotel-google-b2c/);
 assert.doesNotMatch(html,/\/api\/hotel-public-catalog|\/api\/hotel-public-google/);
 assert.match(html,/const dbestNumeric=guestRate/);
 assert.match(html,/not verified savings/);
});
