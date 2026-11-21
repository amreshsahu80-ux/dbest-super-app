'use strict';
// Vendor offers use verified catalogue MRP; vendors cannot override master MRP.
// Values are INR GST-inclusive. Discount is derived from the final offer price.
function calculateOffer({mrp, sellingPrice, discountPercent}={}){
 const m=Number(mrp);
 if(!Number.isFinite(m)||m<=0)throw Error('verified_mrp_required');
 const hasPrice=sellingPrice!==undefined&&sellingPrice!==null&&sellingPrice!=='';
 const hasDiscount=discountPercent!==undefined&&discountPercent!==null&&discountPercent!=='';
 if(hasPrice===hasDiscount)throw Error('choose_price_or_discount');
 const d=Number(discountPercent),p=Number(sellingPrice);
 if(hasDiscount&&(!Number.isFinite(d)||d<0||d>=100))throw Error('invalid_discount');
 if(hasPrice&&(!Number.isFinite(p)||p<=0||p>m))throw Error('invalid_selling_price');
 const price=hasPrice?p:Math.round(m*(1-d/100)*100)/100;
 if(price<=0||price>m)throw Error('invalid_selling_price');
 return {mrp:m,priceInclusiveGst:Math.round(price*100)/100,
  discountPercent:Math.round((1-price/m)*10000)/100};
}
module.exports={calculateOffer};
