'use strict';
/*
 * Isolated public OTA reference endpoint. Deployed as api/hotel-ota-b2c.js.
 * No browser-side credentials, private supplier rates, or silent paid scanning.
 * The paid provider call is disabled unless the Owner separately configures
 * credentials, an account-level spending cap, and commercial-display rights.
 */
const catalog=require('./hotel-catalog.js');
const ota=require('../hotel-review/public-b2c-ota-adapter.cjs');
const inflight=new Map(),cache=new Map();
function reply(res,status,payload){
 res.statusCode=status;
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('Vary','Cookie');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.end(JSON.stringify(payload));
}
async function handler(req,res){
 if(!catalog._test.validHost(req.headers?.host))return reply(res,403,{status:'ISOLATED_PREVIEW_ONLY'});
 if(req.method!=='GET')return reply(res,405,{status:'METHOD_NOT_ALLOWED'});
 const qs=new URL(req.url||'/', 'https://internal.test').searchParams;
 if(qs.get('view')==='status'){
  const gate=ota.configured(process.env);
  return reply(res,200,{
   status:gate,liveConnected:gate==='READY',
   provider:'GOOGLE_HOTELS_PUBLIC_B2C',
   comparisonBasis:'Public pre-login OTA rates for selected dates; not final all-in confirmed totals',
   note:gate==='READY'?'On-demand live B2C lookups enabled. Hotel and date selection required.':
    'Live OTA lookups are disabled pending provider access, spending cap and display permission.'
  });
 }
 const id=String(qs.get('hotelId')||'').slice(0,135);
 const hotel=catalog._publicHotelById(id);
 if(!hotel)return reply(res,404,{status:'UNKNOWN_HOTEL',providers:[]});
 const status=ota.configured(process.env);
 if(status!=='READY')return reply(res,200,{status,providers:[],live:false,
  note:'Public B2C lookup is not active. No charged lookup has been made.'});
 const q={checkIn:qs.get('checkIn'),checkOut:qs.get('checkOut'),
  adults:qs.get('adults'),rooms:qs.get('rooms')};
 try{ota.validateStay(q)}catch{return reply(res,422,{status:'INVALID_STAY',providers:[]})}
 // Reuse repeated identical queries during an instance lifetime. Not a
 // cross-instance spending cap: provider-account limits are mandatory.
 const key=[id,q.checkIn,q.checkOut,q.adults,q.rooms].join('|');
 const cached=cache.get(key);
 if(cached&&Date.now()-cached.time<15*60000)
  return reply(res,200,{...cached.value,cached:true});
 let promise=inflight.get(key);
 if(!promise){
  promise=ota.getPublicB2C(hotel,q,process.env).finally(()=>inflight.delete(key));
  inflight.set(key,promise);
 }
 try{
  const data=await promise;
  if(data.live)cache.set(key,{time:Date.now(),value:data});
  return reply(res,200,data);
 }catch{
  return reply(res,502,{status:'OTA_PROVIDER_UNAVAILABLE',providers:[],live:false});
 }
}
module.exports=handler;
