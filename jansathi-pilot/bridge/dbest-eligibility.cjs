'use strict';
const crypto=require('node:crypto');
const TIERS=new Set(['starter','guest','promoter','prime','leader']);
const PAID=new Set(['promoter','prime','leader']);
const PAYMENTS=new Set(['approved','razorpay verified','payu verified','verified']);
const DEMO_IDS=new Set(['DMGUEST01','DMPROMO01','DMPRIME01','DMLEADER01']);
const read=v=>String(v==null?'':v).trim().toLowerCase();
function entitlementFromDbest(record){
  if(!record||!record.external_id)return null;
  const tier=read(record.category),id=String(record.external_id).trim();
  const payload=record.payload&&typeof record.payload==='object'&&!Array.isArray(record.payload)?record.payload:{};
  if(!TIERS.has(tier)||DEMO_IDS.has(id.toUpperCase())||payload.demo_chain===true||read(payload.environment)==='demo')return null;
  if(read(record.status)!=='active'||record.deleted_at||record.email_verified!==true)return null;
  const pay=read(record.payment_status);
  const paidOkay=PAYMENTS.has(pay);
  if(tier==='starter'&&pay!=='starter free'&&!paidOkay)return null;
  if(tier!=='starter'&&!paidOkay)return null;
  const verifiedKyc=read(payload.kyc_status)==='approved';
  return Object.freeze({
    dbest_member_id:id,
    email:read(record.email),
    tier,
    membership_status:'active',
    kyc_verified:verifiedKyc,
    can_publish_news:PAID.has(tier)&&paidOkay&&verifiedKyc
  });
}
function tokenHash(token){
 if(typeof token!=='string'||token.length<32||token.length>512||!/^[a-zA-Z0-9-]+$/.test(token))return null;
 return crypto.createHash('sha256').update(token,'utf8').digest('hex');
}
module.exports={entitlementFromDbest,tokenHash};
