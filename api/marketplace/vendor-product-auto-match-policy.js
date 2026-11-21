'use strict';
// Conservative eligibility gate for a future atomic auto-match and publish RPC.
// A successful decision is NOT authorization to write directly from a client.
const norm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
function autoMatchDecision({vendor,product,masters=[]}={}){
 if(!vendor||vendor.active!==true||vendor.owner_approval!=='Approved'||vendor.operational_hold===true)
  return {eligible:false,reason:'vendor_not_eligible'};
 if(!product||product.category==='medicine'||product.prescriptionRequired==='TRUE'||product.prescriptionRequired==='REVIEW')
  return {eligible:false,reason:'compliance_review_required'};
 if(!product.barcode)return {eligible:false,reason:'barcode_required_for_automatch'};
 const matches=masters.filter(m=>m.barcode_gtin===product.barcode&&m.category===product.category);
 if(matches.length!==1)return {eligible:false,reason:matches.length?'ambiguous_master_match':'master_match_required'};
 const m=matches[0];
 if(m.status!=='approved'||m.specifications?.test_only===true)return {eligible:false,reason:'master_not_publishable'};
 if(m.image_rights_verified!==true||!m.gst_verified_at)return {eligible:false,reason:'master_compliance_unverified'};
 if(norm(m.name)!==norm(product.name)||norm(m.brand)!==norm(product.brand))
  return {eligible:false,reason:'product_identity_mismatch'};
 return {eligible:true,masterProductId:m.id};
}
module.exports={autoMatchDecision};
