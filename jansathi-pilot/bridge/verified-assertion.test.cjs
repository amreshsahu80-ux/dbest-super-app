'use strict';
// Run locally: node jansathi-pilot/bridge/verified-assertion.test.cjs
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {verifyDbestAssertion}=require('./verified-assertion.cjs');
const secret='synthetic-jansathi-handoff-secret-very-long-2026-not-real';
const now=Math.floor(Date.now()/1000);
const valid={
 iss:'dbest-member-live',aud:'jansathi-free-pilot',iat:now,exp:now+45,
 jti:crypto.randomBytes(16).toString('hex'),dbest_member_id:'DB123456',
 email:'synthetic@example.invalid',tier:'promoter',membership_status:'active',
 kyc_verified:true,source_session_expires_at:now+3600
};
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function sign(payload,sec=secret,header={alg:'HS256',typ:'DBEST-JANSATHI-HANDOFF'}){
 const partial=encode(header)+'.'+encode(payload);
 const sig=crypto.createHmac('sha256',sec).update(partial).digest('base64url');
 return partial+'.'+sig;
}
const positive=verifyDbestAssertion(sign(valid),secret,now);
assert.ok(positive);
assert.equal(positive.member.dbest_member_id,'DB123456');
assert.equal(positive.member.can_publish_news,true);
assert.equal(verifyDbestAssertion(sign({...valid,tier:'starter'}),secret,now).member.can_publish_news,false);
assert.equal(verifyDbestAssertion(sign({...valid,kyc_verified:false}),secret,now).member.can_publish_news,false);
const rejects=[
 sign({...valid,iat:now-100}),
 sign({...valid,iat:now+40}),
 sign({...valid,exp:now-1}),
 sign({...valid,exp:now+150}),
 sign({...valid,aud:'wrong-audience'}),
 sign({...valid,iss:'unknown-source'}),
 sign({...valid,jti:'weak'}),
 sign({...valid,tier:'admin'}),
 sign({...valid,dbest_member_id:'!invalid'}),
 sign({...valid,email:'not-an-email'}),
 sign({...valid,membership_status:'suspended'}),
 sign({...valid,source_session_expires_at:now-1}),
 sign(valid,secret,{alg:'none',typ:'DBEST-JANSATHI-HANDOFF'}),
 sign(valid,'other-synthetic-secret-very-long-2026'),
 sign(valid).replace(/.$/,'A'),
 'malformed',
];
for(const [i,candidate] of rejects.entries())
 assert.equal(verifyDbestAssertion(candidate,secret,now),null,'Rejected invalid assertion #'+(i+1));
assert.equal(verifyDbestAssertion(sign(valid),'short',now),null);
console.log('PASS JanSathi HMAC assertion verifier: 3 allow/eligibility and 17 deny tests.');
