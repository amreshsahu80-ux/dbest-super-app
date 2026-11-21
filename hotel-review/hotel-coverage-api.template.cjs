'use strict';
/*
 * Public hotel crosswalk coverage for the isolated DBest preview.
 * Built from identity-checked catalogue mappings; no supplier raw pricing.
 * This endpoint triggers no browser search and has no per-lookup API cost.
 */
const google=require('../hotel-review/google-hotels-browser.cjs');
const catalog=require('./hotel-catalog.js');
const HOST=/^(?:dbest-hotel-photo-preview|dbest-hotel-review-preview(?:-[a-z0-9-]+)?)\.vercel\.app$/;
function coverage(){
 const mapped=[];
 for(const [id,p] of Object.entries(google.SOURCES)){
  const h=catalog._publicHotelById(id);
  if(!h||h.hotel!==p.hotel||h.city!==p.city)continue;
  mapped.push({id,hotel:h.hotel,city:h.city,mode:p.entity?'EXACT_ENTITY':'EXACT_PROPERTY_QUERY'});
 }
 return {status:'DBEST_PUBLIC_OTA_CROSSWALK',mapped,
  count:mapped.length,livePriceCountNotGuaranteed:true,
  description:'Public comparison is available on-demand where a verified OTA offer and matching stay exist. Other hotels retain DBest contracted reference only.'};
}
function handler(req,res){
 const host=String(req.headers?.host||'').toLowerCase().split(':')[0];
 if(!HOST.test(host)){res.statusCode=403;res.end(JSON.stringify({status:'ISOLATED_PREVIEW_ONLY'}));return}
 if(req.method!=='GET'){res.statusCode=405;res.end(JSON.stringify({status:'METHOD_NOT_ALLOWED'}));return}
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','public, max-age=120, stale-while-revalidate=240');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.end(JSON.stringify(coverage()));
}
module.exports=handler;
module.exports._test={coverage,HOST};
