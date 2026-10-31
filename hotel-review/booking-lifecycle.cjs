'use strict';
/*
 * DBest Hotel reservation safety state machine (pure / isolated).
 * This is not a persistence layer, payment gateway or availability feed.
 * The service integrating it must authenticate the Owner, store an audit log,
 * verify payment events server-to-server, enforce idempotency and protect PII.
 */
const STATES=Object.freeze({
 REQUESTED:'REQUESTED',
 QUOTED:'QUOTED',
 HOTEL_CONFIRMED:'HOTEL_CONFIRMED',
 PAYMENT_PENDING:'PAYMENT_PENDING',
 PAID:'PAID',
 VOUCHER_ISSUED:'VOUCHER_ISSUED',
 COMPLETED:'COMPLETED',
 CANCELLED:'CANCELLED'
});
const roles=Object.freeze({CUSTOMER:'CUSTOMER',OWNER:'OWNER',HOTEL:'HOTEL',PAYMENT_PROVIDER:'PAYMENT_PROVIDER'});
function nonBlank(v,max=150){return typeof v==='string'&&v.trim().length>0&&v.trim().length<=max}
function date(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return null;const d=new Date(v+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v?d:null}
function requireIt(x,message){if(!x)throw Error(message)}
function request(input,reference,now=new Date()){
 requireIt(input&&typeof input==='object','INVALID_REQUEST');
 requireIt(nonBlank(reference,80),'INVALID_REFERENCE');
 requireIt(nonBlank(input.hotelId,120)&&nonBlank(input.hotelName,180),'INVALID_HOTEL');
 const inDate=date(input.checkIn),outDate=date(input.checkOut);
 requireIt(inDate&&outDate&&inDate<outDate,'INVALID_DATES');
 const days=(outDate-inDate)/86400000;
 requireIt(days>=1&&days<=30,'INVALID_DURATION');
 const today=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
 requireIt(inDate.getTime()>=today,'PAST_CHECKIN');
 requireIt(Number.isInteger(input.rooms)&&input.rooms>=1&&input.rooms<=8,'INVALID_ROOMS');
 requireIt(Number.isInteger(input.adults)&&input.adults>=1&&input.adults<=24,'INVALID_GUESTS');
 requireIt(nonBlank(input.guestName,110),'INVALID_GUEST_NAME');
 requireIt(nonBlank(input.email,150)&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email),'INVALID_EMAIL');
 requireIt(nonBlank(input.phone,25)&&/^\+?[\d\s()-]{7,25}$/.test(input.phone),'INVALID_PHONE');
 return Object.freeze({
  reference,hotelId:input.hotelId,hotelName:input.hotelName,
  checkIn:input.checkIn,checkOut:input.checkOut,rooms:input.rooms,adults:input.adults,
  guestName:input.guestName.trim(),email:input.email.trim(),phone:input.phone.trim(),
  roomRequested:nonBlank(input.roomRequested,140)?input.roomRequested.trim():null,
  status:STATES.REQUESTED,finalTotalPaise:null,paymentOrderId:null,paymentId:null,
  hotelConfirmation:null,quotedRoom:null,mealPlan:null,cancellationPolicy:null,
  taxInclusive:false,voucherReference:null,audit:[
   {event:'REQUEST_CREATED',actor:roles.CUSTOMER,at:now.toISOString()}
  ]
 });
}
function ownerProof(actor){requireIt(actor===roles.OWNER,'OWNER_AUTH_REQUIRED')}
function transition(booking,event,actor,data={},now=new Date()){
 requireIt(booking&&Object.values(STATES).includes(booking.status),'INVALID_BOOKING');
 requireIt(nonBlank(event,80),'INVALID_EVENT');
 const b={...booking,audit:[...booking.audit]};
 const audit=(x)=>{b.audit.push({event:x,actor,at:now.toISOString()});return Object.freeze(b)};
 if(event==='CANCEL'){
  requireIt(actor===roles.OWNER,'OWNER_AUTH_REQUIRED');
  requireIt(![STATES.PAID,STATES.VOUCHER_ISSUED,STATES.COMPLETED].includes(b.status),
   'PAID_BOOKING_REQUIRES_REFUND_PROCESS');
  requireIt(b.status!==STATES.CANCELLED,'ALREADY_CANCELLED');
  b.status=STATES.CANCELLED;return audit(event);
 }
 if(event==='QUOTE'){
  ownerProof(actor);requireIt(b.status===STATES.REQUESTED,'QUOTE_OUT_OF_SEQUENCE');
  requireIt(Number.isSafeInteger(data.totalPaise)&&data.totalPaise>0,'INVALID_FINAL_TOTAL');
  requireIt(data.taxInclusive===true,'FINAL_TOTAL_MUST_INCLUDE_TAXES');
  requireIt(nonBlank(data.room,140)&&nonBlank(data.meal,100)&&nonBlank(data.cancellation,500),
   'MISSING_BOOKING_TERMS');
  b.status=STATES.QUOTED;b.finalTotalPaise=data.totalPaise;b.taxInclusive=true;
  b.quotedRoom=data.room;b.mealPlan=data.meal;b.cancellationPolicy=data.cancellation;
  return audit(event);
 }
 if(event==='CONFIRM_HOTEL'){
  ownerProof(actor);requireIt(b.status===STATES.QUOTED,'CONFIRM_OUT_OF_SEQUENCE');
  requireIt(nonBlank(data.hotelConfirmation,120),'HOTEL_CONFIRMATION_REQUIRED');
  requireIt(data.inventoryConfirmed===true,'INVENTORY_NOT_CONFIRMED');
  requireIt(data.rateAndTermsConfirmed===true,'RATE_TERMS_NOT_CONFIRMED');
  b.hotelConfirmation=data.hotelConfirmation;b.status=STATES.HOTEL_CONFIRMED;
  return audit(event);
 }
 if(event==='OPEN_PAYMENT'){
  ownerProof(actor);requireIt(b.status===STATES.HOTEL_CONFIRMED,'PAYMENT_BEFORE_HOTEL_CONFIRMATION');
  requireIt(nonBlank(data.orderId,120),'PAYMENT_ORDER_REQUIRED');
  requireIt(data.amountPaise===b.finalTotalPaise,'PAYMENT_AMOUNT_MISMATCH');
  b.paymentOrderId=data.orderId;b.status=STATES.PAYMENT_PENDING;return audit(event);
 }
 if(event==='PAYMENT_VERIFIED'){
  requireIt(actor===roles.PAYMENT_PROVIDER,'SERVER_SIDE_WEBHOOK_REQUIRED');
  requireIt(b.status===STATES.PAYMENT_PENDING,'PAYMENT_OUT_OF_SEQUENCE');
  requireIt(data.verifiedSignature===true,'WEBHOOK_SIGNATURE_UNVERIFIED');
  requireIt(data.orderId===b.paymentOrderId,'PAYMENT_ORDER_MISMATCH');
  requireIt(data.amountPaise===b.finalTotalPaise,'PAYMENT_AMOUNT_MISMATCH');
  requireIt(data.currency==='INR'&&nonBlank(data.paymentId,120),'INVALID_PAYMENT');
  b.paymentId=data.paymentId;b.status=STATES.PAID;return audit(event);
 }
 if(event==='ISSUE_VOUCHER'){
  ownerProof(actor);requireIt(b.status===STATES.PAID,'VOUCHER_BEFORE_PAYMENT');
  requireIt(nonBlank(data.voucherReference,160),'VOUCHER_REFERENCE_REQUIRED');
  requireIt(data.hotelVoucherConfirmed===true,'HOTEL_VOUCHER_NOT_CONFIRMED');
  b.voucherReference=data.voucherReference;b.status=STATES.VOUCHER_ISSUED;return audit(event);
 }
 if(event==='COMPLETE'){
  ownerProof(actor);requireIt(b.status===STATES.VOUCHER_ISSUED,'CANNOT_COMPLETE_UNVOUCHERED');
  b.status=STATES.COMPLETED;return audit(event);
 }
 throw Error('UNKNOWN_BOOKING_EVENT');
}
module.exports={STATES,roles,request,transition};
