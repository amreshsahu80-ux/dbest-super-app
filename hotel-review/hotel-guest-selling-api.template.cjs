'use strict';
/**
 * Customer-facing occupancy-matched DBest selling-reference lookup.
 * Never returns confidential supplier net, owner markup, or room inventory.
 * Read-only guest quote REFERENCE, not an exact-date confirmed booking.
 * Deploy as api/hotel-guest-rate.js in the isolated hotel project only.
 */
const catalog=require('./hotel-catalog.js');
function respond(res,status,body){
 res.statusCode=status;
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.end(JSON.stringify(body));
}
function bestOffer(offers,adults){
 const match=adults===2?/(?:\bdouble\b|\btwin\b|single\s*\/\s*double|double\s*\/\s*single)/i:
  /(?:\bsingle\b|single\s*\/\s*double)/i;
 const valid=(offers||[]).filter(o=>Number.isFinite(o.price)&&o.price>0&&
  match.test(String(o.occupancy||''))&&
  !/extra person|extra bed|child|supplement|add-on/i.test(String(o.room||'')));
 valid.sort((a,b)=>a.price-b.price);
 const o=valid[0];
 return o?{pricePerNight:o.price,room:o.room,occupancy:o.occupancy,meal:o.meal,
  taxStatus:o.taxStatus,validity:o.validity,status:'RECEIVED_GUEST_OCCUPANCY_SELLING_REFERENCE',
  dateConfirmed:false,inventoryConfirmed:false,allInTotalVerified:false}:null;
}
function handler(req,res){
 if(!catalog._test.validHost(req.headers?.host))return respond(res,403,{status:'ISOLATED_PREVIEW_ONLY'});
 if(req.method!=='GET')return respond(res,405,{status:'METHOD_NOT_ALLOWED'});
 const q=new URL(req.url||'/', 'https://internal.test').searchParams;
 const adults=Number(q.get('adults')),rooms=Number(q.get('rooms'));
 if(![1,2].includes(adults)||rooms!==1)return respond(res,422,{status:'UNSUPPORTED_OCCUPANCY',hotels:[]});
 const ids=String(q.get('hotelIds')||'').split(',').map(s=>s.trim()).filter(Boolean);
 if(ids.length<1||ids.length>12||ids.some(id=>id.length>135))
  return respond(res,422,{status:'INVALID_HOTEL_IDS',hotels:[]});
 const hotels=Array.from(new Set(ids)).map(id=>{
  if(!catalog._publicHotelById(id))return {id,status:'UNKNOWN_HOTEL'};
  const data=catalog._test.pricedOffers(id,0,100,process.env);
  if(data.status==='OWNER_MARKUP_NOT_CONFIGURED')return {id,status:'OWNER_MARKUP_NOT_CONFIGURED'};
  const matching=bestOffer(data.offers,adults);
  return matching?{id,...matching}:{id,status:'NO_EXACT_GUEST_OCCUPANCY_REFERENCE'};
 });
 return respond(res,200,{status:'DBEST_OCCUPANCY_REFERENCES',adults,rooms,hotels,
  note:'Supplier selling reference by quoted occupancy; final date, room, meal, taxes and availability must be confirmed.'});
}
module.exports=handler;
module.exports._test={bestOffer};
