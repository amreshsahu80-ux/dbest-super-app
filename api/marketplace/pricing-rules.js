'use strict';
// DBest Marketplace delivery tariff, agreed 16 October 2026.
// Distances are vendor-to-customer road distances in kilometres.
// This module intentionally does not infer road distance from GPS straight lines.
const RULES=Object.freeze({
  restaurant:{threshold:250,perKm:10,freeKm:5},
  medicine:{threshold:250,perKm:10,freeKm:5},
  grocery:{threshold:1000,perKm:15,freeKm:5}
});
function roundMoney(value){return Math.round((value+Number.EPSILON)*100)/100}
function deliveryQuote({marketType,subtotal,roadDistanceKm}){
  const rule=RULES[String(marketType||'').toLowerCase()];
  if(!rule)throw new Error('unsupported_market_type');
  if(!Number.isFinite(subtotal)||subtotal<0)throw new Error('invalid_subtotal');
  if(!Number.isFinite(roadDistanceKm)||roadDistanceKm<0)throw new Error('verified_road_distance_required');
  const eligible=subtotal>=rule.threshold;
  const billableKm=eligible?Math.max(0,roadDistanceKm-rule.freeKm):Math.max(1,roadDistanceKm);
  return {fee:roundMoney(billableKm*rule.perKm),distanceKm:roadDistanceKm,billableKm,
    rule:{...rule,qualifiesForFreeKm:eligible}};
}
// GST rates are product-specific; do not infer from broad market type.
// Catalog price may be GST-inclusive or GST-exclusive.
function productTax({unitPrice,qty,gstRatePercent,taxInclusive}){
  if(![unitPrice,qty,gstRatePercent].every(Number.isFinite)||unitPrice<0||qty<=0||gstRatePercent<0||gstRatePercent>100)
    throw new Error('invalid_product_tax_configuration');
  if(typeof taxInclusive!=='boolean')throw new Error('tax_inclusive_flag_required');
  const amount=roundMoney(unitPrice*qty);
  const tax=roundMoney(taxInclusive?amount*gstRatePercent/(100+gstRatePercent):amount*gstRatePercent/100);
  return {tax,net:roundMoney(taxInclusive?amount-tax:amount),gross:roundMoney(taxInclusive?amount:amount+tax)};
}
module.exports={RULES,deliveryQuote,productTax};
