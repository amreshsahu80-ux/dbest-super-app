'use strict';
/* Read-only isolated hotel page-price feasibility pilot; deployed as api/hotel-free-ota.js.
 * No paid provider calls, no arbitrary URL inputs, no browsing behind login.
 */
const catalog=require('./hotel-catalog.js');
const stayValidator=require('../hotel-review/public-b2c-ota-adapter.cjs');
const publicPages=require('../hotel-review/public-page-rate-probe.cjs');
const inflight=new Map(),cache=new Map();
function reply(res,status,data){
 res.statusCode=status;
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.end(JSON.stringify(data));
}
async function handler(req,res){
 if(!catalog._test.validHost(req.headers?.host))return reply(res,403,{status:'ISOLATED_PREVIEW_ONLY'});
 if(req.method!=='GET')return reply(res,405,{status:'METHOD_NOT_ALLOWED'});
 const qs=new URL(req.url||'/', 'https://internal.test').searchParams;
 const id=String(qs.get('hotelId')||'').slice(0,135);
 const hotel=catalog._publicHotelById(id);
 if(!hotel)return reply(res,404,{status:'UNKNOWN_HOTEL',providers:[],live:false});
 if(!publicPages.SOURCES[id]||hotel.hotel!=='Hotel Nandan'||hotel.city!=='Guwahati')
  return reply(res,200,{status:'PUBLIC_PAGE_PILOT_NOT_MAPPED',providers:[],live:false});
 let stay;
 try{
  stay=stayValidator.validateStay({checkIn:qs.get('checkIn'),checkOut:qs.get('checkOut'),
   adults:qs.get('adults'),rooms:qs.get('rooms')});
 }catch{return reply(res,422,{status:'INVALID_STAY',providers:[],live:false})}
 const key=[id,stay.checkIn,stay.checkOut,stay.adults,stay.rooms].join('|');
 const hit=cache.get(key);
 if(hit&&Date.now()-hit.at<15*60*1000)return reply(res,200,{...hit.value,cached:true});
 let promise=inflight.get(key);
 if(!promise){
  promise=publicPages.queryPublicPages(hotel,stay).finally(()=>inflight.delete(key));
  inflight.set(key,promise);
 }
 try{
  const data=await promise;
  cache.set(key,{at:Date.now(),value:data});
  return reply(res,200,data);
 }catch{
  return reply(res,502,{status:'PUBLIC_PAGE_PILOT_UNAVAILABLE',providers:[],live:false});
 }
}
module.exports=handler;
