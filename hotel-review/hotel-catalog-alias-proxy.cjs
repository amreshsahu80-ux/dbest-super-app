'use strict';
/*
 * Isolated DBest Hotel catalogue compatibility adapter.  The private, compiled
 * supplier snapshot stays unchanged; this adapter accepts ONLY the dedicated
 * hotel preview alias in addition to the already approved hotel preview hosts.
 * No production DBest main website, broad wildcard, or arbitrary Host accepted.
 *
 * Deploy as api/hotel-catalog.js alongside the content-addressed compiled
 * original at api/hotel-catalog-original.js (same directory). Other isolated
 * OTA endpoints requiring ./hotel-catalog.js receive the expanded host matcher.
 */
const original=require('./hotel-catalog-original.js');
const BUILT_IN=/^dbest-hotel-review-preview(?:-[a-z0-9-]+)?\.vercel\.app$/;
const EXACT_ALIAS='dbest-hotel-photo-preview.vercel.app';
function validHost(host){
 const h=String(host||'').trim().toLowerCase();
 return h===EXACT_ALIAS||BUILT_IN.test(h);
}
function handler(req,res){
 const h=String(req.headers?.host||'').trim().toLowerCase();
 if(!validHost(h)){
  res.statusCode=403;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','private, no-store');
  return res.end(JSON.stringify({error:'isolated_pilot_only'}));
 }
 if(h!==EXACT_ALIAS)return original(req,res);
 // Original compiled catalogue's old host allowlist is immutable because its
 // snapshot contains private supplier data and must not be rebuilt from source.
 // Preserve authorization/cookies/query exactly, altering ONLY the internal
 // Host check passed to that same compiled handler.
 return original({...req,headers:{...req.headers,host:'dbest-hotel-review-preview.vercel.app'}},res);
}
module.exports=handler;
module.exports._publicHotelById=original._publicHotelById;
module.exports._test={...original._test,validHost};
