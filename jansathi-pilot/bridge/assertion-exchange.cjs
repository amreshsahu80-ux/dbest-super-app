'use strict';
// JanSathi server-side SIGNED source handoff. DRAFT ONLY, feature flag defaults OFF.
// Does NOT copy the DBest Pro service-role credential to the Free project.
// Not deployed; do not enable until HMAC key provisioning, signed source issuer,
// rate limiting, source session revocation, and live E2E security tests are complete.
const crypto=require('node:crypto');
const {verifyDbestAssertion}=require('./verified-assertion.cjs');
const {__test:{issueJanSathiSession}}=require('./exchange.cjs');
function reply(res,status,data){
 res.statusCode=status;
 res.setHeader('Content-Type','application/json');
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.end(JSON.stringify(data));
}
function config(){
 const e=process.env;
 if(e.JANSATHI_SSO_ASSERTION_ENABLED!=='true')return null;
 const url=e.JANSATHI_SUPABASE_URL||'';
 const secret=e.DBEST_JANSATHI_SSO_SHARED_SECRET||'';
 const key=e.JANSATHI_SERVICE_ROLE_KEY||'';
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||
    Buffer.byteLength(secret,'utf8')<32||!key)return null;
 return {jan:url,jk:key,secret,origin:e.JANSATHI_ALLOWED_ORIGIN||'https://dbest-jansathi-staging.vercel.app'};
}
async function claimAssertion(c,verified){
 const nonceHash=crypto.createHash('sha256').update('jansathi-sso:'+verified.jti).digest('hex');
 const response=await fetch(c.jan+'/rest/v1/rpc/jansathi_claim_sso_handoff',{
  method:'POST',redirect:'error',signal:AbortSignal.timeout(7500),
  headers:{apikey:c.jk,Authorization:'Bearer '+c.jk,
    Accept:'application/json','Content-Type':'application/json'},
  body:JSON.stringify({p_nonce_hash:nonceHash,p_expires_at:new Date(verified.exp*1000).toISOString()})
 });
 if(!response.ok)throw Error('server_nonce_claim_failed');
 return await response.json()===true;
}
async function handler(req,res){
 const c=config();if(!c)return reply(res,503,{error:'handoff_disabled'});
 const origin=req.headers&&req.headers.origin;
 res.setHeader('Vary','Origin');
 if(origin!==c.origin)return reply(res,403,{error:'origin_forbidden'});
 res.setHeader('Access-Control-Allow-Origin',c.origin);
 res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
 res.setHeader('Access-Control-Allow-Headers','content-type');
 if(req.method==='OPTIONS'){res.statusCode=204;return res.end();}
 if(req.method!=='POST')return reply(res,405,{error:'method_forbidden'});
 if(req.headers['content-type']?.split(';')[0]?.trim().toLowerCase()!=='application/json')
  return reply(res,415,{error:'json_required'});
 const assertion=req.body?.assertion;
 let length=0;try{length=Buffer.byteLength(JSON.stringify(req.body),'utf8');}catch(e){}
 if(length>5000)return reply(res,413,{error:'too_large'});
 const verified=verifyDbestAssertion(assertion,c.secret);
 if(!verified)return reply(res,401,{error:'assertion_invalid_or_expired'});
 try{
  const unused=await claimAssertion(c,verified);
  if(!unused)return reply(res,409,{error:'assertion_already_used'});
  const session=await issueJanSathiSession(c,verified.member);
  return reply(res,200,{ok:true,session});
 }catch(e){
  return reply(res,e.message==='identity_conflict'?409:503,
   {error:e.message==='identity_conflict'?'member_identity_conflict':'secure_exchange_unavailable'});
 }
}
module.exports=handler;
module.exports.__test={config,claimAssertion};
