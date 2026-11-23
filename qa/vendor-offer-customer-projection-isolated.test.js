'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {projectApprovedOffer}=require('../lib/vendor-offer-customer-projection-isolated');
const master={id:'p1',status:'approved',name:'Test item',image_url:'https://example.com/master.jpg'};
const offer={master_product_id:'p1',vendor_id:'v1',mrp:100,price_inclusive_gst:80,
 stock:3,active:true,review_status:'approved',vendor_image_url:'https://example.com/vendor.jpg',
 vendor_image_review_status:'pending_review'};
test('approved product projects price and master image until vendor image approved',()=>{
 const r=projectApprovedOffer({master,offer});
 assert.equal(r.sellingPaise,8000);assert.equal(r.discountPercent,20);
 assert.equal(r.imageUrl,master.image_url);
});
test('approved vendor image is displayed',()=>{
 assert.equal(projectApprovedOffer({master,offer:{...offer,vendor_image_review_status:'approved'}}).imageUrl,offer.vendor_image_url);
});
for(const [name,change] of [
 ['pending review',{review_status:'pending_review'}],['inactive',{active:false}],
 ['out of stock',{stock:0}],['invalid price',{price_inclusive_gst:101}]
]) test('customer hides '+name,()=>assert.equal(projectApprovedOffer({master,offer:{...offer,...change}}),null));
test('customer hides draft master',()=>assert.equal(projectApprovedOffer({master:{...master,status:'draft'},offer}),null));
