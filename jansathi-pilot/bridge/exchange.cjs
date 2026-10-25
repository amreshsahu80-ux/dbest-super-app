'use strict';
// Pre-release staging bridge: NEVER deploy to DBest production before Owner GO.
// Secrets must remain on the server, never in public config or logs.
const {entitlementFromDbest,tokenHash}=require('./dbest-eligibility.cjs');
const KEYS=['DBEST_PRO_SUPABASE_URL','DBEST_PRO_SERVICE_ROLE_KEY','JANSATHI_SUPABASE_URL','JANSATHI_SERVICE_ROLE_KEY'];
function respond(res,code,data){res.statusCode=code;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(data));}
function config(){
 const e=process.env;if(KEYS.some(k=>!e[k]))return null;
 const safe=(raw)=>{const u=new URL(raw);if(u.protocol!=='https:'||!u.hostname.endsWith('.supabase.co'))throw Error('unsafe_url');return u.origin;};
 return {db:safe(e.DBEST_PRO_SUPABASE_URL),dk:e.DBEST_PRO_SERVICE_ROLE_KEY,jan:safe(e.JANSATHI_SUPABASE_URL),jk:e.JANSATHI_SERVICE_ROLE_KEY,origin:e.JANSATHI_ALLOWED_ORIGIN||'https://dbest-jansathi-staging.vercel.app'};
}
async function supa(base,key,path,opts={}){
 const response=await fetch(base+path,{method:opts.method||'GET',headers:{apikey:key,Authorization:'Bearer '+key,Accept:'application/json',...(opts.body?{'Content-Type':'application/json'}:{}),...(opts.prefer?{Prefer:opts.prefer}:{})},body:opts.body?JSON.stringify(opts.body):undefined,redirect:'error'});
 if(!response.ok)throw Error('upstream_failed_'+response.status);
 return await response.json().catch(()=>null);
}
async function checkMember(c,rawToken){
 const hashed=tokenHash(rawToken);if(!hashed)return null;
 const now=encodeURIComponent(new Date().toISOString());
 const found=await supa(c.db,c.dk,'/rest/v1/member_sessions_live?select=member_id&token_hash=eq.'+hashed+'&expires_at=gt.'+now+'&limit=1');
 const memberId=found&&found[0]&&found[0].member_id;
 if(!memberId)return null;
 const data=await supa(c.db,c.dk,'/rest/v1/onboarding_records?select=external_id,email,category,status,payment_status,email_verified,deleted_at,payload&kind=eq.member&external_id=eq.'+encodeURIComponent(memberId)+'&deleted_at=is.null&limit=1');
 const member=entitlementFromDbest(data&&data[0]);
 if(!member||member.dbest_member_id!==memberId||!member.email.includes('@'))return null;
 return member;
}
async function issueJanSathiSession(c,m){
 const link=await supa(c.jan,c.jk,'/auth/v1/admin/generate_link',{method:'POST',body:{type:'magiclink',email:m.email}});
 const u=link&&link.user;if(!u||!u.id||!link.hashed_token)throw Error('missing_auth_identity');
 const existing=u.app_metadata&&u.app_metadata.dbest_member_id;
 if(existing&&existing!==m.dbest_member_id)throw Error('identity_conflict');
 const linked=await supa(c.jan,c.jk,'/rest/v1/jansathi_member_entitlements?select=user_id,dbest_member_id&or=(user_id.eq.'+encodeURIComponent(u.id)+',dbest_member_id.eq.'+encodeURIComponent(m.dbest_member_id)+')&limit=4');
 if(linked.some(x=>x.user_id!==u.id||x.dbest_member_id!==m.dbest_member_id))throw Error('identity_conflict');
 if(!existing)await supa(c.jan,c.jk,'/auth/v1/admin/users/'+encodeURIComponent(u.id),{method:'PUT',body:{app_metadata:{dbest_member_id:m.dbest_member_id}}});
 const now=new Date().toISOString();
 await supa(c.jan,c.jk,'/rest/v1/jansathi_member_entitlements?on_conflict=user_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{user_id:u.id,dbest_member_id:m.dbest_member_id,tier:m.tier,membership_status:'active',kyc_verified:m.kyc_verified,source:'dbest_server_sync',source_verified_at:now,updated_at:now}});
 const tokens=await supa(c.jan,c.jk,'/auth/v1/verify',{method:'POST',body:{type:'magiclink',token_hash:link.hashed_token}});
 if(!tokens||!tokens.access_token||!tokens.refresh_token)throw Error('pilot_auth_exchange_failed');
 return {access_token:tokens.access_token,refresh_token:tokens.refresh_token,expires_at:Math.floor(Date.now()/1000)+Number(tokens.expires_in||3600),member_tier:m.tier,news_publishing_verified:m.can_publish_news};
}
async function handler(req,res){
 if(req.method!=='POST')return respond(res,405,{error:'method_not_allowed'});
 let c;try{c=config();}catch(e){return respond(res,503,{error:'bridge_configuration_invalid'});}
 if(!c)return respond(res,503,{error:'bridge_not_configured'});
 if(req.headers.origin!==c.origin)return respond(res,403,{error:'untrusted_origin'});
 if(Number(req.headers['content-length']||0)>4096)return respond(res,413,{error:'request_too_large'});
 const token=req.body&&req.body.dbestMemberToken;
 if(typeof token!=='string')return respond(res,400,{error:'member_session_required'});
 try{
  const member=await checkMember(c,token);
  if(!member)return respond(res,401,{error:'dbest_session_invalid_or_ineligible'});
  const session=await issueJanSathiSession(c,member);
  return respond(res,200,{ok:true,session});
 }catch(e){
  return respond(res,e.message==='identity_conflict'?409:503,{error:e.message==='identity_conflict'?'member_identity_conflict':'secure_exchange_unavailable'});
 }
}
module.exports=handler;
module.exports.__test={config,checkMember,issueJanSathiSession};
