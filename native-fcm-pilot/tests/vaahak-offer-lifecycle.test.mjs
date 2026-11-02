import test from "node:test";
import assert from "node:assert/strict";
import { eligible, dedupe } from "../functions/native-fcm-vaahak-intake/offer-rules.ts";

// Synthetic data only; no Supabase calls and no real ride changes.
const clock=Date.parse("2026-11-02T18:00:00.000Z");
const offer=(patch={})=>({
  id:"VJ_SYNTHETIC",kind:"ride",status:"Open",
  offered_partner_id:"VAAHAK_A",assigned_partner_id:null,offer_attempt:1,
  offer_expires_at:new Date(clock+300000).toISOString(),
  dispatch_last_at:new Date(clock).toISOString(),...patch
});
const current=(queued,ride,now)=>eligible(ride,now)&&
  dedupe(ride)===queued.key && ride.offered_partner_id===queued.recipient;
test("1. New ride is eligible exactly once per attempt",()=>{
  const first=offer(),queued={key:dedupe(first),recipient:first.offered_partner_id};
  assert.equal(current(queued,first,clock+10000),true);
  assert.equal(dedupe(first),dedupe(first));
});
test("2. Cancelled ride cannot produce or retain a valid notification",()=>{
  const first=offer(),queued={key:dedupe(first),recipient:first.offered_partner_id};
  assert.equal(current(queued,{...first,status:"Cancelled"},clock+20000),false);
});
test("3. Reassignment to a different Vaahak invalidates the original",()=>{
  const first=offer(),queued={key:dedupe(first),recipient:first.offered_partner_id};
  const assigned={...first,assigned_partner_id:"VAAHAK_B",status:"Accepted"};
  assert.equal(current(queued,assigned,clock+20000),false);
});
test("4. Reoffer after timeout changes both attempt and recipient",()=>{
  const first=offer(),queued={key:dedupe(first),recipient:first.offered_partner_id};
  const second=offer({offered_partner_id:"VAAHAK_B",offer_attempt:2,
    dispatch_last_at:new Date(clock+50000).toISOString(),
    offer_expires_at:new Date(clock+350000).toISOString()});
  assert.equal(current(queued,second,clock+60000),false);
  assert.equal(current({key:dedupe(second),recipient:"VAAHAK_B"},second,clock+60000),true);
});
test("5. Same Vaahak receives distinct retries, never stale attempts",()=>{
  const first=offer(),queued={key:dedupe(first),recipient:"VAAHAK_A"};
  const second=offer({offer_attempt:2});
  assert.notEqual(queued.key,dedupe(second));
  assert.equal(current(queued,second,clock+30000),false);
});
test("6. Expired or nearly expired offers are rejected",()=>{
  const first=offer(),queued={key:dedupe(first),recipient:"VAAHAK_A"};
  assert.equal(current(queued,first,clock+300001),false);
  assert.equal(current(queued,first,clock+245000),false); // <60s buffer
});
test("7. Completed ride and delivery are not offered as new rides",()=>{
  const first=offer(),queued={key:dedupe(first),recipient:"VAAHAK_A"};
  assert.equal(current(queued,{...first,status:"Completed"},clock+10000),false);
  assert.equal(current(queued,{...first,kind:"delivery"},clock+10000),false);
});
test("8. Missing Vaahak and malformed attempt are rejected",()=>{
  assert.equal(eligible(offer({offered_partner_id:null}),clock),false);
  assert.equal(eligible(offer({offer_attempt:-1}),clock),false);
  assert.equal(eligible(offer({offer_expires_at:"garbage"}),clock),false);
});
