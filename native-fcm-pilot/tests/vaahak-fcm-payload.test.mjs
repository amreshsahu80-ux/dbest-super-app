import test from "node:test";
import assert from "node:assert/strict";
import { fcmPayload } from "../functions/native-fcm-events/fcm-payload.ts";

const safe=x=>x==="/vaahak"?x:"/";
const notice={
 title:"New DBest ride request",
 body:"Open your Vaahak workspace.",
 target_url:"/vaahak",event_type:"vaahak_ride_offer",
 event_key:"vaahak_ride_offer:VJ123:2:VAH1",
 offer_ttl_seconds:"47"
};
test("Vaahak ride offer is data-only for background tap support",()=>{
 const m=fcmPayload("FAKE_TOKEN",notice,"com.dbest4u.partner",safe).message;
 assert.equal(m.notification,undefined);
 assert.equal(m.data.targetUrl,"/vaahak");
 assert.equal(m.data.title,notice.title);
 assert.equal(m.data.eventType,"vaahak_ride_offer");
 assert.equal(m.android.ttl,"47s");
 assert.equal(m.android.priority,"HIGH");
});
test("Other business events retain visible notification payload",()=>{
 const m=fcmPayload("FAKE_TOKEN",{...notice,event_type:"marketplace_vendor_new_order"},
  "com.dbest4u.partner",safe).message;
 assert.deepEqual(m.notification,{title:notice.title,body:notice.body});
 assert.equal(m.android.notification.channel_id,"dbest_partner_updates");
 assert.equal(m.android.ttl,"300s");
});
test("Ride alert cannot carry arbitrary external destination",()=>{
 const m=fcmPayload("FAKE_TOKEN",{...notice,target_url:"https://attacker.example/p"},
   "com.dbest4u.partner",safe).message;
 assert.equal(m.data.targetUrl,"/");
});
test("Ride FCM lifetime is bounded",()=>{
 for(const ttl of ["1","99999"]){
  const m=fcmPayload("FAKE_TOKEN",{...notice,offer_ttl_seconds:ttl},
   "com.dbest4u.partner",safe).message;
  assert.ok(Number.parseInt(m.android.ttl)>=10);
  assert.ok(Number.parseInt(m.android.ttl)<=300);
 }
});
test("Same ride event for main customer app isn't forced into Partner data-only",()=>{
 const m=fcmPayload("FAKE_TOKEN",notice,"com.dbest4u.app.test",safe).message;
 assert.ok(m.notification);
});
