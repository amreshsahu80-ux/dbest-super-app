'use strict';
// Pure business rules; caller must authenticate session and fetch the offer by ID
// from the database. Never accept vendor_id from a client payload as identity.
const {updateVendorImage,effectiveImage}=require('./vendor-offer-image');
function updateOffer({actorVendorId,offer,patch={}}){
 if(!actorVendorId||!offer||offer.vendor_id!==actorVendorId)throw Error('vendor_offer_forbidden');
 const permitted=new Set(['price_inclusive_gst','mrp','stock','active','vendor_image_url']);
 if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(k=>!permitted.has(k)))throw Error('unsupported_offer_field');
 const next={...offer};
 if(Object.hasOwn(patch,'price_inclusive_gst')){
  if(typeof patch.price_inclusive_gst!=='number'||!Number.isFinite(patch.price_inclusive_gst)||patch.price_inclusive_gst<=0)throw Error('invalid_price');
  next.price_inclusive_gst=patch.price_inclusive_gst;
 }
 if(Object.hasOwn(patch,'mrp')){
  if(patch.mrp!==null&&(typeof patch.mrp!=='number'||!Number.isFinite(patch.mrp)||patch.mrp<=0))throw Error('invalid_mrp');
  next.mrp=patch.mrp;
 }
 if(next.mrp!==null&&next.mrp!==undefined&&next.price_inclusive_gst>next.mrp)throw Error('price_exceeds_mrp');
 if(Object.hasOwn(patch,'stock')){
  if(!Number.isSafeInteger(patch.stock)||patch.stock<0)throw Error('invalid_stock');
  next.stock=patch.stock;
 }
 if(Object.hasOwn(patch,'active')){
  if(typeof patch.active!=='boolean')throw Error('invalid_active');
  next.active=patch.active;
 }
 if(Object.hasOwn(patch,'vendor_image_url'))Object.assign(next,updateVendorImage({actorVendorId,offer,requestedImageUrl:patch.vendor_image_url}));
 return next;
}
function customerOfferView({master,offer,vendor}){
 if(!master||master.status!=='approved'||!vendor||vendor.active!==true||vendor.owner_approval!=='Approved'||vendor.operational_hold===true||!offer||offer.active!==true||offer.stock<=0)return null;
 return {productId:master.id,productName:master.name,brand:master.brand,vendorId:vendor.id,vendorName:vendor.name,
 priceInclusiveGst:offer.price_inclusive_gst,mrp:offer.mrp,stock:offer.stock,
 imageUrl:effectiveImage({masterImageUrl:master.image_url,vendorImageUrl:offer.vendor_image_url,vendorImageReviewStatus:offer.vendor_image_review_status})};
}
module.exports={updateOffer,customerOfferView};
