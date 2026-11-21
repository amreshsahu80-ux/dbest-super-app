'use strict';
// Present a master product once, with independently priced vendor offers.
const {customerOfferView}=require('./vendor-offer-rules');
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
  grouped.get(master.id).offers.push({
   vendorId:view.vendorId,vendorName:view.vendorName,
   priceInclusiveGst:view.priceInclusiveGst,mrp:view.mrp,stock:view.stock,
   imageUrl:view.imageUrl});
 }
 return [...grouped.values()].map(group=>({
  ...group,
  offers:group.offers.sort((a,b)=>a.priceInclusiveGst-b.priceInclusiveGst||a.vendorName.localeCompare(b.vendorName)),
  startingPriceInclusiveGst:Math.min(...group.offers.map(o=>o.priceInclusiveGst)),
 })).sort((a,b)=>a.name.localeCompare(b.name));
}
module.exports={groupedCatalogue};
