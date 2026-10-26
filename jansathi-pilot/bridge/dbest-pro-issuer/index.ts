// DRAFT ONLY — DBest Pro Supabase Edge Function. Not deployed.
// A member on the DBest same-origin page may request a 45-second signed
// authorization after the server validates an opaque DBest member session.
// Deploy ONLY after source-side security review and Owner GO.
// Requires verify_jwt=false (DBest's original member token is not a Supabase JWT);
// bearer possession, exact Origin and source-DB member eligibility are checked here.
// Do not insert DBest session tokens or assertion values in URLs or logs.
const encoder=new TextEncoder();
const PAID=new Set(['promoter','prime','leader']);
const TIERS=new Set(['starter','guest','promoter','prime','leader']);
const PAYMENTS=new Set(['approved','razorpay verified','payu verified','verified']);
const DEMO_IDS=new Set(['DMGUEST01','DMPROMO01','DMPRIME01','DMLEADER01']);
const lc=(x:unknown)=>String(x??'').trim().toLowerCase();
function b64url(bytes:Uint8Array):string{
 return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function ok(origin:string,data:unknown,status=200){
 return new Response(JSON.stringify(data),{status,headers:{
   'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
   'Vary':'Origin','Access-Control-Allow-Origin':origin
 }});
}
async function fromDb<T>(base:string,serviceKey:string,path:string):Promise<T>{
 const response=await fetch(base+path,{headers:{apikey:serviceKey,
   Authorization:'Bearer '+serviceKey,Accept:'application/json'},redirect:'error',
   signal:AbortSignal.timeout(7000)});
 if(!response.ok)throw Error('db_rejected');
 return await response.json() as T;
}
Deno.serve(async req=>{
 const allowedOrigin=Deno.env.get('DBEST_JANSATHI_SOURCE_ORIGIN')||'https://dbest4u.com';
 const origin=req.headers.get('origin')||'';
 if(origin!==allowedOrigin)return new Response(JSON.stringify({error:'origin_forbidden'}),
   {status:403,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{
   'Access-Control-Allow-Origin':allowedOrigin,'Access-Control-Allow-Methods':'POST, OPTIONS',
   'Access-Control-Allow-Headers':'content-type, apikey, authorization','Vary':'Origin'}});
 if(req.method!=='POST')return ok(allowedOrigin,{error:'method_forbidden'},405);
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers.get('content-type')||''))
   return ok(allowedOrigin,{error:'json_required'},415);
 const shared=Deno.env.get('DBEST_JANSATHI_SSO_SHARED_SECRET')||'';
 const base=Deno.env.get('SUPABASE_URL')||'';
 const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
 if(encoder.encode(shared).length<32||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base)||!serviceKey)
   return ok(allowedOrigin,{error:'handoff_not_configured'},503);
 let body:any;
 try{
  const raw=await req.text();
  if(raw.length>2048)return ok(allowedOrigin,{error:'too_large'},413);
  body=JSON.parse(raw);
 }catch{return ok(allowedOrigin,{error:'invalid_request'},400);}
 const token=body?.dbestMemberToken;
 if(typeof token!=='string'||token.length<32||token.length>512||!/^[A-Za-z0-9-]+$/.test(token))
   return ok(allowedOrigin,{error:'session_not_valid'},401);
 try{
  const digest=await crypto.subtle.digest('SHA-256',encoder.encode(token));
  const hash=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
  const now=new Date().toISOString();
  const sessions=await fromDb<Array<{member_id:string,expires_at:string}>>(base,serviceKey,
    '/rest/v1/member_sessions_live?select=member_id,expires_at&token_hash=eq.'+
      hash+'&expires_at=gt.'+encodeURIComponent(now)+'&limit=1');
  const session=sessions?.[0];
  if(!session?.member_id)return ok(allowedOrigin,{error:'session_not_valid'},401);
  const rows=await fromDb<Array<any>>(base,serviceKey,
   '/rest/v1/onboarding_records?select=external_id,email,category,status,payment_status,email_verified,deleted_at,payload'+
   '&kind=eq.member&external_id=eq.'+encodeURIComponent(session.member_id)+'&deleted_at=is.null&limit=1');
  const record=rows?.[0],payload=record?.payload||{},tier=lc(record?.category),payment=lc(record?.payment_status);
  if(!record||record.external_id!==session.member_id||!TIERS.has(tier)||
     DEMO_IDS.has(String(session.member_id).toUpperCase())||payload.demo_chain===true||
     lc(payload.environment)==='demo'||lc(record.status)!=='active'||record.deleted_at||
     record.email_verified!==true||!record.email||
     (tier==='starter'?payment!=='starter free'&&!PAYMENTS.has(payment):!PAYMENTS.has(payment)))
    return ok(allowedOrigin,{error:'member_not_eligible'},401);
  const email=lc(record.email);
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||
     !/^[A-Za-z0-9_-]{3,100}$/.test(session.member_id))return ok(allowedOrigin,{error:'member_not_eligible'},401);
  const issued=Math.floor(Date.now()/1000);
  const sessionExpiry=Math.floor(Date.parse(session.expires_at)/1000);
  if(!Number.isSafeInteger(sessionExpiry)||sessionExpiry<=issued)return ok(allowedOrigin,{error:'session_not_valid'},401);
  const claims={
   iss:'dbest-member-live',aud:'jansathi-free-pilot',
   iat:issued,exp:issued+45,jti:crypto.randomUUID().replaceAll('-',''),
   dbest_member_id:session.member_id,email,tier,membership_status:'active',
   kyc_verified:lc(payload.kyc_status)==='approved',
   source_session_expires_at:sessionExpiry
  };
  const header=b64url(encoder.encode(JSON.stringify({alg:'HS256',typ:'DBEST-JANSATHI-HANDOFF'})));
  const payloadEncoded=b64url(encoder.encode(JSON.stringify(claims)));
  const signingInput=header+'.'+payloadEncoded;
  const key=await crypto.subtle.importKey('raw',encoder.encode(shared),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=b64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(signingInput))));
  return ok(allowedOrigin,{assertion:signingInput+'.'+signature,expires_in:45});
 }catch(e){return ok(allowedOrigin,{error:'secure_handoff_unavailable'},503);}
});
