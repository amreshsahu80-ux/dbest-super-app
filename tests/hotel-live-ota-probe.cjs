'use strict';
/* One property, one future stay, read-only live Google Hotels B2C diagnostic.
   No login, bypass, bulk crawling or fake prices. */
(async()=>{
 const google=require('./google-hotels-browser.cjs');
 const hotel={id:'HOTEL-NANDAN-GHY',hotel:'Hotel Nandan',city:'Guwahati'};
 const stay={checkIn:'2026-11-15',checkOut:'2026-11-16',adults:2,rooms:1};
 const begin=Date.now();
 try{
  const r=await google.getPublicGoogleRates(hotel,stay);
  console.log('DBEST_GOOGLE_LIVE_DIAGNOSTIC',JSON.stringify({
   status:r.status,elapsedSec:Math.round((Date.now()-begin)/1000),
   verifiedStay:r.stay||null,providerCount:r.providers?.length||0,
   providers:(r.providers||[]).map(p=>({provider:p.provider,pricePerNight:p.pricePerNight,currency:p.currency}))
  }));
 }catch(e){
  console.log('DBEST_GOOGLE_LIVE_DIAGNOSTIC',JSON.stringify({
   status:'READER_EXCEPTION',elapsedSec:Math.round((Date.now()-begin)/1000),
   errorName:e?.name||'Error',errorMessage:String(e?.message||'').slice(0,180)
  }));
  process.exitCode=1;
 }
})();
