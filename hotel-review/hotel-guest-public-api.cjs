'use strict';
/**
 * DBest Hotel guest-only public OTA endpoint for an isolated preview.
 * Public information only: known property mapping + 2-adult, 1-room stay.
 * This module never imports DBest supplier net rates, Owner services, accounts,
 * wallet, customer booking data, or the private hotel catalogue.
 */
const google=require('./google-hotels-browser.cjs');
const validator=require('./public-b2c-ota-adapter.cjs');
const MAX_OFFERS=12,MAX_REQUESTS_PER_HOUR=8;
const allowedHost=/^dbest-hotel-guest-public-preview(?:-[a-z0-9-]+)?\.vercel\.app$/;
const cache=new Map(),pending=new Map();
let used=0,windowStart=0;
function send(res,status,data){
 res.statusCode=status;
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.end(JSON.stringify(data));
}
function publicCoverage(){
 const mapped=Object.entries(google.SOURCES).map(([id,m])=>
  ({id,hotel:m.hotel,city:m.city,mode:m.entity?'EXACT_ENTITY':'EXACT_PROPERTY_QUERY'}));
 return {status:'DBEST_PUBLIC_OTA_CROSSWALK',count:mapped.length,mapped,
  livePriceCountNotGuaranteed:true};
}
function makeHandler(opts={}){
 const read=opts.read||google.getPublicGoogleRates;
 const env=opts.env||process.env;
 const clock=opts.now||(()=>Date.now());
 return async function handler(req,res){
  const host=String(req.headers?.host||'').toLowerCase().split(':')[0];
  if(!allowedHost.test(host))return send(res,403,{status:'ISOLATED_GUEST_PREVIEW_ONLY',providers:[],live:false});
  if(req.method!=='GET')return send(res,405,{status:'METHOD_NOT_ALLOWED',providers:[],live:false});
  const url=new URL(req.url||'/', 'https://internal.invalid');
  if(url.pathname==='/api/hotel-coverage')return send(res,200,publicCoverage());
  if(url.pathname!=='/api/hotel-public-google')return send(res,404,{status:'UNKNOWN_ROUTE',providers:[],live:false});
  if(env.HOTEL_BROWSER_PILOT_ENABLED!=='true')return send(res,200,{status:'BROWSER_PILOT_DISABLED',providers:[],live:false});
  const id=String(url.searchParams.get('hotelId')||'').slice(0,135);
  const ref=google.SOURCES[id];
  if(!ref)return send(res,200,{status:'PROPERTY_NOT_MAPPED',providers:[],live:false});
  let stay;
  try{stay=validator.validateStay({
   checkIn:url.searchParams.get('checkIn'),checkOut:url.searchParams.get('checkOut'),
   adults:url.searchParams.get('adults'),rooms:url.searchParams.get('rooms')
  });}catch{return send(res,422,{status:'INVALID_STAY',providers:[],live:false})}
  if(stay.adults!==2||stay.rooms!==1)return send(res,200,{status:'OCCUPANCY_NOT_SUPPORTED',providers:[],live:false});
  const key=[id,stay.checkIn,stay.checkOut,stay.adults,stay.rooms].join('|'),now=clock();
  const recent=cache.get(key);
  if(recent&&now-recent.ts<12*60*1000)return send(res,200,{...recent.value,cached:true});
  let promise=pending.get(key);
  if(!promise){
   if(now-windowStart>3600000){windowStart=now;used=0}
   if(used>=MAX_REQUESTS_PER_HOUR)return send(res,429,{status:'PILOT_HOURLY_LIMIT',providers:[],live:false});
   used++;
   const hotel={id,hotel:ref.hotel,city:ref.city};
   promise=Promise.resolve().then(()=>read(hotel,stay)).finally(()=>pending.delete(key));
   pending.set(key,promise);
  }
  try{
   const result=await promise;
   const safeProviders=Array.isArray(result?.providers)?result.providers.filter(p=>
    p&&typeof p.provider==='string'&&
    ['INR','USD'].includes(p.currency)&&
    Number.isFinite(p.pricePerNight)&&p.pricePerNight>0).slice(0,MAX_OFFERS):[];
   const valid=result?.live===true&&result?.stay?.checkIn===stay.checkIn&&
    result?.stay?.checkOut===stay.checkOut&&result?.stay?.adults===2&&
    result?.stay?.rooms===1&&safeProviders.length>0;
   const value=valid?
    {...result,providers:safeProviders,live:true}:
    {status:result?.status||'NO_VERIFIED_PUBLIC_GOOGLE_B2C_OFFERS',
     providers:[],live:false,stay};
   cache.set(key,{ts:now,value});if(cache.size>30)cache.delete(cache.keys().next().value);
   return send(res,200,value);
  }catch(err){
   console.error('DBEST_PUBLIC_OTA_SOURCE',String(err?.message||'').slice(0,120));
   return send(res,502,{status:'GOOGLE_PUBLIC_BROWSER_UNAVAILABLE',providers:[],live:false});
  }
 };
}
module.exports=makeHandler();
module.exports._test={makeHandler,publicCoverage,allowedHost};
