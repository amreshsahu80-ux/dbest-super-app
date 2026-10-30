'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {ready}=require('../hotel-review/dbest-inventory-gate.cjs');
const now=new Date('2026-10-30T12:00:00.000Z');
const booking=Object.freeze({reference:'DBEST-HOTEL-TEST-001',hotelId:'HOTEL-NANDAN-GHY',
 checkIn:'2026-11-15',checkOut:'2026-11-16',rooms:1,adults:2,
 quotedRoom:'Deluxe Double',mealPlan:'CP breakfast',cancellationPolicy:'48 hours',
 finalTotalPaise:496125,finalCurrency:'INR',taxInclusive:true,
 quoteExpiresAt:'2026-10-31T12:00:00Z',hotelConfirmation:'DBEST-INVENTORY-001',status:'HOTEL_CONFIRMED'});
const allocation=Object.freeze({source:'DBEST_INTERNAL',ownerApproved:true,
 ownerVerificationReference:'DBEST-INVENTORY-001',hotelId:booking.hotelId,
 checkIn:booking.checkIn,checkOut:booking.checkOut,rooms:1,adults:2,
 room:'Deluxe Double',expiresAt:'2026-10-31T12:00:00Z'});
const check=(b={},a={})=>ready({...booking,...b},{...allocation,...a},now);
test('accept only the isolated server-side DBest Owner approved availability',()=>{
 const r=check();assert.equal(r.ready,true);assert.equal(r.amountPaise,496125);
 assert.equal(r.currency,'INR');
 assert.deepEqual(check({status:'QUOTED'}).reason,'ROOM_NOT_CONFIRMED_BY_DBEST');
 assert.equal(check({}, {ownerApproved:false}).ready,false);
 assert.equal(check({}, {source:'PUBLIC_GOOGLE_HOTELS'}).ready,false);
 assert.equal(check({}, {ownerVerificationReference:'fake'}).ready,false);
});
test('cannot charge with the wrong room, dates, occupancy or hotel',()=>{
 for(const x of [{hotelId:'OTHER'},{rooms:2},{adults:1},{checkIn:'2026-11-17'},
  {checkOut:'2026-11-19'},{quotedRoom:'Suite'}])assert.equal(check(x).ready,false,JSON.stringify(x));
});
test('reject expired inventory approval, final quote or stay in the past',()=>{
 assert.equal(check({}, {expiresAt:'2026-10-30T10:00:00Z'}).ready,false);
 assert.equal(check({quoteExpiresAt:'2026-10-30T10:00:00Z'}).ready,false);
 assert.equal(check({checkIn:'2026-01-01'},{checkIn:'2026-01-01'}).ready,false);
});
test('no customer payment without final all-in INR quote and cancellation terms',()=>{
 assert.equal(check({taxInclusive:false}).reason,'FINAL_TAX_INCLUSIVE_PRICE_REQUIRED');
 for(const invalid of [{finalTotalPaise:null},{finalTotalPaise:0},{finalTotalPaise:4950.5},
  {finalCurrency:'USD'}])assert.equal(check(invalid).ready,false);
 assert.equal(check({cancellationPolicy:''}).reason,'ROOM_AND_TERMS_REQUIRED');
});
