'use strict';
/*
 * DBest free/no-API-key public B2C page feasibility pilot.
 * On-demand two known public property pages for ONE verified pilot hotel.
 * No CAPTCHA / login / anti-bot bypass, no scraping of wholesale accounts,
 * no blind date-insensitive price extraction, and no paid provider calls.
 * A page containing a price without the *same offer's check-in/out* is rejected.
 */
const SOURCES=Object.freeze({
 'HOTEL-NANDAN-GHY':[
  {provider:'MakeMyTrip',base:'https://www.makemytrip.com/hotels/hotel_nandan-details-guwahati.html'},
  {provider:'Goibibo',base:'https://www.goibibo.com/hotels/nandan-hotel-in-guwahati-4881108944297428537/'}
 ]
});
const LIMIT=1200000;
const ymd=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''))?s:'';
const mmddyyyy=s=>s.slice(5,7)+s.slice(8,10)+s.slice(0,4);
function pageUrl(source,stay){
 const u=new URL(source.base);
 if(source.provider==='MakeMyTrip'){
  u.searchParams.set('checkin',mmddyyyy(stay.checkIn));
  u.searchParams.set('checkout',mmddyyyy(stay.checkOut));
  u.searchParams.set('roomStayQualifier',String(stay.adults)+'e0e');
  u.searchParams.set('pwa_ssr','true');
 }else{
  u.searchParams.set('checkin',stay.checkIn.replace(/-/g,''));
  u.searchParams.set('checkout',stay.checkOut.replace(/-/g,''));
 }
 return u.href;
}
function dateMatches(value,wanted){
 if(typeof value!=='string')return false;
 return value.slice(0,10)===wanted || value===mmddyyyy(wanted) || value.replace(/\D/g,'')===wanted.replace(/-/g,'');
}
function validNightlyOffer(offer,stay){
 if(!offer||typeof offer!=='object'||Array.isArray(offer))return null;
 const entry=offer.checkinDate||offer.checkIn||offer.check_in||offer.arrivalDate||offer.startDate;
 const exit=offer.checkoutDate||offer.checkOut||offer.check_out||offer.departureDate||offer.endDate;
 if(!dateMatches(entry,stay.checkIn)||!dateMatches(exit,stay.checkOut))return null;
 const guests=offer.adults||offer.numAdults||offer.numberOfAdults;
 if(guests!==undefined&&Number(guests)!==stay.adults)return null;
 const rooms=offer.rooms||offer.numberOfRooms;
 if(rooms!==undefined&&Number(rooms)!==1)return null;
 const basis=String(offer.priceBasis||offer.unitText||offer.unitCode||'').toLowerCase();
 if(!/per.?night|nightly|per.?room.?night|night/.test(basis))return null;
 const unit=offer.priceSpecification&&typeof offer.priceSpecification==='object'
  ?offer.priceSpecification:offer;
 const currency=String(unit.priceCurrency||unit.currency||offer.priceCurrency||'');
 if(currency!=='INR')return null;
 const price=Number(unit.pricePerNight||unit.price||offer.pricePerNight||offer.price);
 if(!Number.isFinite(price)||price<=0||price>1000000)return null;
 return {pricePerNight:price,currency:'INR',room:String(offer.roomName||'Room/category to verify at OTA').slice(0,100)};
}
function fromStructuredHtml(html,stay){
 if(!/hotel\s*nandan/i.test(html))return null;
 const matches=[...html.matchAll(/<script\b[^>]*type\s*=\s*['"]application\/ld\+json['"][^>]*>([\s\S]*?)<\/script\s*>/gi)].slice(0,40);
 let checked=0;
 function visit(value,depth){
  if(depth>8||checked++>1500||!value||typeof value!=='object')return null;
  if(Array.isArray(value)){for(const child of value){const match=visit(child,depth+1);if(match)return match}return null}
  const direct=validNightlyOffer(value,stay);
  if(direct)return direct;
  for(const [key,child] of Object.entries(value)){
   if(['offers','makesOffer','@graph','rooms','itemListElement','hasOfferCatalog'].includes(key)){
    const match=visit(child,depth+1);if(match)return match;
   }
  }
  return null;
 }
 for(const match of matches){
  try{const obj=JSON.parse(match[1]);const price=visit(obj,0);if(price)return price}catch{}
 }
 return null;
}
async function inspect(source,stay,fetchImpl=fetch){
 const url=pageUrl(source,stay);
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),7000);
 try{
  const resp=await fetchImpl(url,{
   method:'GET',redirect:'manual',
   headers:{Accept:'text/html'},
   signal:controller.signal
  });
  if(!resp.ok)return {provider:source.provider,status:resp.status>=300&&resp.status<400?'SOURCE_REDIRECTED':'SOURCE_HTTP_'+resp.status,url};
  if(!String(resp.headers.get('content-type')||'').toLowerCase().includes('text/html'))
   return {provider:source.provider,status:'NON_HTML_SOURCE',url};
  const doc=await resp.text();
  if(doc.length>LIMIT)return {provider:source.provider,status:'PAGE_TOO_LARGE',url};
  if(/captcha|verify you are human|access denied/i.test(doc.slice(0,10000)))
   return {provider:source.provider,status:'SOURCE_ACCESS_RESTRICTED',url};
  const price=fromStructuredHtml(doc,stay);
  if(!price)return {provider:source.provider,status:'NO_VERIFIED_STAY_SPECIFIC_OFFER',url};
  return {provider:source.provider,status:'DATE_MATCHED_PUBLIC_OFFER',url,...price};
 }catch(e){
  return {provider:source.provider,status:e?.name==='AbortError'?'SOURCE_TIMEOUT':'SOURCE_UNAVAILABLE',url};
 }finally{clearTimeout(timeout)}
}
async function queryPublicPages(hotel,stay,fetchImpl=fetch){
 if(!hotel||hotel.hotel!=='Hotel Nandan'||hotel.city!=='Guwahati'||
  !SOURCES[hotel.id])return {status:'PUBLIC_PAGE_PILOT_NOT_MAPPED',providers:[],live:false};
 if(!ymd(stay.checkIn)||!ymd(stay.checkOut)||!Number.isInteger(stay.adults)||stay.rooms!==1)
  throw Error('INVALID_STAY');
 const observations=await Promise.all(SOURCES[hotel.id].map(source=>inspect(source,stay,fetchImpl)));
 const checkedAt=new Date().toISOString();
 const providers=observations.filter(x=>x.status==='DATE_MATCHED_PUBLIC_OFFER').map(x=>({
  provider:x.provider,pricePerNight:x.pricePerNight,currency:'INR',url:x.url,
  source:'PUBLIC_PROPERTY_PAGE_STAY_MATCHED',room:x.room,
  cancellation:'Verify on OTA',checkedAt
 }));
 return {status:providers.length?'PUBLIC_PAGE_OFFERS_FOUND':'NO_VERIFIED_PUBLIC_PAGE_OFFERS',
  providers,live:providers.length>0,checkedAt,stay,canClaimSavings:false,
  sourceStatus:observations.map(({provider,status,url})=>({provider,status,url})),
  priceBasis:'Only dated, per-night, INR, guest-matched structured offers shown; room and taxes not verified',
  note:'No paid pricing API. No booked inventory or verified savings.'};
}
module.exports={SOURCES,pageUrl,dateMatches,validNightlyOffer,fromStructuredHtml,inspect,queryPublicPages};
