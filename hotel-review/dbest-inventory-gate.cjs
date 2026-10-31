'use strict';
/**
 * DBest-owned inventory and direct-checkout gate.
 * All inputs must originate from the server's authenticated Owner-controlled
 * booking records, NOT a browser request or public supplier rate snapshot.
 * A quoted price is NOT an inventory allocation.
 */
const ISO=/^\d{4}-\d{2}-\d{2}$/;
function date(value) {
 if (typeof value!=='string'||!ISO.test(value))return null;
 const d=new Date(value+'T00:00:00.000Z');
 return Number.isNaN(+d)||d.toISOString().slice(0,10)!==value?null:d;
}
function ready(booking, allocation, now=new Date()) {
 const fail=(reason)=>Object.freeze({ready:false,reason});
 if(!booking||!allocation||typeof booking!=='object'||typeof allocation!=='object')return fail('BOOKING_OR_ALLOCATION_MISSING');
 if(booking.status!=='HOTEL_CONFIRMED')return fail('ROOM_NOT_CONFIRMED_BY_DBEST');
 if(allocation.source!=='DBEST_INTERNAL'||allocation.ownerApproved!==true||
    !allocation.ownerVerificationReference || typeof allocation.ownerVerificationReference!=='string')
  return fail('DBEST_OWNER_AVAILABILITY_REQUIRED');
 if(booking.hotelId!==allocation.hotelId||booking.checkIn!==allocation.checkIn||
    booking.checkOut!==allocation.checkOut||booking.rooms!==allocation.rooms||
    booking.adults!==allocation.adults)return fail('ALLOCATION_STAY_MISMATCH');
 const inDate=date(booking.checkIn),outDate=date(booking.checkOut);
 const today=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
 if(!inDate||!outDate||!(inDate<outDate)||inDate.getTime()<today)return fail('STAY_INVALID_OR_IN_PAST');
 if(!Number.isInteger(booking.rooms)||booking.rooms<1||booking.rooms>8||
    !Number.isInteger(booking.adults)||booking.adults<1||booking.adults>24)return fail('GUEST_COUNT_INVALID');
 const expire=new Date(allocation.expiresAt);
 if(!Number.isFinite(+expire)||expire<=now)return fail('INVENTORY_APPROVAL_EXPIRED');
 const quotedUntil=new Date(booking.quoteExpiresAt);
 if(!Number.isFinite(+quotedUntil)||quotedUntil<=now)return fail('FINAL_QUOTE_EXPIRED');
 if(booking.finalCurrency!=='INR'||!Number.isSafeInteger(booking.finalTotalPaise)||
    booking.finalTotalPaise<=0||booking.taxInclusive!==true)return fail('FINAL_TAX_INCLUSIVE_PRICE_REQUIRED');
 if(!booking.quotedRoom||!booking.mealPlan||!booking.cancellationPolicy)return fail('ROOM_AND_TERMS_REQUIRED');
 if(allocation.room!==booking.quotedRoom)return fail('ALLOCATION_ROOM_MISMATCH');
 if(!booking.hotelConfirmation||booking.hotelConfirmation!==allocation.ownerVerificationReference)
  return fail('DBEST_CONFIRMATION_MISMATCH');
 return Object.freeze({ready:true,amountPaise:booking.finalTotalPaise,currency:'INR',
  reference:booking.reference,inventoryExpiresAt:allocation.expiresAt,quoteExpiresAt:booking.quoteExpiresAt});
}
module.exports={ready,date};
