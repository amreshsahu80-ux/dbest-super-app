'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {validSignature,capturedPayment,checkoutSignature}=require('../hotel-review/razorpay-verification.cjs');
const secret='webhook-test-secret-2026';
const p={status:'captured',captured:true,amount:496125,currency:'INR',order_id:'order_ABCDEF12345',id:'pay_ABCDEF12345'};
const booking={status:'PAYMENT_PENDING',paymentOrderId:p.order_id,finalTotalPaise:p.amount};
const event={id:'evt_ABCDEF1234',event:'payment.captured',payload:{payment:{entity:p}}};
const raw=JSON.stringify(event);
const signature=s=>crypto.createHmac('sha256',secret).update(s).digest('hex');
test('accepts signed Razorpay captured-payment webhook with matched server order amount',()=>{
 const got=capturedPayment(raw,signature(raw),secret,booking);
 assert.equal(got.accepted,true);assert.equal(got.paymentId,p.id);
});
test('rejects forged signature, mutated raw payload, invalid status, order, amount and currency',()=>{
 assert.equal(capturedPayment(raw,'f'.repeat(64),secret,booking).accepted,false);
 assert.equal(capturedPayment(raw+' ',signature(raw),secret,booking).accepted,false);
 assert.equal(capturedPayment(raw,signature(raw),secret,{...booking,paymentOrderId:'order_OTHER12345'}).accepted,false);
 assert.equal(capturedPayment(raw,signature(raw),secret,{...booking,finalTotalPaise:1}).accepted,false);
 assert.equal(capturedPayment(raw,signature(raw),secret,{...booking,status:'REQUESTED'}).accepted,false);
 for(const override of [{status:'authorized',captured:false},{currency:'USD'},{amount:100}]){
  const value=JSON.stringify({...event,payload:{payment:{entity:{...p,...override}}}});
  assert.equal(capturedPayment(value,signature(value),secret,booking).accepted,false);
 }
});
test('ignores unauthorized or uninteresting events and validates checkout callback',()=>{
 const other=JSON.stringify({...event,event:'payment.authorized'});
 assert.equal(capturedPayment(other,signature(other),secret,booking).accepted,false);
 assert.equal(validSignature(raw,'bogus',secret),false);
 const apiSecret='api_test_secret';
 const signed=crypto.createHmac('sha256',apiSecret).update(p.order_id+'|'+p.id).digest('hex');
 assert.equal(checkoutSignature(p.order_id,p.id,signed,apiSecret),true);
 assert.equal(checkoutSignature(p.order_id,p.id,'bad',apiSecret),false);
});
