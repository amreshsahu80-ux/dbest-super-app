'use strict';
// Present a master product once, with independently priced vendor offers.
const {customerOfferView}=require('./vendor-offer-rules');
const {calculateOffer}=require('./vendor-offer-pricing');
function groupedCatalogue({masters=[],offers=[],vendors=[]}={}){
 const masterById=new Map(masters.map(m=>[m.id,m]));
 const vendorById=new Map(vendors.map(v=>[v.id,v]));
 const grouped=new Map();
 for(const offer of offers){
  const master=masterById.get(offer.master_product_id);
  const vendor=vendorById.get(offer.vendor_id);
  const view=customerOfferView({master,offer,vendor});
  if(!view)continue;
  if(!grouped.has(master.id))grouped.set(master.id,{
   productId:master.id,name:master.name,brand:master.brand,
   commonImageUrl:master.image_url||null,offers:[]});
  const verifiedMrp=master.specifications?.mrp_verified===true?Number(master.specifications.verified_mrp_inr):null;
  let savings=null;
  if(Number.isFinite(verifiedMrp)&&verifiedMrp>0&&view.priceInclusiveGst<=verifiedMrp){
   const computed=calculateOffer({mrp:verifiedMrp,sellingPrice:view.priceInclusiveGst});
   savings={mrp:verifiedMrp,amount:Math.round((verifiedMrp-view.priceInclusiveGst)*100)/100,discountPercent:computed.discountPercent};
  }
  grouped.get(master.id).offers.push({
   vendorId:view.vendorId,vendorName:view.vendorName,
   priceInclusiveGst:view.priceInclusiveGst,mrp:savings?.mrp??null,savingsAmount:savings?.amount??null,discountPercent:savings?.discountPercent??null,stock:view.stock,
   imageUrl:view.imageUrl});
 }
 return [...grouped.values()].map(group=>({
  ...group,
  offers:group.offers.sort((a,b)=>a.priceInclusiveGst-b.priceInclusiveGst||a.vendorName.localeCompare(b.vendorName)),
  startingPriceInclusiveGst:Math.min(...group.offers.map(o=>o.priceInclusiveGst)),
 })).sort((a,b)=>a.name.localeCompare(b.name));
}
module.exports={groupedCatalogue};
