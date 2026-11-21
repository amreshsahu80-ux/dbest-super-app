'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('hotel-review/hotel-guest-rate-api.template.cjs','utf8');
const fakeCatalog=(req,res)=>{
 const offers=[{room:'Deluxe',occupancy:'Single',price:4016.25,currency:'INR',meal:'CP breakfast'},
 {room:'Deluxe',occupancy:'Double',price:4961.25,currency:'INR',meal:'CP breakfast'},
 {room:'Executive',occupancy:'Single',price:4488.75,currency:'INR'},
 {room:'Executive',occupancy:'Double',price:5433.75,currency:'INR'},
 {room:'Extra person',occupancy:'Per person',price:1312.5,currency:'INR'}];
 res.end(JSON.stringify({status:'CONTRACTED_SUPPLIER_RATES_WITH_OWNER_MARKUP',offers}))
};
const moduleRef={exports:{}};
vm.runInNewContext(src,{module:moduleRef,exports:moduleRef.exports,require:(name)=>{assert.equal(name,'./hotel-catalog.js');return fakeCatalog},URL,Promise,Number,String,Set,Array,Object,RegExp,JSON,encodeURIComponent}, {filename:'hotel-guest-rate-api.template.cjs'});
const api=moduleRef.exports;
function req(url,host='dbest-hotel-review-preview.vercel.app'){return{method:'GET',headers:{host},url}}
async function run(r){let code=200,output;const res={set statusCode(v){code=v},get statusCode(){return code},setHeader(){},end(x){output=JSON.parse(x)}};await api(r,res);return{code,output}}
test('double occupancy uses exact 2-adult marked-up rate, never cheaper Single price',async()=>{
 const {code,output}=await run(req('/api/hotel-guest-rate?hotelIds=HOTEL-NANDAN-GHY&adults=2&rooms=1'));
 assert.equal(code,200);assert.equal(output.status,'DBEST_OCCUPANCY_REFERENCES');
 assert.equal(output.hotels[0].pricePerNight,4961.25);
 assert.equal(output.hotels[0].occupancy,'Double');
 assert.notEqual(output.hotels[0].pricePerNight,4016.25)
});
test('single occupancy gets relevant Single tariff; no per-person addon',async()=>{
 const {output}=await run(req('/api/hotel-guest-rate?hotelIds=HOTEL-NANDAN-GHY&adults=1&rooms=1'));
 assert.equal(output.hotels[0].pricePerNight,4016.25);
 assert.equal(output.hotels[0].room,'Deluxe')
});
test('host is allowlisted to isolated hotel previews, reject production or arbitrary hosts',async()=>{
 const bad=await run(req('/api/hotel-guest-rate?hotelIds=HOTEL-NANDAN-GHY&adults=2&rooms=1','dbest4u.com'));
 assert.equal(bad.code,403);
 const good=await run(req('/api/hotel-guest-rate?hotelIds=HOTEL-NANDAN-GHY&adults=2&rooms=1','dbest-hotel-photo-preview.vercel.app'));
 assert.equal(good.code,200)
});
test('multi-room, excess IDs, wrong guest count rejected before catalogue read',async()=>{
 assert.equal((await run(req('/api/hotel-guest-rate?hotelIds=HOTEL-NANDAN-GHY&adults=2&rooms=2'))).code,422);
 assert.equal((await run(req('/api/hotel-guest-rate?hotelIds=HOTEL-NANDAN-GHY&adults=3&rooms=1'))).code,422);
 assert.equal((await run(req('/api/hotel-guest-rate?hotelIds=..&adults=2&rooms=1'))).code,422)
});
