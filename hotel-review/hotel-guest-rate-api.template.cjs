'use strict';
/**
 * Read-only DBest hotel guest-occupancy tariff adapter.
 * Uses ONLY the public, marked-up supplier selling rates already served
 * by the isolated catalogue. Never exposes confidential supplier net.
 * A matched occupancy is NOT a booked stay, available room or all-in total.
 * Deploy this file as api/hotel-guest-rate.js with requires relative to api/.
 */
const catalog=require('./hotel-catalog.js');
const HOST=/^(?:dbest-hotel-photo-preview|dbest-hotel-review-preview(?:-[a-z0-9-]+)?)\.vercel\.app$/;
const MAX_IDS=12;
function output(res,code,value){
 res.statusCode=code;
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.end(JSON.stringify(value));
}
function occupancyMatch(offer,adults){
 const text=String(offer?.occupancy||'').trim().toLowerCase();
 if(/extra|per person|child|triple|quad|family/.test(text))return false;
 if(adults===2)return /\bdouble\b|\btwin\b|\b2\s*(adults|persons|pax|guests)\b/.test(text);
 if(adults===1)return /\bsingle\b|\b1\s*(adult|person|pax|guest)\b/.test(text);
 return false;
}
function choose(offers,adults,id){
 const match=(Array.isArray(offers)?offers:[]).filter(o=>
  o&&occupancyMatch(o,adults)&&Number.isFinite(o.price)&&o.price>0&&o.currency==='INR'&&
  o.room&&!/extra person/i.test(o.room)
 ).sort((a,b)=>a.price-b.price)[0];
 if(!match)return {id,status:'NO_MATCHED_OCCUPANCY_REFERENCE'};
 return {id,status:'RECEIVED_GUEST_OCCUPANCY_SELLING_REFERENCE',
  pricePerNight:match.price,currency:'INR',room:String(match.room).slice(0,130),
  occupancy:String(match.occupancy).slice(0,100),meal:String(match.meal||'').slice(0,140),
  taxStatus:String(match.taxStatus||'TAX_TERMS_UNCLEAR'),availability:'RECONFIRM_FOR_DATES',
  note:'Contracted selling reference for guest occupancy; date availability and full taxes unconfirmed'};
}
function catalogOffer(id,host){
 return new Promise((resolve,reject)=>{
  let finished=false;
  const res={
   statusCode:200,
   setHeader(){},
   end(chunk){if(finished)return;finished=true;
    try{const raw=JSON.parse(String(chunk||'{}'));
     if(this.statusCode!==200||!Array.isArray(raw.offers))return resolve([]);
     resolve(raw.offers);
    }catch(e){reject(e)}
   }
  };
  const req={method:'GET',headers:{host},url:'/api/hotel-catalog?view=offers&hotelId='+encodeURIComponent(id)};
  try{Promise.resolve(catalog(req,res)).catch(reject)}catch(e){reject(e)}
 });
}
async function handler(req,res){
 const host=String(req.headers?.host||'').trim().toLowerCase().split(':')[0];
 if(!HOST.test(host))return output(res,403,{status:'ISOLATED_PREVIEW_ONLY'});
 if(req.method!=='GET')return output(res,405,{status:'METHOD_NOT_ALLOWED'});
 const query=new URL(req.url||'/', 'https://internal.invalid').searchParams;
 const adults=Number(query.get('adults')),rooms=Number(query.get('rooms'));
 if(![1,2].includes(adults)||rooms!==1)return output(res,422,{status:'OCCUPANCY_UNSUPPORTED'});
 const ids=String(query.get('hotelIds')||'').split(',').map(x=>x.trim()).filter(Boolean);
 if(ids.length<1||ids.length>MAX_IDS||ids.some(id=>!/^[A-Za-z0-9_-]{3,135}$/.test(id)))
  return output(res,422,{status:'INVALID_HOTEL_LIST'});
 const unique=[...new Set(ids)];
 const hotels=await Promise.all(unique.map(async id=>{
  try{return choose(await catalogOffer(id,host),adults,id)}
  catch{return {id,status:'RATE_TEMPORARILY_UNAVAILABLE'}}
 }));
 return output(res,200,{status:'DBEST_OCCUPANCY_REFERENCES',adults,rooms,hotels,
  note:'Marked-up received hotel tariffs for occupancy, not selected-date guaranteed inventory, taxes or final booking price'});
}
module.exports=handler;
module.exports._test={occupancyMatch,choose};
