'use strict';

// Preview-only Owner OTP bridge for the DBest hotel review workbench.
// No supplier tariff payload is accepted, stored, approved or returned by this API.
// Use a branch-only public publishable key to reach existing DBest OTP and read-only Owner validation. Never expose service keys or use on production.
const BRANCH='feat/hotel-rate-compare-isolated-20261027';
const cookieName='dbest_hotel_owner_preview';
function json(res,status,data) {
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Pragma','no-cache');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Vary','Cookie');
  return res.end(JSON.stringify(data));
}
function usableEnvironment(env) {
  return env.VERCEL_ENV==='preview' &&
    (env.VERCEL_GIT_COMMIT_REF===BRANCH || !env.VERCEL_GIT_COMMIT_REF) &&
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(String(env.HOTEL_REVIEW_SUPABASE_URL||'')) &&
    typeof env.HOTEL_REVIEW_PUBLISHABLE_KEY==='string' && /^sb_publishable_[a-zA-Z0-9_-]{20,}$/.test(env.HOTEL_REVIEW_PUBLISHABLE_KEY);
}
function allowedOrigin(req){
  const origin=String(req.headers.origin||''),host=String(req.headers.host||'');
  return /^https:\/\/[a-z0-9.-]+$/.test(origin) &&
   /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(host) &&
   new URL(origin).host===host && new URL(origin).protocol==='https:';
}
function cookieToken(req) {
  const raw=String(req.headers.cookie||'');
  const val=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='));
  if(!val)return '';
  let decoded='';try{decoded=decodeURIComponent(val.slice(cookieName.length+1));}catch{return ''}
  return /^[A-Za-z0-9_.~-]{16,4096}$/.test(decoded)?decoded:'';
}
function writeCookie(res,token) {
  res.setHeader('Set-Cookie',cookieName+'='+encodeURIComponent(token)+'; Path=/; Max-Age=7200; HttpOnly; Secure; SameSite=Strict');
}
function clearCookie(res) {
  res.setHeader('Set-Cookie',cookieName+'=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict');
}
async function callSupabase(env,path,body,extraHeaders={}) {
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),6500);
 try {
   const response=await fetch(env.HOTEL_REVIEW_SUPABASE_URL+path,{
     method:'POST',
     headers:{apikey:env.HOTEL_REVIEW_PUBLISHABLE_KEY,Authorization:'Bearer '+env.HOTEL_REVIEW_PUBLISHABLE_KEY,'Content-Type':'application/json',...extraHeaders},
     body:JSON.stringify(body),signal:c.signal
   });
   // Do not reflect upstream contents/errors containing sensitive information.
   const raw=await response.text();
   if(raw.length>16000)throw Error('upstream_response_too_large');
   let data;try{data=JSON.parse(raw)}catch{data=null}
   return {status:response.status,ok:response.ok,data};
 } finally { clearTimeout(timer); }
}
async function validateOwner(env,token) {
 if(!token)return false;
 // Existing DBest function validates session server-side before returning Owner settings.
 // The response body is intentionally discarded: none of its contents reach the preview client.
 const result=await callSupabase(env,'/functions/v1/owner-control-live',{action:'get_owner'},{'x-dbest-owner-token':token});
 return result.ok&&result.data?.ok===true;
}
const perInstance=new Map();
function rateLimit(req) {
 const ip=String(req.headers['x-forwarded-for']||'').split(',')[0].trim().slice(0,100);
 const key=ip||'unknown',now=Date.now(),previous=perInstance.get(key)||[];
 const recent=previous.filter(t=>now-t<60000);
 if(recent.length>=4)return true;
 recent.push(now);perInstance.set(key,recent);
 if(perInstance.size>2500)perInstance.clear();
 return false;
}
async function handler(req,res) {
  if(!usableEnvironment(process.env))return json(res,503,{ok:false,error:'preview_owner_login_not_configured'});
  if(req.method==='OPTIONS')return json(res,405,{ok:false,error:'method_not_allowed'});
  if(req.method!=='GET'&&req.method!=='POST')return json(res,405,{ok:false,error:'method_not_allowed'});
  if(req.method==='POST'&&!allowedOrigin(req))return json(res,403,{ok:false,error:'origin_not_allowed'});
  if(req.method==='POST'&&Number(req.headers['content-length']||0)>4096)return json(res,413,{ok:false,error:'request_too_large'});
  try{
    const op=req.method==='GET'?'status':String((req.body||{}).action||'').trim();
    if(op==='status'){
      const authorized=await validateOwner(process.env,cookieToken(req));
      if(!authorized)clearCookie(res);
      return json(res,authorized?200:401,{ok:authorized,authenticated:authorized});
    }
    if(op==='logout'){clearCookie(res);return json(res,200,{ok:true,authenticated:false})}
    if(op==='send_otp'){
      if(rateLimit(req))return json(res,429,{ok:false,error:'rate_limited'});
      const email=String(req.body?.email||'').trim().toLowerCase();
      if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,400,{ok:false,error:'invalid_email'});
      const sent=await callSupabase(process.env,'/functions/v1/send-owner-otp',{email});
      if(!sent.ok)return json(res,sent.status===429?429:400,{ok:false,error:sent.status===429?'rate_limited':'otp_not_sent'});
      return json(res,200,{ok:true,otpSent:true});
    }
    if(op==='verify_otp'){
      if(rateLimit(req))return json(res,429,{ok:false,error:'rate_limited'});
      const email=String(req.body?.email||'').trim().toLowerCase();
      const code=String(req.body?.code||'').trim();
      if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^\d{6}$/.test(code))
        return json(res,400,{ok:false,error:'invalid_input'});
      const verification=await callSupabase(process.env,'/functions/v1/verify-owner-otp',{email,code});
      const token=verification.data?.ownerToken;
      if(!verification.ok||!verification.data?.ok||typeof token!=='string'||!token)
        return json(res,401,{ok:false,error:'invalid_or_expired_otp'});
      // Fail closed: independently validate the opaque owner token via server-side RPC.
      if(!(await validateOwner(process.env,token)))return json(res,401,{ok:false,error:'owner_session_invalid'});
      writeCookie(res,token);
      return json(res,200,{ok:true,authenticated:true,expiresIn:7200});
    }
    return json(res,400,{ok:false,error:'unknown_action'});
  }catch{return json(res,502,{ok:false,error:'owner_auth_unavailable'})}
}
module.exports=handler;
module.exports._test={usableEnvironment,allowedOrigin,cookieToken,validateOwner,clearCookie,writeCookie};
