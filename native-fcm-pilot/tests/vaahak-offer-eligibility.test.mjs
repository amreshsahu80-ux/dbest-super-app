import test from "node:test";
import assert from "node:assert/strict";
import { eligible, dedupe } from "../functions/native-fcm-vaahak-intake/offer-rules.ts";

const NOW=Date.parse("2026-11-02T18:00:00Z");
const offer=(patch={})=>({
  id:"VJTEST1",kind:"ride",status:"Open",offered_partner_id:"VAH123",
  assigned_partner_id:null,offer_attempt:1,
  dispatch_last_at:new Date(NOW-40_000).toISOString(),
  offer_expires_at:new Date(NOW+250_000).toISOString(),
  ...patch
});
const check=(label,patch,expected)=>test(label,()=>assert.equal(eligible(offer(patch),NOW),expected));
check("current open offered ride",{},true);
check("completed ride", {status:"Completed"},false);
check("cancelled ride", {status:"Cancelled"},false);
check("expired ride", {offer_expires_at:new Date(NOW-100).toISOString()},false);
check("offer expiring in 20 seconds", {offer_expires_at:new Date(NOW+20_000).toISOString()},false);
check("offer too far in the future", {offer_expires_at:new Date(NOW+400_000).toISOString()},false);
check("unoffered ride", {offered_partner_id:null},false);
check("already assigned ride", {assigned_partner_id:"VAH123"},false);
check("delivery must not be called a ride", {kind:"delivery"},false);
check("missing attempt", {offer_attempt:null},false);
check("zero attempt", {offer_attempt:0},false);
check("stale dispatch", {dispatch_last_at:new Date(NOW-600_000).toISOString()},false);
check("future dispatch", {dispatch_last_at:new Date(NOW+60_000).toISOString()},false);
check("missing timestamps", {dispatch_last_at:null},false);
check("new offer attempt gets unique key",{},true);
test("deduplication identifies each real attempt/recipient separately",()=>{
  assert.equal(dedupe(offer()),dedupe(offer()));
  assert.notEqual(dedupe(offer()),dedupe(offer({offer_attempt:2})));
  assert.notEqual(dedupe(offer()),dedupe(offer({offered_partner_id:"VAH456"})));
});
