'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const {evaluateOffer} = require('../lib/vendor-offer-pricing-isolated');
const master = {id:'p1',mrp:100,status:'approved',published:true};
const offer = {masterProductId:'p1',vendorId:'v1',sellingPrice:80,stock:3,status:'approved'};
test('approved offer calculates exact savings',()=>{
 const r=evaluateOffer({master,offer});
 assert.equal(r.discountPaise,2000);
 assert.equal(r.discountPercent,20);
 assert.equal(r.eligibleForPublication,true);
});
test('draft vendor offer is never publishable',()=>{
 assert.equal(evaluateOffer({master,offer:{...offer,status:'draft'}}).eligibleForPublication,false);
});
test('zero stock cannot publish',()=>{
 assert.equal(evaluateOffer({master,offer:{...offer,stock:0}}).eligibleForPublication,false);
});
test('unapproved master cannot be offered',()=>{
 assert.throws(()=>evaluateOffer({master:{...master,status:'draft'},offer}),/master_not_approved/);
});
test('selling price cannot exceed master MRP',()=>{
 assert.throws(()=>evaluateOffer({master,offer:{...offer,sellingPrice:101}}),/invalid_offer_price/);
});
test('reject mismatched master product',()=>{
 assert.throws(()=>evaluateOffer({master,offer:{...offer,masterProductId:'p2'}}),/invalid_product_or_vendor/);
});
test('reject fractional paise and invalid stock',()=>{
 assert.throws(()=>evaluateOffer({master,offer:{...offer,sellingPrice:80.001}}),/invalid_currency_precision/);
 assert.throws(()=>evaluateOffer({master,offer:{...offer,stock:-1}}),/invalid_stock/);
});
