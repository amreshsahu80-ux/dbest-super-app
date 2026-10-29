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
function validHost(host){
 return /^(?:dbest-hotel-review-preview)(?:-[a-z0-9-]+)?\.vercel\.app$/.test(String(host||''));
}
async function handler(req,res){
 if(!validHost(req.headers?.host))return respond(res,403,{error:'isolated_pilot_only'});
 if(req.method!=='GET')return respond(res,405,{error:'method_not_allowed'});
 const q=Object.fromEntries(new URL(req.url||'/', 'https://internal.test').searchParams.entries());
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
    notes:'Commercial quotes auto-accepted; none is automatically bookable. B2B supplier prices never returned to guest requests.'});
 }
 return respond(res,200,{status:'OUTREACH_SNAPSHOT_NOT_LIVE_INVENTORY',
  hotels:DATA.publicHotels,stats:DATA.stats,liveOTAConnected:false,
  note:'Direct bookings require hotel confirmation. Live OTA rates and savings are not connected.'});
}
module.exports=handler;
module.exports._test={validHost};
