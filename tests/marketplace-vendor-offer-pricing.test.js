'use strict';
const assert=require('node:assert/strict');
const {calculateOffer}=require('../api/marketplace/vendor-offer-pricing');
assert.deepEqual(calculateOffer({mrp:350,discountPercent:10}),{mrp:350,priceInclusiveGst:315,discountPercent:10});
assert.deepEqual(calculateOffer({mrp:350,sellingPrice:315}),{mrp:350,priceInclusiveGst:315,discountPercent:10});
for(const x of [{mrp:null,sellingPrice:100},{mrp:350},{mrp:350,sellingPrice:300,discountPercent:10},{mrp:350,discountPercent:100},{mrp:350,sellingPrice:351},{mrp:350,sellingPrice:-1}])assert.throws(()=>calculateOffer(x));
console.log('Vendor offer pricing checks passed');
