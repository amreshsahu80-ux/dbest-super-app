'use strict';
/*
 * Separate DBest Hotel public Google Hotels B2C browser endpoint.
 * Deployed as api/hotel-google-b2c.js ONLY in the unaliased hotel preview.
 * No API provider keys or paid OTA account required.
 * This uses serverless browser compute; it is not cost-free at scale.
 */
const catalog=require('./hotel-catalog.js');
const validate=require('../hotel-review/public-b2c-ota-adapter.cjs');
const google=require('../hotel-review/google-hotels-browser.cjs');
const cache=new Map(),running=new Map();
let currentWindow=0,requestsThisWindow=0;
function send(res,status,payload){
 res.statusCode=status;
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.end(JSON.stringify(payload));
}
async function handler(req,res){
 if(!catalog._test.validHost(req.headers?.host))return send(res,403,{status:'ISOLATED_PREVIEW_ONLY'});
 if(req.method!=='GET')return send(res,405,{status:'METHOD_NOT_ALLOWED'});
 if(process.env.HOTEL_BROWSER_PILOT_ENABLED!=='true')
  return send(res,200,{status:'BROWSER_PILOT_DISABLED',providers:[],live:false});
 const qs=new URL(req.url||'/', 'https://internal.test').searchParams;
 const id=String(qs.get('hotelId')||'').slice(0,135);
 const hotel=catalog._publicHotelById(id);
 if(!hotel)return send(res,404,{status:'UNKNOWN_HOTEL',providers:[],live:false});
 if(!google.SOURCES[id])return send(res,200,{status:'PROPERTY_NOT_MAPPED',providers:[],live:false});
 let stay;
 try{
  stay=validate.validateStay({checkIn:qs.get('checkIn'),checkOut:qs.get('checkOut'),
   adults:qs.get('adults'),rooms:qs.get('rooms')});
 }catch{return send(res,422,{status:'INVALID_STAY',providers:[],live:false})}
 if(stay.adults!==2||stay.rooms!==1)
  return send(res,200,{status:'OCCUPANCY_NOT_SUPPORTED',providers:[],live:false});
 const key=[id,stay.checkIn,stay.checkOut,stay.adults,stay.rooms].join('|');
 const hit=cache.get(key);
 if(hit&&Date.now()-hit.at<15*60*1000)return send(res,200,{...hit.data,cached:true});
 let promise=running.get(key);
 if(!promise){
  // Best-effort single-instance safety valve. Not an account-level cost cap.
  const now=Date.now();
  if(now-currentWindow>=3600000){currentWindow=now;requestsThisWindow=0}
  if(requestsThisWindow>=8)return send(res,429,{status:'PILOT_HOURLY_LIMIT',providers:[],live:false});
  requestsThisWindow++;
  promise=google.getPublicGoogleRates(hotel,stay).finally(()=>running.delete(key));
  running.set(key,promise);
 }
 try{
  const data=await promise;
  cache.set(key,{at:Date.now(),data});
  if(cache.size>30)cache.delete(cache.keys().next().value);
  return send(res,200,data);
 }catch(error){
  const detail=String(error&&error.message||'').slice(0,160);
  console.error('DBEST_GOOGLE_BROWSER_PILOT',detail);
  // Debug is exposed ONLY in the isolated, explicitly enabled preview.
  return send(res,502,{status:'GOOGLE_PUBLIC_BROWSER_UNAVAILABLE',
   providers:[],live:false,diagnostic:detail.replace(/https?:\/\/\S+/g,'[source-url]')});
 }
}
module.exports=handler;
