'use strict';
const assert=require('node:assert/strict');
const {verifyDBestSession,SessionLookupError}=require('../bridge/dbest-readonly-session');
const token='11111111-1111-4111-8111-11111111111122222222-2222-4222-8222-222222222222';
const key='server-test-synthetic-secret-only';
const now=Date.parse('2026-10-25T15:00:00Z');
const member={external_id:'DBEST-001',kind:'member',category:'leader',status:'Active',
 payment_status:'Approved',email_verified:true,deleted_at:null,kyc_status:'Approved'};
const session={member_id:'DBEST-001',expires_at:'2026-10-25T16:00:00Z'};
const reader=(s=[session],m=[member])=>async(url,init)=>{
 assert.equal(init.method,'GET');
 assert.equal(init.headers.Authorization,'Bearer '+key);
 assert.equal(url.startsWith('https://ydedmotbacnllkijzmvp.supabase.co/rest/v1/'),true);
 assert.equal(url.includes('service_role'),false);
 const isSession=url.includes('/member_sessions_live?');
 if(!isSession){
  assert.equal(url.includes('aadhaar'),false);
  assert.equal(url.includes('bank'),false);
  assert.equal(url.includes('payload->>kyc_status'),false); // URL is encoded
  assert.equal(url.includes('kyc_status%3Apayload-%3E%3Ekyc_status'),true);
 }
 return {ok:true,json:async()=>isSession?s:m};
};
(async()=>{
 const good=await verifyDBestSession({token,serviceRoleKey:key,fetchImpl:reader(),now});
 assert.equal(good.sessionAccepted,true);
 assert.equal(good.civicEligible,true);
 assert.equal(good.newsEligible,false,'payment/KYC independent proof not available');
 assert.equal(good.memberId,'DBEST-001');
 const denied=await verifyDBestSession({token,serviceRoleKey:key,
  fetchImpl:reader([session],[{...member,kyc_status:null}]),now});
 assert.equal(denied.newsEligible,false);
 await assert.rejects(()=>verifyDBestSession({token:'bad',serviceRoleKey:key,fetchImpl:reader(),now}),/invalid_member_session_format/);
 await assert.rejects(()=>verifyDBestSession({token,serviceRoleKey:'',fetchImpl:reader(),now}),/credentials_not_configured/);
 await assert.rejects(()=>verifyDBestSession({token,serviceRoleKey:key,fetchImpl:reader([],[]),now}),/member_session_missing/);
 await assert.rejects(()=>verifyDBestSession({token,serviceRoleKey:key,fetchImpl:reader([{...session,expires_at:'2026-10-25T14:00:00Z'}]),now}),/expired_member_session/);
 await assert.rejects(()=>verifyDBestSession({token,serviceRoleKey:key,fetchImpl:reader([session],[]),now}),/member_missing_or_ambiguous/);
 console.log('PASS: DBest read-only server-side session lookup, strict projection and credential-fail-closed checks');
})().catch(e=>{console.error(e);process.exitCode=1;});
