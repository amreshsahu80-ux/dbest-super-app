'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const sql=fs.readFileSync('hotel-review/isolated-bookings-schema.sql','utf8');
test('separate-only booking DDL is idempotent and contains guest, audit and payments',()=>{
 assert.match(sql,/separate project ONLY/);
 assert.match(sql,/create table if not exists public\.hotel_booking_requests/);
 assert.match(sql,/create table if not exists public\.hotel_booking_audit_events/);
 assert.match(sql,/create table if not exists public\.hotel_booking_gateway_events/);
 assert.match(sql,/client_request_id uuid not null unique/);
 assert.match(sql,/unique\(provider,event_id\)/);
});
test('no anonymous access and full RLS protection',()=>{
 for(const table of ['hotel_booking_requests','hotel_booking_audit_events','hotel_booking_gateway_events']){
  assert.match(sql,new RegExp('alter table public\\.'+table+' enable row level security'));
  assert.match(sql,new RegExp('revoke all on public\\.'+table+' from anon, authenticated, public'));
 }
 assert.doesNotMatch(sql,/grant\s+(?:all|select|insert)\s+on\s+public\.hotel_booking_requests\s+to\s+(?:anon|authenticated)/i);
});
test('payment and voucher constraints block premature state promotions',()=>{
 assert.match(sql,/hotel_confirmation_gate/);
 assert.match(sql,/hotel_payment_gate/);
 assert.match(sql,/hotel_paid_gate/);
 assert.match(sql,/hotel_voucher_gate/);
 assert.match(sql,/quote_tax_inclusive boolean not null default false/);
 assert.match(sql,/payment_order_id text unique/);
});
