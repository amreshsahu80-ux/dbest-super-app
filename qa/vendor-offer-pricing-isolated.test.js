'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const {evaluateOffer}=require('../lib/vendor-offer-pricing-isolated');
const master={id:'p1',status:'approved'};
const offer={master_product_id:'p1',vendor_id:'v1',price_inclusive_gst:80,mrp:100,stock:3,active:true};
test('calculates exact savings with existing database columns',()=>{
 const r=evaluateOffer({master,offer});
 assert.equal(r.discountPaise,2000);assert.equal(r.discountPercent,20);
});
test('active offer cannot bypass Owner approval',()=>{
 const r=evaluateOffer({master,offer});
 assert.equal(r.eligibleForPublication,false);assert.equal(r.requiresOwnerApproval,true);
});
test('inactive offer also cannot publish',()=>{
 assert.equal(evaluateOffer({master,offer:{...offer,active:false}}).eligibleForPublication,false);
});
test('unapproved master cannot be offered',()=>{
 assert.throws(()=>evaluateOffer({master:{...master,status:'draft'},offer}),/master_not_approved/);
});
test('selling price cannot exceed MRP',()=>{
 assert.throws(()=>evaluateOffer({master,offer:{...offer,price_inclusive_gst:101}}),/invalid_offer_price/);
});
test('reject mismatched master product',()=>{
 assert.throws(()=>evaluateOffer({master,offer:{...offer,master_product_id:'p2'}}),/invalid_product_or_vendor/);
});
test('reject fractional paise and invalid stock',()=>{
 assert.throws(()=>evaluateOffer({master,offer:{...offer,price_inclusive_gst:80.001}}),/invalid_currency_precision/);
 assert.throws(()=>evaluateOffer({master,offer:{...offer,stock:-1}}),/invalid_stock/);
});
