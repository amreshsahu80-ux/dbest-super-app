'use strict';
const {evaluateOffer}=require('./vendor-offer-pricing-isolated');
// Customer-facing catalogue projection. Fail closed unless Owner approval is explicit.
// Caller must fetch master and offer from trusted server-side DB, not request JSON.
function projectApprovedOffer({master,offer}) {
 if (!master || !offer || master.status!=='approved' ||
     offer.review_status!=='approved' || offer.active!==true ||
     !Number.isSafeInteger(offer.stock) || offer.stock<=0) return null;
 let pricing;
 try { pricing=evaluateOffer({master,offer}); } catch { return null; }
 if (offer.vendor_image_url && offer.vendor_image_review_status!=='approved') {
   // Unreviewed vendor images must never appear in the customer catalogue.
   return Object.freeze({masterProductId:pricing.masterProductId,vendorId:pricing.vendorId,
     name:master.name,imageUrl:master.image_url||null,
     mrpPaise:pricing.mrpPaise,sellingPaise:pricing.sellingPaise,
     discountPaise:pricing.discountPaise,discountPercent:pricing.discountPercent,
     stock:offer.stock});
 }
 return Object.freeze({masterProductId:pricing.masterProductId,vendorId:pricing.vendorId,
   name:master.name,imageUrl:offer.vendor_image_url||master.image_url||null,
   mrpPaise:pricing.mrpPaise,sellingPaise:pricing.sellingPaise,
   discountPaise:pricing.discountPaise,discountPercent:pricing.discountPercent,
   stock:offer.stock});
}
module.exports={projectApprovedOffer};
