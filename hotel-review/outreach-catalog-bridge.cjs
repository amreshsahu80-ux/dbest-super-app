'use strict';
/* Pure source bridge. Runs in a private Vercel function; do not publish source
 * snapshots containing B2B rates as a static public file or repository asset.
 * A source quotation is commercially auto-accepted, not a confirmed reservation.
 */
function trim(v){return String(v??'').trim();}
function rowObj(header,row){const obj={};header.forEach((h,i)=>{obj[trim(h)]=row[i]??''});return obj}
function money(v){const s=trim(v).replace(/,/g,'').replace(/[₹\s]/g,'');return /^\d+(?:\.\d{1,2})?$/.test(s)&&Number(s)>0?Number(s):null}
function isTaxConfirmed(v){
 const t=trim(v).toLowerCase();
 return /\b(all[\s-]?in|tax(?:es)? included|gst included|inclusive of gst)\b/.test(t)&&
  !/\b(except|subject|pending|not specified|unclear|applicable extra)\b/.test(t);
}
function getRateObjects(header,rows){
 if(!['Rate ID','Hotel ID','Hotel Name','Room Category','Rate INR'].every(k=>header.includes(k)))
 throw Error('Expected outreach Rate History headers');
 const seen=new Set(),output=[];
 for(const raw of rows){
  const r=rowObj(header,raw),id=trim(r['Rate ID']),hotelId=trim(r['Hotel ID']);
  if(!id||!hotelId||!trim(r['Hotel Name'])||seen.has(id))continue;
  seen.add(id);
  output.push({
    id:id.slice(0,110),hotelId:hotelId.slice(0,135),hotel:trim(r['Hotel Name']).slice(0,180),
    room:trim(r['Room Category']).slice(0,140),occupancy:trim(r['Occupancy']).slice(0,50),
    amount:money(r['Rate INR']),taxes:trim(r['Taxes']).slice(0,250),
    meal:trim(r['Meal Plan']).slice(0,150),validity:trim(r['Validity']).slice(0,200),
    cancellation:trim(r['Cancellation']).slice(0,350),
    sourceRef:trim(r['Email Message ID']).slice(0,130),
    receivedAt:trim(r['Date Received']).slice(0,50),
    review:trim(r['Confidence / Review Status']).slice(0,200),
    commercialApproval:'AUTO_ACCEPTED_DBEST',
    taxIncludedConfirmed:isTaxConfirmed(r['Taxes']),
    bookable:false,publicPriceAuthorized:false
  });
 }
 return output;
}
function getHotels(header,rows){
 if(!['Hotel ID','Hotel Name','City'].every(k=>header.includes(k)))throw Error('Expected Hotel Master headers');
 const byId=new Map();
 for(const raw of rows){
  const r=rowObj(header,raw),id=trim(r['Hotel ID']);if(!id||byId.has(id))continue;
  byId.set(id,{
   id:id.slice(0,135),name:trim(r['Hotel Name']).slice(0,180),
   city:trim(r['City']).slice(0,90),state:trim(r['State / UT']).slice(0,90),
   country:'India',status:trim(r['Outreach Status']).slice(0,200)
  });
 }
 return byId;
}
function build(headerHotels,hotelRows,headerRates,rateRows){
 const byId=getHotels(headerHotels,hotelRows),rates=getRateObjects(headerRates,rateRows);
 const byHotel=new Map();
 for(const r of rates){
  const o=byHotel.get(r.hotelId)||{total:0,numeric:0,rooms:new Set()};
  o.total++;if(r.amount!==null)o.numeric++;if(r.room)o.rooms.add(r.room);
  byHotel.set(r.hotelId,o);
 }
 const publicHotels=[];
 for(const [id,info] of byId){
  const count=byHotel.get(id);
  if(!count||!info.name||!info.city)continue;
  publicHotels.push({id,hotel:info.name,city:info.city,state:info.state,
    rateCount:count.total,numericQuoteCount:count.numeric,rooms:[...count.rooms].slice(0,12),
    rateStatus:'Supplier quotation received; availability and final taxes on request'});
 }
 publicHotels.sort((a,b)=>a.city.localeCompare(b.city)||a.hotel.localeCompare(b.hotel));
 return {rates,publicHotels,stats:{totalRates:rates.length,hotelsWithRates:publicHotels.length,
  numericRates:rates.filter(x=>x.amount!==null).length,publicBookable:0,liveOTARates:0}};
}
function guestView(snapshot){return {
 status:'SOURCE_SNAPSHOT_NOT_LIVE_INVENTORY',
 hotels:snapshot.publicHotels,stats:snapshot.stats,
 liveOTAConnected:false,availabilityVerified:false,visibleSavings:false,
 note:'DBest outreach quotations are auto-accepted internally. Prices are omitted until an authorized and tax-complete customer rate can be displayed.'
}}
module.exports={build,getRateObjects,getHotels,guestView,isTaxConfirmed,money};
