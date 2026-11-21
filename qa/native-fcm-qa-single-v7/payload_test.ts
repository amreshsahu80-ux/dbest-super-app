import { buildOneDeviceVaahakQaPayload } from "./payload.ts";

function check(ok:unknown,message:string):asserts ok {if(!ok)throw Error(message);}
const attempt="123e4567-e89b-42d3-a456-426614174000";
const m=buildOneDeviceVaahakQaPayload("synthetic-not-a-real-device-token",attempt).message;
check(m.data.eventType==="vaahak_ride_offer","Android v7 Vaahak event allowlist mismatch");
check(m.data.eventKey==="vaahak_ride_offer:qa-only:"+attempt,"Required unique eventKey mismatch");
check(m.data.eventKey.startsWith(m.data.eventType+":"),"Android v7 receiver will reject key");
check(m.data.eventKey.length<=400,"Android receiver eventKey length exceeded");
check(m.data.targetUrl==="/vaahak","Wrong Vaahak tap route");
check(m.data.title.startsWith("QA Only"),"Synthetic test must be clearly labelled");
check(m.data.body.includes("No ride"),"Synthetic content must explicitly deny actual booking");
check(!("notification" in m),"Android handler expects data-only notification");
check(m.android.priority==="HIGH","Missing FCM Android high-priority message");
check(m.android.ttl==="120s","Unexpected notification lifetime");
check(m.token==="synthetic-not-a-real-device-token","Token unexpectedly changed");
for(const a of ["", "not-a-uuid", "123e4567-e89b-42d3-a456-426614174000:another"]) {
  let rejected=false;try{buildOneDeviceVaahakQaPayload("synthetic-not-a-real-device-token",a)}catch{rejected=true}
  check(rejected,"Malformed attempt ID must be rejected");
}
check(buildOneDeviceVaahakQaPayload("synthetic-not-a-real-device-token",
"123e4567-e89b-42d3-a456-426614174001").message.data.eventKey!==m.data.eventKey,
"Separate attempts must have unique notification keys");
console.log("PASS: Partner Android 1.0.3 v7 synthetic Vaahak FCM data-only payload, eventKey, deep link and QA labels");
console.log("No Firebase send, account data or database side effects.");
