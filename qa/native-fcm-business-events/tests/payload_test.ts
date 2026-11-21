import { buildFcmPayload } from "../edge/native-fcm-events/payload.ts";
function expect(condition:unknown,message:string){if(!condition)throw Error(message)}
const base={
 title:"DBest assigned job",body:"Open your workspace",
 target_url:"/ServicePartnerDashboard",
 event_type:"service_partner_job_assigned",
 event_key:"service_partner_job_assigned:job1:sp1"
};
Deno.test("Partner uses high-priority data-only FCM so verified Android receiver handles tap",()=>{
 const p=buildFcmPayload("qa-fcm-token-placeholder",base,{app_id:"com.dbest4u.partner"}).message;
 expect(!("notification" in p),"Partner must not have system notification payload");
 expect(!("notification" in p.android),"Partner Android notification channel must be managed by receiver");
 expect(p.android.priority==="HIGH" && p.android.ttl==="300s","Partner priority/TTL mismatch");
 expect(p.data.targetUrl==="/ServicePartnerDashboard","service deep link mismatch");
 expect(p.data.eventType===base.event_type && p.data.eventKey===base.event_key,"missing event identity");
 expect(p.data.title===base.title && p.data.body===base.body,"missing data-only visible content");
});
Deno.test("Member app retains original notification+data behavior",()=>{
 const p=buildFcmPayload("member-token",base,{app_id:"com.dbest4u.app"}).message;
 expect("notification" in p,"Member notification payload missing");
 expect(p.notification?.title===base.title,"wrong customer title");
 expect("notification" in p.android,"Member channel missing");
});
Deno.test("Path validation blocks untrusted arbitrary destinations",()=>{
 for(const path of ["//evil.example","https://evil.example/a","/evil<script>","javascript:alert(1)"]){
  const p=buildFcmPayload("token",{...base,target_url:path},{app_id:"com.dbest4u.partner"}).message;
  expect(p.data.targetUrl==="/","unsafe target accepted: "+path);
 }
 for(const path of ["/Vendor","/vaahak","/ServicePartnerDashboard"]){
  const p=buildFcmPayload("token",{...base,target_url:path},{app_id:"com.dbest4u.partner"}).message;
  expect(p.data.targetUrl===path,"valid route was rejected: "+path);
 }
});
