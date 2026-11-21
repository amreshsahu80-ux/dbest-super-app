'use strict';
// Public-only daily reference FX endpoint for an isolated DBest guest preview.
// No account keys, no vendor rates, no conversion offered at payment.
const HOST=/^dbest-hotel-guest-public-preview(?:-[a-z0-9-]+)?\.vercel\.app$/;
let recent=null;
function send(res,status,data){
 res.statusCode=status;
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','public, max-age=900');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.end(JSON.stringify(data));
}
function createHandler(fetcher=fetch,clock=()=>Date.now()){
 return async(req,res)=>{
  const host=String(req.headers?.host||'').toLowerCase().split(':')[0];
  if(!HOST.test(host))return send(res,403,{status:'ISOLATED_GUEST_PREVIEW_ONLY'});
  if(req.method!=='GET')return send(res,405,{status:'METHOD_NOT_ALLOWED'});
  if(recent&&clock()-recent.at<12*3600000)return send(res,200,recent.data);
  try{
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),7000);
   let response;try{response=await fetcher('https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR',{signal:controller.signal})}
   finally{clearTimeout(timeout)}
   if(!response.ok)throw Error('FX_PROVIDER_UNAVAILABLE');
   const x=await response.json(),value=Number(x?.rates?.INR);
   const elapsed=clock()-Date.parse(String(x?.date||'')+'T00:00:00Z');
   if(x?.base!=='USD'||!Number.isFinite(value)||value<40||value>200||
    !Number.isFinite(elapsed)||elapsed<0||elapsed>14*86400000)throw Error('FX_INVALID_OR_STALE');
   const data={status:'DAILY_REFERENCE_FX',base:'USD',date:x.date,rates:{INR:value},
    disclaimer:'Indicative ECB/Frankfurter daily reference rate, not OTA checkout FX or guaranteed savings'};
   recent={at:clock(),data};
   return send(res,200,data);
  }catch(e){return send(res,503,{status:'FX_UNAVAILABLE',base:'USD',rates:{}})}
 };
}
module.exports=createHandler();
module.exports._test={HOST,createHandler};
