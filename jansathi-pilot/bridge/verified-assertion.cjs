'use strict';
// Staging-only component of the DBest -> JanSathi server-verified handoff.
// Do not deploy until both sides are configured and real source revocation is handled.
const crypto=require('node:crypto');
const PAID=new Set(['promoter','prime','leader']);
const TIERS=new Set(['starter','guest','promoter','prime','leader']);
function verifyDbestAssertion(assertion,secret,nowSeconds=Math.floor(Date.now()/1000)){
 if(typeof assertion!=='string'||assertion.length>4096||
    typeof secret!=='string'||Buffer.byteLength(secret,'utf8')<32)return null;
 const parts=assertion.split('.');
 if(parts.length!==3||parts.some(x=>!x||!/^[A-Za-z0-9_-]+$/.test(x)))return null;
 try{
  const h=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));
  if(h.alg!=='HS256'||h.typ!=='DBEST-JANSATHI-HANDOFF')return null;
  const signature=Buffer.from(parts[2],'base64url');
  const expected=crypto.createHmac('sha256',secret).update(parts[0]+'.'+parts[1]).digest();
  if(signature.length!==expected.length||!crypto.timingSafeEqual(signature,expected))return null;
  const claims=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
  if(claims.iss!=='dbest-member-live'||claims.aud!=='jansathi-free-pilot')return null;
  if(!Number.isSafeInteger(claims.iat)||!Number.isSafeInteger(claims.exp)||
     claims.iat<nowSeconds-25||claims.iat>nowSeconds+10||
     claims.exp<=nowSeconds||claims.exp-claims.iat>60||claims.exp-claims.iat<1)return null;
  if(!/^[a-f0-9]{32,64}$/.test(claims.jti||''))return null;
  if(!/^[A-Za-z0-9_-]{3,100}$/.test(claims.dbest_member_id||''))return null;
  if(typeof claims.email!=='string'||claims.email.length>254||
     !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email))return null;
  if(!TIERS.has(claims.tier)||claims.membership_status!=='active'||
     typeof claims.kyc_verified!=='boolean')return null;
  if(!Number.isSafeInteger(claims.source_session_expires_at)||
     claims.source_session_expires_at<=nowSeconds)return null;
  return Object.freeze({
   jti:claims.jti,exp:claims.exp,member:Object.freeze({
    dbest_member_id:claims.dbest_member_id,
    email:claims.email.toLowerCase(),tier:claims.tier,
    membership_status:'active',kyc_verified:claims.kyc_verified,
    can_publish_news:PAID.has(claims.tier)&&claims.kyc_verified
   })
  });
 }catch(e){return null;}
}
module.exports={verifyDbestAssertion};
