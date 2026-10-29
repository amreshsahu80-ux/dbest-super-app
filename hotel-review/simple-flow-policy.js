/* DBest Hotel: source-to-catalog and matched live OTA pricing rules.
 * Isolated pilot. Pure business logic; no credentials, network or payouts.
 * Auto-accepting a commercial quote NEVER means the room is instantly bookable.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.DBestHotelFlow=api;})(typeof window==='object'?window:undefined,function(){
'use strict';
function validMoney(v){return typeof v==='number'&&Number.isFinite(v)&&v>0&&v<100000000;}
function markup(base,pct){if(!validMoney(base)||!Number.isFinite(pct)||pct<0||pct>50)throw Error('Invalid owner markup or supplier rate');return Math.round(base*(1+pct/100)*100)/100;}
function autoAccept(rates){
 if(!Array.isArray(rates))throw Error('Expected supplier rates');
 return rates.map(r=>({
  rateId:String(r.id||'').trim(),hotelId:String(r.hotelId||'').trim(),hotel:String(r.hotel||'').trim(),
  room:String(r.room||'').trim(),occupancy:String(r.occupancy||'').trim(),
  supplierB2BAmount:validMoney(r.amount)?r.amount:null,
  meal:String(r.meal||'').trim(),taxes:String(r.taxes||'').trim(),
  validity:String(r.validity||'').trim(),cancellation:String(r.cancellation||'').trim(),
  sourceReference:String(r.sourceReference||'').trim(),sourceReview:String(r.sourceReview||'').trim(),
  approval:'AUTO_ACCEPTED_DBEST',availability:'RECONFIRM_WITH_HOTEL',
  bookable:false,supplierPricePrivate:true,
  customerPriceStatus:'REQUEST_FINAL_QUOTE'
 })).filter(r=>r.rateId&&r.hotelId&&r.hotel);
}
function hasConfirmedSupplierTotal(q){
 // Contracted tariffs are commercially accepted when received. Booking
 // confirmation is separate from rate publication and B2C comparisons.
 // Complete tax/date/room/distribution rights still govern comparable totals.
 return q && q.approval==='AUTO_ACCEPTED_DBEST' &&
  validMoney(q.taxInclusiveTotal) && q.taxIncluded===true &&
  q.validityConfirmed===true && q.redistributionAuthorized===true;
}
function isPublicB2C(q){
 // Never compare against wholesale, corporate, agent, B2B or net OTA rates.
 return q && q.audience==='PUBLIC_B2C' && q.sourceRateType==='SELL' &&
  q.authorizedFeed===true && q.redistributionAuthorized===true;
}
function sameStay(a,b){
 return String(a.hotelId||'')===String(b.hotelId||'') &&
  String(a.checkIn||'')===String(b.checkIn||'') &&
  String(a.checkOut||'')===String(b.checkOut||'') &&
  String(a.roomMappingId||'')!==''&&String(a.roomMappingId||'')===String(b.roomMappingId||'') &&
  Number(a.adults)===Number(b.adults)&&Number(a.rooms)===Number(b.rooms) &&
  String(a.meal||'').toLowerCase()===String(b.meal||'').toLowerCase() &&
  String(a.cancellationClass||'').toLowerCase()===String(b.cancellationClass||'').toLowerCase() &&
  a.currency==='INR'&&b.currency==='INR';
}
function comparableRate(dbest,ota,now=Date.now()){
 if(!hasConfirmedSupplierTotal(dbest)||!ota||!sameStay(dbest,ota))return false;
 if(!validMoney(ota.taxInclusiveTotal)||ota.taxIncluded!==true||
    !isPublicB2C(ota))return false;
 const stamp=Date.parse(String(ota.checkedAt||''));
 return Number.isFinite(stamp)&&stamp<=now+60000&&now-stamp<=15*60*1000;
}
function comparison(dbest,otas,now=Date.now()){
 if(!hasConfirmedSupplierTotal(dbest))return {dbest:null,otas:[],lowestOTA:null,savings:null,reason:'DBEST_QUOTE_NOT_CONFIRMED'};
 const matches=(Array.isArray(otas)?otas:[]).filter(q=>comparableRate(dbest,q,now))
   .map(q=>({platform:String(q.platform||'OTA'),price:q.taxInclusiveTotal,checkedAt:q.checkedAt}))
   .sort((a,b)=>a.price-b.price);
 if(!matches.length)return {dbest:dbest.taxInclusiveTotal,otas:[],lowestOTA:null,savings:null,reason:'NO_AUTHORIZED_COMPARABLE_LIVE_OTA'};
 return {dbest:dbest.taxInclusiveTotal,otas:matches,lowestOTA:matches[0].price,
  savings:Math.max(0,Math.round((matches[0].price-dbest.taxInclusiveTotal)*100)/100),
  reason:'LIVE_COMPARISON'};
}
function bookingRequest(data){
 if(!data||!data.hotel||!data.checkIn||!data.checkOut||!data.rooms||!data.adults)
  throw Error('Missing booking request details');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(data.checkIn)||!/^\d{4}-\d{2}-\d{2}$/.test(data.checkOut)||
   data.checkOut<=data.checkIn)throw Error('Invalid stay dates');
 const body=[
 'DBest Direct Hotel Booking Request (NOT yet confirmed)',
 'Property: '+String(data.hotel).slice(0,140),
 'Room: '+String(data.room||'To confirm').slice(0,140),
 'Check-in: '+data.checkIn,
 'Check-out: '+data.checkOut,
 'Adults: '+Number(data.adults),
 'Rooms: '+Number(data.rooms),
 'Meal plan: '+String(data.meal||'Confirm'),
 ...([['Guest name',data.contactName],['Contact mobile',data.contactPhone],['Contact email',data.contactEmail]]
  .filter(([,value])=>String(value||'').trim())
  .map(([label,value])=>label+': '+String(value).replace(/[\r\n\t\x00-\x1f]/g,' ').trim().slice(0,120))),
 'Please confirm room inventory, all taxes, final selling price, cancellation, payment and booking reference before collection.'
 ].join('\n');
 return {status:'REQUEST_ONLY_NOT_BOOKED',subject:'DBest hotel booking request - '+String(data.hotel).slice(0,90),body};
}
return Object.freeze({autoAccept,markup,hasConfirmedSupplierTotal,isPublicB2C,comparableRate,comparison,bookingRequest});
});