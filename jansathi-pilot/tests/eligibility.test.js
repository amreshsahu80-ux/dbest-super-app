'use strict';
const assert=require('node:assert/strict');
const {deriveEntitlement,deriveResidenceAttestation}=require('../bridge/eligibility-core');
const now=Date.parse('2026-10-25T15:00:00.000Z');
const row={external_id:'DBEST-001',kind:'member',status:'Active',deleted_at:null,
  category:'leader',payment_status:'Approved',email_verified:true,payload:{kyc_status:'Approved'}};
const session={serverChecked:true,member_id:'DBEST-001',expires_at:'2026-10-25T16:00:00.000Z'};
const proof={serverChecked:true,memberId:'DBEST-001',
 paymentProvenance:'trusted_dbest_owner_or_settlement',
 kycProvenance:'trusted_dbest_owner_review',
 verifiedAt:'2026-10-25T14:00:00.000Z'};
const take=(r=row,s=session,p=proof)=>deriveEntitlement({row:r,session:s,proof:p,now});
assert.equal(take().newsEligible,true,'fully verified paid member');
assert.equal(take({...row,category:'starter'}).newsEligible,false,'no Starter publisher');
assert.equal(take({...row,category:'guest'}).newsEligible,false,'no Guest publisher');
assert.equal(take({...row,email_verified:false}).sessionAccepted,false,'no unverified user');
assert.equal(take({...row,status:'Pending'}).sessionAccepted,false,'no pending member');
assert.equal(take({...row,deleted_at:'2026-10-25'}).newsEligible,false,'no deleted member');
assert.equal(take({...row,payment_status:'Pending Verification'}).newsEligible,false,'no unverified payment');
assert.equal(take({...row,payload:{}}).newsEligible,false,'no default Approved KYC');
assert.equal(take({...row,payload:{kyc_status:'Pending'}}).newsEligible,false,'no pending KYC');
assert.equal(take(row,{...session,serverChecked:false}).newsEligible,false,'no browser claims');
assert.equal(take(row,{...session,member_id:'OTHER'}).newsEligible,false,'must match member ID');
assert.equal(take(row,{...session,expires_at:'2026-10-24T00:00:00Z'}).newsEligible,false,'session expiry');
assert.equal(take(row,session,{...proof,memberId:'OTHER'}).newsEligible,false,'no mismatched attestation');
assert.equal(take(row,session,{...proof,kycProvenance:'browser'}).newsEligible,false,'no untrusted KYC');
assert.equal(take(row,session,null).newsEligible,false,'no absent proof');
const member=take();
const location={serverChecked:true,memberId:'DBEST-001',source:'trusted_residential_kyc_geocoding',
 pincode:'833102',latitude:22.67,longitude:85.63,areaKind:'urban',verifiedAt:'2026-10-25T14:00:00.000Z'};
assert.equal(deriveResidenceAttestation({member,geoProof:location,now}).eligible,true,'trusted residence');
assert.equal(deriveResidenceAttestation({member,geoProof:{...location,source:'user_gps'},now}).eligible,false,'current GPS cannot verify residence');
assert.equal(deriveResidenceAttestation({member,geoProof:{...location,latitude:99},now}).eligible,false,'invalid coordinates');
assert.equal(deriveResidenceAttestation({member,geoProof:{...location,pincode:'abc'},now}).eligible,false,'invalid PIN');
assert.equal(deriveResidenceAttestation({member,geoProof:null,now}).eligible,false,'no location fallback');
console.log('PASS: 19 fail-closed identity, publishing and home-attestation checks');
