'use strict';
/*
 * ISOLATED HOTEL SNAPSHOT ENDPOINT.
 * Vercel deployment ONLY: __PRIVATE_SNAPSHOT__ is replaced in memory by the
 * deployment builder. Never commit supplier data or expose its raw source.
 * No public supplier prices or OTA data are invented.
 */
const DATA=__PRIVATE_SNAPSHOT__;
const auth=require('./hotel-review-owner-auth.js');
function respond(res,status,data){
 res.statusCode=status;
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Vary','Cookie');
 return res.end(JSON.stringify(data));
}
// The Owner selects the markup in the separate Vercel hotel's protected
// environment. No default is assumed: missing configuration must never
// expose unmarked supplier net prices to anonymous guests.
function ownerMarkup(env){
 const raw=String(env.HOTEL_REVIEW_MARKUP_PERCENT??'').trim();
 if(!/^(?:\d{1,2})(?:\.\d)?$/.test(raw))return null;
 const pct=Number(raw);
 return pct>=0&&pct<=50&&pct*2===Math.round(pct*2)?pct:null;
}
function taxStatus(value){
 const s=String(value||'').toLowerCase();
 if(/(?:gst|tax(?:es)?).{0,24}(?:extra|additional|excluded|exclusive|not included|separate)|(?:extra|exclusive|excluding).{0,24}(?:gst|tax(?:es)?)/.test(s))return 'TAX_ADDITIONAL';
 if(/(?:gst|tax(?:es)?).{0,24}(?:included|inclusive)|(?:included|inclusive).{0,24}(?:gst|tax(?:es)?)/.test(s)&&
    !/(?:pending|not specified|unclear|subject|conflicts|except)/.test(s))return 'TAX_INCLUDED';
 return 'TAX_TERMS_UNCLEAR';
}
function publicText(v){
 // Preserve room and meal labels while excluding any embedded supplier amounts.
 return String(v||'').replace(/(?:₹|INR\s*)[\s,]*\d[\d,.]*/gi,'[amount withheld]').slice(0,125);
}
function pricedOffers(hotelId,offset,limit,env){
 const markupPct=ownerMarkup(env);
 if(markupPct===null)return {status:'OWNER_MARKUP_NOT_CONFIGURED',total:0,offers:[],availabilityVerified:false};
 const rows=DATA.rates.filter(r=>r.hotelId===hotelId&&
    r.commercialApproval==='AUTO_ACCEPTED_DBEST');
 const offers=rows.slice(offset,offset+limit).map(r=>{
   const usable=typeof r.amount==='number'&&Number.isFinite(r.amount)&&r.amount>0;
   return {
    room:publicText(r.room),occupancy:publicText(r.occupancy),meal:publicText(r.meal),
    price:usable?Math.round(r.amount*(1+markupPct/100)*100)/100:null,
    currency:'INR',taxStatus:taxStatus(r.taxes),
    validity:'Supplier tariff conditions apply',commercialStatus:'CONTRACTED_FINAL',
    availability:'CHECK_BEFORE_CONFIRMING'
   };
 });
 return {status:'CONTRACTED_SUPPLIER_RATES_WITH_OWNER_MARKUP',total:rows.length,offset,limit,
  offers,availabilityVerified:false};
}
function sellingSummaries(env){
 const pct=ownerMarkup(env);
 if(pct===null)return {status:'OWNER_MARKUP_NOT_CONFIGURED',hotels:[],liveOTAConnected:false};
 const choices=new Map(),valid=new Set(DATA.publicHotels.map(h=>h.id));
 for(const r of DATA.rates){
  if(!valid.has(r.hotelId)||r.commercialApproval!=='AUTO_ACCEPTED_DBEST'||
     typeof r.amount!=='number'||!Number.isFinite(r.amount)||r.amount<=0)continue;
  const old=choices.get(r.hotelId);
  if(!old||r.amount<old.amount)choices.set(r.hotelId,r);
 }
 const hotels=[...choices.entries()].map(([id,r])=>({
  id,price:Math.round(r.amount*(1+pct/100)*100)/100,currency:'INR',
  room:publicText(r.room),occupancy:publicText(r.occupancy),
  taxStatus:taxStatus(r.taxes),
  label:'RECEIVED_CONTRACTED_RATE_REFERENCE',
  availability:'RECONFIRM_FOR_DATES',
  otaB2CPrice:null
 }));
 return {status:'DBEST_CONTRACTED_SELLING_REFERENCES',hotels,liveOTAConnected:false,
  note:'Lowest received contracted rate reference, not a selected-date all-in hotel quote. Room, seasonal, tax and occupancy conditions apply.'};
}
function validHost(host){
 return /^(?:dbest-hotel-review-preview)(?:-[a-z0-9-]+)?\.vercel\.app$/.test(String(host||''));
}
async function handler(req,res){
 if(!validHost(req.headers?.host))return respond(res,403,{error:'isolated_pilot_only'});
 if(req.method!=='GET')return respond(res,405,{error:'method_not_allowed'});
 const q=Object.fromEntries(new URL(req.url||'/', 'https://internal.test').searchParams.entries());
 if(q.view==='offers-summary'){
   return respond(res,200,sellingSummaries(process.env));
 }
 if(q.view==='offers'){
   const hotelId=String(q.hotelId||'').trim().slice(0,135);
   if(!hotelId||!DATA.publicHotels.some(h=>h.id===hotelId))
     return respond(res,404,{error:'hotel_not_found'});
   const offset=Math.min(Math.max(0,Number.parseInt(q.offset,10)||0),100000);
   const limit=Math.min(Math.max(1,Number.parseInt(q.limit,10)||25),100);
   return respond(res,200,{hotelId, ...pricedOffers(hotelId,offset,limit,process.env),
     liveOTAConnected:false,
     note:'Accepted contracted tariffs with configured Owner markup. Not a live inventory check or an all-in comparison where additional taxes apply.'});
 }
 if(q.view==='owner'){
   const token=auth._test.cookieToken(req);
   let ok=false;try{ok=await auth._test.validateOwner(process.env,token)}catch(e){}
   if(!ok)return respond(res,401,{error:'owner_session_required'});
   const search=String(q.search||'').toLowerCase().slice(0,100);
   const all=search?DATA.rates.filter(r=>(r.hotel+' '+r.hotelId+' '+r.room).toLowerCase().includes(search)):DATA.rates;
   const offset=Math.min(Math.max(0,Number.parseInt(q.offset,10)||0),100000);
   const limit=Math.min(Math.max(1,Number.parseInt(q.limit,10)||100),200);
   return respond(res,200,{view:'OWNER_ONLY',total:all.length,offset,limit,
    rows:all.slice(offset,offset+limit),stats:DATA.stats,
    ownerSellingMarkup:ownerMarkup(process.env),
    ownerMarkupStorage:'ISOLATED_VERCEL_PROJECT_ENVIRONMENT',
    notes:'Received supplier quotes commercially final; room availability remains separate. Supplier rates never returned to guest requests.'});
 }
 return respond(res,200,{status:'OUTREACH_SNAPSHOT_NOT_LIVE_INVENTORY',
  hotels:DATA.publicHotels,stats:DATA.stats,snapshotGeneratedAt:DATA.snapshotGeneratedAt||null,liveOTAConnected:false,
  note:'Direct bookings require hotel confirmation. Live OTA rates and savings are not connected.'});
}
module.exports=handler;
module.exports._test={validHost,ownerMarkup,taxStatus,pricedOffers,sellingSummaries};
