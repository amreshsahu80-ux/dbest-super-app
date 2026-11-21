'use strict';
/**
 * DBest Hotel Razorpay verification primitives.
 * The raw webhook body must be verified BEFORE JSON parsing. Must be used
 * only by an isolated hotel payment backend with durable event deduplication.
 */
const crypto=require('node:crypto');
function validSignature(rawBody,received,webhookSecret) {
 if(!(typeof rawBody==='string'||Buffer.isBuffer(rawBody))||
    typeof received!=='string'||!/^[a-f0-9]{64}$/i.test(received)||
    typeof webhookSecret!=='string'||webhookSecret.length<8)return false;
 const actual=Buffer.from(received,'hex');
 const expected=crypto.createHmac('sha256',webhookSecret).update(rawBody).digest();
 return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected);
}
function capturedPayment(rawBody,received,secret,booking) {
 const fail=reason=>Object.freeze({accepted:false,reason});
 if(!validSignature(rawBody,received,secret))return fail('WEBHOOK_SIGNATURE_UNVERIFIED');
 let event;try{event=JSON.parse(Buffer.isBuffer(rawBody)?rawBody.toString('utf8'):rawBody)}
 catch{return fail('MALFORMED_WEBHOOK_JSON')}
 if(event.event!=='payment.captured')return fail('NOT_A_CAPTURED_PAYMENT_EVENT');
 const p=event.payload?.payment?.entity;
 if(p?.status!=='captured'||p.captured!==true)return fail('PAYMENT_NOT_CAPTURED');
 if(!booking||booking.status!=='PAYMENT_PENDING'||!booking.paymentOrderId||
    !Number.isSafeInteger(booking.finalTotalPaise)||booking.finalTotalPaise<=0)
  return fail('BOOKING_NOT_PENDING_VALID_PAYMENT');
 if(p.order_id!==booking.paymentOrderId)return fail('ORDER_ID_MISMATCH');
 if(p.amount!==booking.finalTotalPaise||p.currency!=='INR')return fail('PAYMENT_AMOUNT_OR_CURRENCY_MISMATCH');
 if(typeof p.id!=='string'||!/^pay_[A-Za-z0-9]{7,}$/.test(p.id))return fail('INVALID_PAYMENT_ID');
 return Object.freeze({accepted:true,paymentId:p.id,orderId:p.order_id,
  amountPaise:p.amount,currency:'INR',
  eventId:typeof event.id==='string'?event.id:null});
}
function checkoutSignature(orderId,paymentId,signature,apiSecret) {
 if(typeof orderId!=='string'||!/^order_[A-Za-z0-9]{7,}$/.test(orderId)||
    typeof paymentId!=='string'||!/^pay_[A-Za-z0-9]{7,}$/.test(paymentId)||
    typeof apiSecret!=='string'||!apiSecret||
    typeof signature!=='string'||!/^[a-f0-9]{64}$/i.test(signature))return false;
 const expected=crypto.createHmac('sha256',apiSecret).update(orderId+'|'+paymentId).digest();
 const actual=Buffer.from(signature,'hex');
 return crypto.timingSafeEqual(actual,expected);
}
module.exports={validSignature,capturedPayment,checkoutSignature};
