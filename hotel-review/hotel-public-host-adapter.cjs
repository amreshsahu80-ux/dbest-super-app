'use strict';
/*
 * Isolated preview-facing public API gateway. The original compiled private
 * catalogue remains unchanged and restricted to the hotel's native hostname.
 * This adapter admits exactly the separate photo-preview alias AND existing
 * hotel-review-preview names; it never forwards an Owner/read-private view.
 * The synthetic internal Host is not read from request input.
 */
const HOST=/^(?:dbest-hotel-photo-preview|dbest-hotel-review-preview(?:-[a-z0-9-]+)?)\.vercel\.app$/;
function send(res,status,code){
 res.statusCode=status;
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.end(JSON.stringify({status:code,hotels:[],providers:[],live:false}));
}
function forward(req,res,type,handler){
 const host=String(req.headers?.host||'').toLowerCase().split(':')[0];
 if(!HOST.test(host))return send(res,403,'HOTEL_PREVIEW_ONLY');
 if(req.method!=='GET')return send(res,405,'METHOD_NOT_ALLOWED');
 const url=new URL(req.url||'/', 'https://internal.invalid');
 if(type==='catalog'&&!['','offers','offers-summary'].includes(url.searchParams.get('view')||''))
  return send(res,403,'PUBLIC_CATALOGUE_ONLY');
 if(type!=='catalog'&&type!=='google')return send(res,404,'UNKNOWN_ROUTE');
 const internalReq={...req,method:'GET',url:req.url,headers:{...req.headers,host:'dbest-hotel-review-preview.vercel.app'}};
 return handler(internalReq,res);
}
module.exports={forward,HOST};
