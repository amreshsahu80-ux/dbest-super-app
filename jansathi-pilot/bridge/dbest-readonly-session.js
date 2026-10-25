'use strict';

// PRIVATE SERVER MODULE ONLY. Never bundle in /web or call Supabase's service key from a browser.
// This reader verifies the existing DBest member session against the original Pro database,
// WITHOUT MODIFYING ANY DBest TABLES. It DOES NOT sign in to JanSathi or issue a JanSathi JWT.
const {createHash}=require('node:crypto');
const {deriveEntitlement}=require('./eligibility-core');
const DBEST_PRO_URL='https://ydedmotbacnllkijzmvp.supabase.co';
const UUID_RE='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const TOKEN_RE=new RegExp('^'+UUID_RE+UUID_RE+'$','i');
class SessionLookupError extends Error{
 constructor(code){super(code);this.code=code;}
}
async function verifyDBestSession({token,serviceRoleKey,fetchImpl=globalThis.fetch,now=Date.now()}={}){
 const raw=String(token||'');
 if(!TOKEN_RE.test(raw))throw new SessionLookupError('invalid_member_session_format');
 if(typeof serviceRoleKey!=='string'||serviceRoleKey.length<20)
   throw new SessionLookupError('dbest_backend_credentials_not_configured');
 if(typeof fetchImpl!=='function')throw new SessionLookupError('fetch_unavailable');
 const h={'apikey':serviceRoleKey,'Authorization':'Bearer '+serviceRoleKey,'Accept':'application/json'};
 const call=async(path)=>{
   const res=await fetchImpl(DBEST_PRO_URL+'/rest/v1/'+path,{method:'GET',headers:h,
     redirect:'error',signal:AbortSignal.timeout(8000)});
   if(!res.ok)throw new SessionLookupError('dbest_source_unavailable');
   const value=await res.json();
   if(!Array.isArray(value))throw new SessionLookupError('dbest_source_invalid_response');
   return value;
 };
 const hash=createHash('sha256').update(raw,'utf8').digest('hex');
 const ses=await call('member_sessions_live?select=member_id,expires_at&token_hash=eq.'+hash+'&limit=2');
 if(ses.length!==1)throw new SessionLookupError('member_session_missing_or_ambiguous');
 const session=ses[0];
 if(typeof session.member_id!=='string'||!session.member_id.trim()||
    Date.parse(session.expires_at||'')<=now)
   throw new SessionLookupError('expired_member_session');
 // Explicit projected KYC field only: NEVER request or transfer Aadhaar, PAN or bank fields.
 const selector='external_id,kind,category,status,payment_status,email_verified,deleted_at,kyc_status:payload->>kyc_status';
 const members=await call('onboarding_records?select='+encodeURIComponent(selector)+
    '&kind=eq.member&external_id=eq.'+encodeURIComponent(session.member_id)+'&limit=2');
 if(members.length!==1)throw new SessionLookupError('member_missing_or_ambiguous');
 const r=members[0];
 const sanitized={...r,payload:{kyc_status:r.kyc_status}};
 const policy=deriveEntitlement({row:sanitized,
   session:{...session,serverChecked:true},proof:null,now});
 // Paid news is intentionally locked until an independently verified source for
 // Owner/KYC approval AND payment settlement/activation can be joined server-side.
 return {sessionAccepted:policy.sessionAccepted,memberId:policy.sessionAccepted?policy.memberId:null,
   tier:policy.sessionAccepted?policy.tier:null,
   civicEligible:policy.civicEligible,newsEligible:false,
   reason:policy.reason};
}
module.exports={verifyDBestSession,SessionLookupError};
