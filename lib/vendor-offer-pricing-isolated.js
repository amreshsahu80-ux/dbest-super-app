'use strict';
// Isolated, pure vendor offer pricing validation. No database or production side effects.
function paise(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error('invalid_amount');
  const n = Math.round(value * 100);
  if (Math.abs(value * 100 - n) > 1e-7 || !Number.isSafeInteger(n)) throw new Error('invalid_currency_precision');
  return n;
}
function evaluateOffer({ master, offer }) {
  if (!master || !offer || !master.id || !offer.vendorId || String(offer.masterProductId) !== String(master.id))
    throw new Error('invalid_product_or_vendor');
  if (master.status !== 'approved' || master.published !== true) throw new Error('master_not_approved');
  const mrp = paise(master.mrp), selling = paise(offer.sellingPrice);
  if (mrp === 0 || selling === 0 || selling > mrp) throw new Error('invalid_offer_price');
  if (!Number.isSafeInteger(offer.stock) || offer.stock < 0) throw new Error('invalid_stock');
  const discountPaise = mrp - selling;
  return Object.freeze({
    masterProductId: String(master.id), vendorId: String(offer.vendorId),
    mrpPaise: mrp, sellingPaise: selling, discountPaise,
    discountPercent: Math.round((discountPaise / mrp) * 10000) / 100,
    eligibleForPublication: offer.status === 'approved' && offer.stock > 0
  });
}
module.exports = { evaluateOffer, paise };
