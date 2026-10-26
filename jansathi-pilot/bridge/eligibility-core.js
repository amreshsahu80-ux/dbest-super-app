'use strict';

/**
 * DBest -> JanSathi: fail-closed identity / entitlement policy.
 * Only call after SERVER-SIDE session lookup by SHA-256 in DBest Pro's
 * member_sessions_live. Never accept sessionVerified or attestations from browsers.
 * Do NOT return PAN, Aadhaar, bank, address or member email to callers.
 */
const paidTiers = new Set(['promoter', 'prime', 'leader']);
const acceptedPayments = new Set(['Approved','Verified','Razorpay Verified','PayU Verified']);
const norm = v => String(v ?? '').trim();
const fail = reason => ({sessionAccepted:false,civicEligible:false,newsEligible:false,tier:null,memberId:null,reason});
function deriveEntitlement({row,session,proof,now=Date.now()}={}){
  if(!row||!session||session.serverChecked!==true)return fail('server_verified_session_required');
  if(!norm(session.member_id)||norm(session.member_id)!==norm(row.external_id) ||
    !Number.isFinite(Date.parse(session.expires_at||'')) ||
    Date.parse(session.expires_at)<=now)return fail('expired_or_mismatched_session');
  if(row.kind!=='member'||row.status!=='Active'||row.deleted_at)return fail('inactive_member');
  const tier=norm(row.category).toLowerCase();
  if(!['starter','guest',...paidTiers].includes(tier))return fail('unknown_membership_tier');
  if(row.email_verified!==true)return fail('verified_account_required');
  if(tier==='starter'){
    if(!['Starter Free','Approved'].includes(norm(row.payment_status)))return fail('invalid_starter_approval');
  }else if(!acceptedPayments.has(norm(row.payment_status)))return fail('unverified_membership_payment');
  const memberId=norm(row.external_id);
  const base={sessionAccepted:true,civicEligible:true,newsEligible:false,tier,memberId,reason:'news_kyc_or_payment_attestation_required'};
  if(!paidTiers.has(tier))return {...base,reason:'news_requires_paid_tier'};
  // KYC is not verified by the member-login UI, which defaults absent status to "Approved".
  // A free-text payload is not a sufficient attestation by itself.
  if(row.payload?.kyc_status!=='Approved')return {...base,reason:'explicit_kyc_approval_required'};
  if(!proof || proof.serverChecked!==true || proof.memberId!==memberId ||
      proof.paymentProvenance!=='trusted_dbest_owner_or_settlement' ||
      proof.kycProvenance!=='trusted_dbest_owner_review' ||
      !Number.isFinite(Date.parse(proof.verifiedAt||'')) ||
      Date.parse(proof.verifiedAt)>now ||
      Date.parse(proof.verifiedAt)<now-86400000)
    return base;
  return {...base,newsEligible:true,reason:'verified_paid_member'};
}
function deriveResidenceAttestation({member,geoProof,now=Date.now()}={}){
 if(!member?.sessionAccepted || !geoProof || geoProof.serverChecked!==true ||
    geoProof.memberId!==member.memberId ||
    geoProof.source!=='trusted_residential_kyc_geocoding' ||
    !/^[1-9]\d{5}$/.test(String(geoProof.pincode||'')) ||
    !['urban','rural'].includes(geoProof.areaKind) ||
    !Number.isFinite(Number(geoProof.latitude)) ||
    !Number.isFinite(Number(geoProof.longitude)) ||
    Number(geoProof.latitude)<6 || Number(geoProof.latitude)>38 ||
    Number(geoProof.longitude)<68 || Number(geoProof.longitude)>98 ||
    !Number.isFinite(Date.parse(geoProof.verifiedAt||'')) ||
    Date.parse(geoProof.verifiedAt)>now ||
    Date.parse(geoProof.verifiedAt)<now-90*86400000)
   return {eligible:false,reason:'trusted_residence_attestation_required'};
 return {eligible:true,reason:'trusted_residence_verified'};
}
module.exports={deriveEntitlement,deriveResidenceAttestation};
