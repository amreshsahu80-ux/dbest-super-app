'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {calculateOffer}=require('../api/marketplace/vendor-offer-pricing');
const {updateOffer,customerOfferView}=require('../api/marketplace/vendor-offer-rules');
const vendor={id:'vendor-1',active:true,owner_approval:'Approved',operational_hold:false,name:'QA Vendor'};
const offer={vendor_id:'vendor-1',mrp:100,price_inclusive_gst:80,stock:5,active:true};
const master={id:'master-1',status:'approved',name:'QA Product',brand:'QA',image_url:'https://example.org/qa.jpg',specifications:{mrp_verified:true,verified_mrp_inr:200}};
test('verified master MRP overrides legacy offer MRP on vendor price edits',()=>{
 const next=updateOffer({actorVendorId:'vendor-1',offer,patch:{price_inclusive_gst:150},vendor,verifiedMasterMrp:200});
 assert.equal(next.price_inclusive_gst,150);
 assert.throws(()=>updateOffer({actorVendorId:'vendor-1',offer,patch:{price_inclusive_gst:201},vendor,verifiedMasterMrp:200}),/price_exceeds_mrp/);
});
test('customer displays verified MRP, not legacy vendor MRP, and derived discount',()=>{
 const view=customerOfferView({master,offer:{...offer,price_inclusive_gst:150},vendor});
 assert.equal(view.mrp,200);assert.equal(view.discountPercent,25);
});
test('synthetic and unverified master products never appear in customer offers',()=>{
 assert.equal(customerOfferView({master:{...master,specifications:{...master.specifications,test_only:true}},offer,vendor}),null);
 assert.equal(customerOfferView({master:{...master,specifications:{mrp_verified:false,verified_mrp_inr:200}},offer,vendor}),null);
});
test('vendor chooses selling price or discount; savings are computed',()=>{
 assert.deepEqual(calculateOffer({mrp:200,sellingPrice:150}),{mrp:200,priceInclusiveGst:150,discountPercent:25});
 assert.deepEqual(calculateOffer({mrp:200,discountPercent:25}),{mrp:200,priceInclusiveGst:150,discountPercent:25});
 assert.throws(()=>calculateOffer({mrp:200,sellingPrice:150,discountPercent:25}),/choose_price_or_discount/);
});