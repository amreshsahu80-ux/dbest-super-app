'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {request,transition,STATES,roles}=require('../hotel-review/booking-lifecycle.cjs');
const now=new Date('2026-10-30T05:00:00Z');
const raw={hotelId:'HOTEL-NANDAN-GHY',hotelName:'Hotel Nandan',checkIn:'2026-11-15',
 checkOut:'2026-11-16',rooms:1,adults:2,guestName:'Test Guest',
 email:'guest@example.invalid',phone:'+91 9876543210',roomRequested:'Deluxe'};
function start(){return request(raw,'BOOK-TEST-001',now)}
test('customer creates booking REQUEST ONLY and must not get an order/confirmed rate',()=>{
 const b=start();assert.equal(b.status,STATES.REQUESTED);
 assert.equal(b.finalTotalPaise,null);assert.equal(b.hotelConfirmation,null);
 assert.equal(b.paymentOrderId,null);assert.equal(b.paymentId,null);
 assert.equal(b.audit.length,1);assert.equal(Object.isFrozen(b),true);
 assert.throws(()=>transition(b,'OPEN_PAYMENT',roles.OWNER,{orderId:'o',amountPaise:40000},now),/PAYMENT_BEFORE/);
});
test('reject invalid/fake dates, past nights, out of-range guests and missing contact details',()=>{
 for(const delta of [
  {checkIn:'2026-02-30'}, {checkIn:'2026-10-01',checkOut:'2026-10-02'},
  {checkIn:'2026-11-17',checkOut:'2026-11-15'}, {rooms:0},
  {adults:0},{guestName:''},{email:'not-an-email'},{phone:'abc'}
 ])assert.throws(()=>request({...raw,...delta},'BOOK-TEST-002',now));
});
test('happy path requires real hotel confirmation, all-inclusive total and verified gateway callback',()=>{
 let b=start();
 assert.throws(()=>transition(b,'QUOTE',roles.CUSTOMER,{totalPaise:401625},now),/OWNER_AUTH/);
 assert.throws(()=>transition(b,'QUOTE',roles.OWNER,{totalPaise:401625,taxInclusive:false,room:'Deluxe',meal:'Breakfast',cancellation:'48h'},now),/TAXES/);
 b=transition(b,'QUOTE',roles.OWNER,{totalPaise:401625,taxInclusive:true,room:'Deluxe',meal:'Breakfast',cancellation:'48h'},now);
 assert.equal(b.status,STATES.QUOTED);
 assert.throws(()=>transition(b,'OPEN_PAYMENT',roles.OWNER,{orderId:'order_1',amountPaise:401625},now),/PAYMENT_BEFORE/);
 assert.throws(()=>transition(b,'CONFIRM_HOTEL',roles.OWNER,{hotelConfirmation:'H01',inventoryConfirmed:false,rateAndTermsConfirmed:true},now),/INVENTORY/);
 b=transition(b,'CONFIRM_HOTEL',roles.OWNER,{hotelConfirmation:'H01',inventoryConfirmed:true,rateAndTermsConfirmed:true},now);
 assert.throws(()=>transition(b,'OPEN_PAYMENT',roles.OWNER,{orderId:'order_1',amountPaise:5},now),/MISMATCH/);
 b=transition(b,'OPEN_PAYMENT',roles.OWNER,{orderId:'order_1',amountPaise:401625},now);
 const gateway={verifiedSignature:true,orderId:'order_1',paymentId:'pay_1',amountPaise:401625,currency:'INR'};
 assert.throws(()=>transition(b,'PAYMENT_VERIFIED',roles.CUSTOMER,gateway,now),/SERVER_SIDE/);
 assert.throws(()=>transition(b,'PAYMENT_VERIFIED',roles.PAYMENT_PROVIDER,{...gateway,verifiedSignature:false},now),/UNVERIFIED/);
 assert.throws(()=>transition(b,'PAYMENT_VERIFIED',roles.PAYMENT_PROVIDER,{...gateway,amountPaise:1},now),/MISMATCH/);
 b=transition(b,'PAYMENT_VERIFIED',roles.PAYMENT_PROVIDER,gateway,now);
 assert.equal(b.status,STATES.PAID);
 assert.throws(()=>transition(b,'CANCEL',roles.OWNER,{},now),/REFUND_PROCESS/);
 assert.throws(()=>transition(b,'ISSUE_VOUCHER',roles.CUSTOMER,{voucherReference:'V100'},now),/OWNER_AUTH/);
 b=transition(b,'ISSUE_VOUCHER',roles.OWNER,{voucherReference:'V100',hotelVoucherConfirmed:true},now);
 b=transition(b,'COMPLETE',roles.OWNER,{},now);
 assert.equal(b.status,STATES.COMPLETED);assert.equal(b.audit.length,7);
});
test('cancelled request cannot be quoted or checked out; original state remains immutable',()=>{
 const first=start(),b=transition(first,'CANCEL',roles.OWNER,{},now);
 assert.equal(first.status,STATES.REQUESTED);assert.equal(b.status,STATES.CANCELLED);
 assert.throws(()=>transition(b,'QUOTE',roles.OWNER,{totalPaise:100},now),/SEQUENCE/);
 assert.throws(()=>transition(b,'CANCEL',roles.OWNER,{},now),/ALREADY/);
});
