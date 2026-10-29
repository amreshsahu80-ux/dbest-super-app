'use strict';
/*
 * Isolated DBest Hotel public-OTA reference adapter.
 * DataForSEO Google Hotels supplies publicly visible B2C booking-site prices.
 * Never pass supplier net rates, Owner markup, credentials or internal notes.
 * All paid lookup requests are DISABLED by default until both a provider account
 * with a spending cap and permission for commercial price display are confirmed.
 */
const SEARCH_URL='https://api.dataforseo.com/v3/business_data/google/hotel_searches/live';
const INFO_URL='https://api.dataforseo.com/v3/business_data/google/hotel_info/live/advanced';

function simpleName(name){
 return String(name||'').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
function hotelMatch(items,wanted){
 const key=simpleName(wanted);
 if(key.length<5)return null;
 const matches=(Array.isArray(items)?items:[]).filter(x=>
   x&&x.type==='hotel_search_item'&&typeof x.hotel_identifier==='string'&&
   x.hotel_identifier.length>=12&&simpleName(x.title)===key
 );
 // Do not guess for ambiguous hotel names: only one exact named match qualifies.
 return matches.length===1?matches[0]:null;
}
function httpsLink(url){
 if(typeof url!=='string'||url.length>1600)return null;
 try{const u=new URL(url);return u.protocol==='https:'&&u.hostname&&!u.username&&!u.password?u.href:null}catch{return null}
}
function extractOffers(prices,requested){
 if(!prices||prices.currency!=='INR'||String(prices.check_in||'').slice(0,10)!==requested.checkIn||
 String(prices.check_out||'').slice(0,10)!==requested.checkOut||
 Number(prices.visitors)!==requested.adults)return [];
 const seen=new Map();
 for(const x of Array.isArray(prices.items)?prices.items:[]){
  if(!x||x.type!=='hotel_info_price'||x.official_site===true||x.currency!=='INR'||
    !Number.isFinite(Number(x.price))||Number(x.price)<=0)continue;
  const provider=String(x.title||'').trim().slice(0,65);
  if(!/^[\p{L}\p{N}][\p{L}\p{N} .,+'-]{1,64}$/u.test(provider))continue;
  const url=httpsLink(x.url);
  const key=provider.toLowerCase();
  const offer={
   provider,pricePerNight:Number(x.price),currency:'INR',url,
   source:'GOOGLE_HOTELS_PUBLIC_B2C',
   room:'Room/category and taxes to verify at OTA',
   cancellation:'Confirm on booking site'
  };
  if(!seen.has(key)||offer.pricePerNight<seen.get(key).pricePerNight)seen.set(key,offer);
 }
 return [...seen.values()].sort((a,b)=>a.pricePerNight-b.pricePerNight).slice(0,12);
}
function parseDataForSEO(json){
 if(!json||json.status_code!==20000||!Array.isArray(json.tasks)||json.tasks.length!==1)
  throw Error('PROVIDER_BAD_RESULT');
 const task=json.tasks[0];
 if(task.status_code!==20000||!Array.isArray(task.result)||!task.result.length)
  throw Error('PROVIDER_TASK_UNAVAILABLE');
 return task.result[0];
}
function checkedDate(s){
 return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
  Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
}
function validateStay(q){
 const checkIn=String(q.checkIn||''),checkOut=String(q.checkOut||'');
 const adults=Number(q.adults),rooms=Number(q.rooms||1);
 if(!checkedDate(checkIn)||!checkedDate(checkOut))throw Error('INVALID_DATES');
 const start=Date.parse(checkIn),end=Date.parse(checkOut),now=Date.now();
 if(start<Date.UTC(new Date(now).getUTCFullYear(),new Date(now).getUTCMonth(),new Date(now).getUTCDate())||
   end<=start||end-start>30*86400000)throw Error('INVALID_STAY_LENGTH');
 if(!Number.isInteger(adults)||adults<1||adults>6||rooms!==1)throw Error('UNSUPPORTED_OCCUPANCY');
 return {checkIn,checkOut,adults,rooms};
}
function configured(env){
 if(env.HOTEL_OTA_LIVE_ENABLED!=='true')return 'PAID_LOOKUPS_DISABLED';
 if(env.HOTEL_OTA_SPENDING_LIMIT_CONFIRMED!=='true')return 'SPENDING_LIMIT_NOT_CONFIRMED';
 if(env.HOTEL_OTA_COMMERCIAL_DISPLAY_AUTHORIZED!=='true')return 'PUBLIC_DISPLAY_PERMISSION_NOT_CONFIRMED';
 if(!env.DATAFORSEO_LOGIN||!env.DATAFORSEO_PASSWORD)return 'PROVIDER_CREDENTIALS_MISSING';
 return 'READY';
}
async function liveData(url,task,env,fetchImpl){
 const auth=Buffer.from(env.DATAFORSEO_LOGIN+':'+env.DATAFORSEO_PASSWORD).toString('base64');
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),13500);
 try{
  const r=await fetchImpl(url,{method:'POST',
   headers:{'Content-Type':'application/json','Authorization':'Basic '+auth},
   body:JSON.stringify([task]),signal:controller.signal});
  if(!r.ok)throw Error('PROVIDER_HTTP_ERROR');
  return parseDataForSEO(await r.json());
 }finally{clearTimeout(timer)}
}
async function getPublicB2C(hotel,q,env,fetchImpl=fetch){
 const status=configured(env);
 if(status!=='READY')return {status,providers:[],live:false};
 const stay=validateStay(q);
 if(!hotel||!hotel.hotel||!hotel.city)throw Error('INVALID_HOTEL');
 // Country-level location avoids relying on unverified city codes. Keyword
 // includes exact hotel name + city and match must be unique + exact.
 const common={location_code:2356,language_code:'en',check_in:stay.checkIn,
  check_out:stay.checkOut,currency:'INR',adults:stay.adults};
 const search=await liveData(SEARCH_URL,{...common,
  keyword:String(hotel.hotel).slice(0,110)+' '+String(hotel.city).slice(0,65),
  depth:10,search_this_area:false},env,fetchImpl);
 const matched=hotelMatch(search.items,hotel.hotel);
 if(!matched)return {status:'PROPERTY_NOT_EXACTLY_MATCHED',providers:[],live:false};
 const info=await liveData(INFO_URL,{...common,hotel_identifier:matched.hotel_identifier},env,fetchImpl);
 const offers=extractOffers(info.prices,stay);
 return {
  status:offers.length?'PUBLIC_B2C_OFFERS_FOUND':'NO_PUBLIC_B2C_OFFERS',
  providers:offers,live:offers.length>0,hotelName:hotel.hotel,
  stay,checkedAt:new Date().toISOString(),
  priceBasis:'OTA quoted INR per night for selected dates; room, taxes and checkout total may differ',
  canClaimSavings:false,
  note:'Public Google Hotels OTA offers, not post-login, agent/B2B or confirmed DBest booking inventory.'
 };
}
module.exports={simpleName,hotelMatch,extractOffers,validateStay,configured,parseDataForSEO,getPublicB2C,httpsLink};
