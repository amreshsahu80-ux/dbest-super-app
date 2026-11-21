'use strict';
// Pure validation against the existing dbest_master_products and dbest_vendor_product_offers schema.
// IMPORTANT: MRP belongs to the vendor offer, not to the master product.
function paise(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('invalid_amount');
  const n = Math.round(value * 100);
  if (Math.abs(value * 100 - n) > 1e-7 || !Number.isSafeInteger(n)) throw new Error('invalid_currency_precision');
  return n;
}
function evaluateOffer({master, offer}) {
  if (!master || !offer || !master.id || !offer.vendor_id || String(offer.master_product_id) !== String(master.id))
    throw new Error('invalid_product_or_vendor');
  if (master.status !== 'approved') throw new Error('master_not_approved');
  const mrp = paise(offer.mrp), selling = paise(offer.price_inclusive_gst);
  if (!mrp || !selling || selling > mrp) throw new Error('invalid_offer_price');
  if (!Number.isSafeInteger(offer.stock) || offer.stock < 0) throw new Error('invalid_stock');
  const discount = mrp - selling;
  // dbest_vendor_product_offers has no approval-status field. Never infer Owner approval from active=true.
  // Publication remains disabled until the server verifies an explicit Owner approval record.
  return Object.freeze({
    masterProductId:String(master.id),vendorId:String(offer.vendor_id),
    mrpPaise:mrp,sellingPaise:selling,discountPaise:discount,
    discountPercent:Math.round(discount / mrp * 10000) / 100,
    eligibleForPublication:false,requiresOwnerApproval:true
  });
}
module.exports={evaluateOffer,paise};
