/* DBest approved delivery tariff calculator, isolated QA. Distances are vendor-to-customer road km supplied by a verified routing service. */
(function(root){
'use strict';
function round(v){return Math.round((v+Number.EPSILON)*100)/100}
function calculate({type,subtotal,distanceKm}){
 if(!Number.isFinite(subtotal)||subtotal<0)throw Error('Invalid subtotal');
 if(!Number.isFinite(distanceKm)||distanceKm<0)throw Error('Verified delivery distance required');
 const tariffs={restaurant:{threshold:250,rate:10,maxKm:15},grocery:{threshold:1000,rate:15,maxKm:10}};
 const rule=tariffs[type];
 if(!rule)throw Error('Delivery tariff not approved for '+type);
 if(distanceKm>rule.maxKm)return {eligible:false,reason:'Outside '+rule.maxKm+' km service radius',distanceKm};
 const chargeableKm=subtotal>=rule.threshold?Math.max(0,distanceKm-5):distanceKm;
 const fee=round(chargeableKm*rule.rate);
 return {eligible:true,subtotal,distanceKm,threshold:rule.threshold,ratePerKm:rule.rate,chargeableKm,deliveryFee:fee,vaahakShare:round(fee/2),dbestShare:round(fee-round(fee/2)),totalBeforeTax:round(subtotal+fee)};
}
root.DBestDeliveryQA={calculate};
})(typeof window!=='undefined'?window:globalThis);
