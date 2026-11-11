/**
 * QA-STAGED SNAPSHOT OF native-fcm-events v7, hardened event eligibility.
 * DO NOT DEPLOY THIS FILE AS A LIVE EDGE FUNCTION until reviewed.
 * Enqueue/processing requires the server's private service-role key; this
 * snapshot does not change DBEST_FCM_SEND_ENABLED or create triggers.
 */
import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" },
});
const clean = (x: unknown, n = 180) => String(x ?? "").trim().slice(0, n);
const enc = new TextEncoder();
const b64url = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
const b64text = (x: string) => b64url(enc.encode(x));
const SAFE_EVENTS = new Set([
  "marketplace_vendor_new_order", "marketplace_customer_status",
  "marketplace_payment_confirmed", "vaahak_ride_offer",
  "vaahak_ride_status", "service_partner_job_assigned", "service_customer_job_status",
]);
const cleanTarget = (x: string) => /^\/(?!\/)[A-Za-z0-9_/?=&.%-]{0,300}$/.test(x) ? x : "/";
type Notice = { event_key: string; event_type: string; recipient_type: string; recipient_id: string;
  category: string; title: string; body: string; target_url: string; };
// Database schema is intentionally dynamic in this staged snapshot; the Notice
// return type and PostgreSQL integration tests enforce event payload contracts.
type Service = any;
async function fromEvent(db: Service, type: string, recordId: string): Promise<Notice | null> {
  if (!SAFE_EVENTS.has(type) || !recordId) return null;
  if (type.startsWith("marketplace_") && type !== "marketplace_payment_confirmed") {
    const { data: r, error } = await db.from("marketplace_orders_live")
      .select("id,vendor_id,customer_member_id,status,vendor_status,payment_status,payment_method")
      .eq("id", recordId).maybeSingle();
    if (error) throw error;
    if (!r) return null;
    if (type === "marketplace_vendor_new_order") {
      if (!r.vendor_id || r.vendor_status !== "New Order" ||
          !["Order Placed","Awaiting Vendor Confirmation"].includes(clean(r.status,80)))
        return null;
      const method=clean(r.payment_method,90).toLowerCase();
      const atDelivery=/(at delivery|after delivery|on delivery|cash on delivery|cod)/.test(method);
      const online=/(razorpay|payu|online|prepaid|card|upi)/.test(method);
      if(online && !atDelivery &&
        !["paid","prepaid","received","verified","razorpay verified"].includes(clean(r.payment_status,80).toLowerCase()))return null;
      const {data:v,error:ve}=await db.from("marketplace_vendors_live")
        .select("owner_approval,active,operational_hold").eq("id",r.vendor_id).maybeSingle();
      if(ve)throw ve;
      if(!v||v.owner_approval!=="Approved"||v.active!==true||v.operational_hold===true)return null;
      return {
        event_key: type+":"+r.id+":"+r.vendor_id, event_type:type,
        recipient_type:"Vendor",recipient_id:r.vendor_id,
        category:"order",title:"New DBest Marketplace order",
        body:"A customer order is awaiting your review.",target_url:"/Vendor",
      };
    }
    if (!r.customer_member_id) return null;
    return { event_key: type + ":" + r.id + ":" + clean(r.status, 80),
      event_type: type, recipient_type: "Member", recipient_id: r.customer_member_id,
      category: "order", title: "DBest order update",
      body: "Your order status is now " + clean(r.status, 80) + ".", target_url: "/" };
  }
  if (type === "marketplace_payment_confirmed") {
    const { data: r, error } = await db.from("marketplace_master_orders_live")
      .select("id,customer_member_id,payment_status").eq("id", recordId).maybeSingle();
    if (error) throw error;
    if (!r?.customer_member_id || !["paid","received","verified"].includes(clean(r.payment_status).toLowerCase())) return null;
    return { event_key: type + ":" + r.id + ":" + clean(r.payment_status),
      event_type: type, recipient_type: "Member", recipient_id: r.customer_member_id,
      category: "payment", title: "DBest payment confirmed",
      body: "Your Marketplace payment has been confirmed.", target_url: "/" };
  }
  if (type.startsWith("vaahak_")) {
    const { data: r, error } = await db.from("vaahak_jobs_live")
      .select("id,kind,status,offered_partner_id,assigned_partner_id,offer_expires_at,customer_member_id")
      .eq("id", recordId).maybeSingle();
    if (error) throw error;
    if (!r) return null;
    if (type === "vaahak_ride_offer") {
      const target=r.offered_partner_id;
      if(!target||r.status!=="Open"||!r.offer_expires_at||
         !(new Date(r.offer_expires_at).getTime()>Date.now()))return null;
      const {data:partner,error:pe}=await db.from("vaahak_partners_live")
        .select("owner_approval,available,operational_hold").eq("id",target).maybeSingle();
      if(pe)throw pe;
      if(!partner||partner.owner_approval!=="Approved"||
         partner.available!==true||partner.operational_hold===true)return null;
      return {event_key:type+":"+r.id+":"+clean(target),
        event_type:type,recipient_type:"Vaahak",recipient_id:target,
        category:"ride",title:clean(r.kind).toLowerCase()==="delivery"?
          "New DBest delivery":"New DBest ride request",
        body:"A new request is available. Open your Vaahak workspace to respond.",target_url:"/vaahak"};
    }
    if (!r.customer_member_id) return null;
    return { event_key: type + ":" + r.id + ":" + clean(r.status, 80),
      event_type: type, recipient_type: "Member", recipient_id: r.customer_member_id,
      category: "ride", title: "DBest ride update",
      body: "Your ride status is now " + clean(r.status, 80) + ".", target_url: "/" };
  }
  if (type.startsWith("service_")) {
    const { data: r, error } = await db.from("hyperlocal_jobs_live")
      .select("id,member_id,assigned_partner_member_id,status").eq("id", recordId).maybeSingle();
    if (error) throw error;
    if (!r) return null;
    if (type === "service_partner_job_assigned") {
      if(!r.assigned_partner_member_id||r.status!=="Assigned")return null;
      const recipient=r.assigned_partner_member_id;
      const {data:profile,error:pe}=await db.from("service_partner_profiles_live")
        .select("approval_status,active,operational_hold").eq("member_id",recipient).maybeSingle();
      if(pe)throw pe;
      if(!profile||profile.approval_status!=="Approved"||profile.active!==true||
         profile.operational_hold===true)return null;
      const {data:account,error:ae}=await db.from("partner_accounts_live")
        .select("account_status,roles").eq("account_id",recipient).maybeSingle();
      if(ae)throw ae;
      if(!account||account.account_status!=="Active"||
         !Array.isArray(account.roles)||!account.roles.includes("service_partner"))return null;
      return {event_key:type+":"+r.id+":"+recipient,
        event_type:type,recipient_type:"Service Partner",recipient_id:recipient,
        category:"job",title:"DBest service assignment",
        body:"A service request has been assigned to your account.",target_url:"/ServicePartnerDashboard"};
    }
    if (!r.member_id) return null;
    return { event_key: type + ":" + r.id + ":" + clean(r.status, 80),
      event_type: type, recipient_type: "Member", recipient_id: r.member_id,
      category: "job", title: "DBest service update",
      body: "Your service request status is now " + clean(r.status, 80) + ".", target_url: "/" };
  }
  return null;
}
function allowed(pref: Record<string, boolean> | null, category: string): boolean {
  if (!pref) return true;
  const k = ({ order: "orders", ride: "rides", job: "jobs", payment: "payments" } as Record<string,string>)[category] ?? "transactional";
  return pref[k] !== false;
}
async function accessToken(account: Record<string,string>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64text(JSON.stringify({ alg:"RS256", typ:"JWT" }));
  const body = b64text(JSON.stringify({
    iss: account.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3500,
  }));
  const signingInput = header + "." + body;
  const raw = account.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", bytes, {
    name: "RSASSA-PKCS1-v1_5", hash: "SHA-256",
  }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,enc.encode(signingInput)));
  const oauth = await fetch("https://oauth2.googleapis.com/token", {
    method:"POST", headers:{ "content-type":"application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:signingInput+"."+b64url(sig) }),
  });
  const result = await oauth.json().catch(() => ({}));
  if (!oauth.ok || !result.access_token) throw Error("google_oauth_failed");
  return String(result.access_token);
}
async function sendFcm(token: string, access: string, project: string, d: Record<string,string>, device: Record<string,string>) {
  const channel = device.app_id === "com.dbest4u.partner" ? "dbest_partner_updates" : "dbest_updates";
  const payload = { message:{
    token, notification:{title:d.title,body:d.body},
    data:{targetUrl:cleanTarget(d.target_url),eventType:d.event_type,eventKey:d.event_key},
    android:{ priority:"HIGH",ttl:"300s",notification:{channel_id:channel} },
  } };
  const r = await fetch("https://fcm.googleapis.com/v1/projects/"+encodeURIComponent(project)+"/messages:send",{
    method:"POST",headers:{Authorization:"Bearer "+access,"content-type":"application/json"},
    body:JSON.stringify(payload),
  });
  const j = await r.json().catch(() => ({}));
  const error = j?.error || {};
  const details = Array.isArray(error.details) ? error.details : [];
  const invalid = error.status === "UNREGISTERED" ||
    details.some((d: Record<string,string>) => d.errorCode === "UNREGISTERED" ||
      d.errorCode === "INVALID_ARGUMENT" && String(error.message || "").toLowerCase().includes("registration token"));
  return {ok:r.ok,status:r.status,messageId:r.ok?clean(j.name,350):"",invalidToken:invalid};
}

Deno.serve(async req => {
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const url = Deno.env.get("SUPABASE_URL")||"";
  // Only trusted backend server requests may enqueue or dispatch. Never use the public anon key.
  if (!secret || !url || req.headers.get("apikey")!==secret)
    return json({error:"service_authorization_required"},401);
  const db = createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  try {
    const b=await req.json().catch(()=>({}));
    const action=clean(b.action,40);
    if (action==="health") {
      const [{count:pending},{count:registered}]=await Promise.all([
        db.from("native_fcm_outbox").select("id",{count:"exact",head:true}).eq("state","pending"),
        db.from("native_fcm_devices").select("id",{count:"exact",head:true}).eq("enabled",true),
      ]);
      const mode=clean(Deno.env.get("DBEST_FCM_ROLLOUT_MODE"),20)||"off";
      return json({ok:true,pending:pending||0,registered:registered||0,
        sendingEnabled:Deno.env.get("DBEST_FCM_SEND_ENABLED")==="true",
        rolloutMode:["canary","all"].includes(mode)?mode:"off"
      });
    }
    if (action==="enqueue" || action==="preview") {
      const type=clean(b.eventType,80),recordId=clean(b.recordId,180);
      if(!SAFE_EVENTS.has(type)||!recordId) return json({error:"invalid_event"},400);
      const notice=await fromEvent(db,type,recordId);
      if(!notice)return json({ok:true,skipped:true,reason:"source_record_unavailable_or_ineligible"});
      if(action==="preview")return json({ok:true,preview:{eventType:type,recipientType:notice.recipient_type,
        category:notice.category,targetUrl:notice.target_url,sourceVerified:true}});
      const {data,error}=await db.from("native_fcm_outbox").upsert(notice,{onConflict:"event_key",ignoreDuplicates:true})
        .select("id,event_key,state").maybeSingle();
      if(error)throw error;
      return json({ok:true,queued:!!data,duplicate:!data,eventKey:notice.event_key});
    }
    if(action!=="process")return json({error:"unknown_action"},400);
    // Deploying the worker code by itself MUST NOT send a single message.
    if(Deno.env.get("DBEST_FCM_SEND_ENABLED")!=="true")
      return json({ok:true,processing:false,reason:"sending_disabled"});
    const mode=clean(Deno.env.get("DBEST_FCM_ROLLOUT_MODE"),20)||"off";
    if(mode!=="canary"&&mode!=="all")
      return json({ok:true,processing:false,reason:"rollout_mode_off"});
    if(mode==="all" && Deno.env.get("DBEST_FCM_FULL_ROLLOUT_APPROVED")!=="true")
      return json({ok:true,processing:false,reason:"full_rollout_not_approved"});
    const allowedPairs=new Set<string>();
    const canaryIds:string[]=[];
    if(mode==="canary"){
      let canaryConfig:unknown=[];
      try{canaryConfig=JSON.parse(Deno.env.get("DBEST_FCM_CANARY_RECIPIENTS_JSON")||"[]")}
      catch{return json({error:"canary_config_invalid"},503)}
      if(!Array.isArray(canaryConfig)||canaryConfig.length<1||canaryConfig.length>20)
        return json({error:"canary_config_missing_or_oversized"},503);
      for(const raw of canaryConfig){
        const role=clean(raw?.recipientType,30),id=clean(raw?.recipientId,180);
        if(!["Vendor","Vaahak","Service Partner"].includes(role)||!id)
          return json({error:"invalid_canary_identity"},503);
        allowedPairs.add(role+":"+id);
        canaryIds.push(id);
      }
    }
    const accountStr=Deno.env.get("DBEST_FCM_SERVICE_ACCOUNT_JSON")||"";
    if(!accountStr)return json({error:"fcm_sender_not_configured"},503);
    const account=JSON.parse(accountStr) as Record<string,string>;
    if(account.project_id!=="dbest-mobile-notifications"||!account.private_key||!account.client_email)
      return json({error:"fcm_sender_config_invalid"},503);
    const access=await accessToken(account);
    let queueQuery=db.from("native_fcm_outbox").select("*")
      .eq("state","pending").lte("next_attempt_at",new Date().toISOString());
    if(mode==="canary")queueQuery=queueQuery.in("recipient_id",[...new Set(canaryIds)]);
    const {data:queue,error:qe}=await queueQuery
      .order("created_at",{ascending:true}).limit(mode==="canary"?100:10);
    if(qe)throw qe;
    const selected=(queue||[]).filter(item=>
      mode==="all"||allowedPairs.has(item.recipient_type+":"+item.recipient_id)).slice(0,10);
    let sent=0,failed=0,skipped=0;
    for(const item of selected){
      const {data:claimed,error:ce}=await db.from("native_fcm_outbox")
        .update({state:"processing",attempts:item.attempts+1})
        .eq("id",item.id).eq("state","pending").select("*").maybeSingle();
      if(ce)throw ce;
      if(!claimed)continue;
      // Re-read the authoritative record before delivery to prevent alerts
      // going to reassigned Vaahaks or Service Partners.
      const latest = await fromEvent(db,item.event_type,
        item.event_key.split(":")[1] || "");
      if (!latest || latest.event_key !== item.event_key ||
          latest.recipient_id !== item.recipient_id ||
          latest.recipient_type !== item.recipient_type) {
        await db.from("native_fcm_outbox").update({
          state:"skipped",error_code:"source_changed_since_enqueue",
          processed_at:new Date().toISOString(),
        }).eq("id",item.id);
        skipped++;
        continue;
      }
      const {data:devices,error:de}=await db.from("native_fcm_devices").select("*")
        .eq("recipient_type",item.recipient_type).eq("recipient_id",item.recipient_id).eq("enabled",true).limit(10);
      if(de)throw de;
      const {data:pref}=await db.from("push_notification_preferences").select("*")
        .eq("recipient_type",item.recipient_type).eq("recipient_id",item.recipient_id).maybeSingle();
      if(!allowed(pref,item.category)||(devices||[]).length===0){
        await db.from("native_fcm_outbox").update({state:"skipped",error_code:!allowed(pref,item.category)?"opted_out":"no_registered_device",processed_at:new Date().toISOString()}).eq("id",item.id);
        skipped++;continue;
      }
      let hasFailure=false;
      for(const d of devices||[]){
        const {data:done}=await db.from("native_fcm_deliveries").select("state")
          .eq("outbox_id",item.id).eq("device_id",d.id).maybeSingle();
        if(done?.state==="sent")continue;
        let outcome:{ok:boolean;status:number;messageId:string;invalidToken:boolean};
        try{outcome=await sendFcm(d.fcm_token,access,account.project_id,item,d)}
        catch{outcome={ok:false,status:503,messageId:"",invalidToken:false}}
        await db.from("native_fcm_deliveries").upsert({
          outbox_id:item.id,device_id:d.id,state:outcome.ok?"sent":outcome.invalidToken?"invalid":"failed",
          provider_message_id:outcome.messageId||null,error_code:outcome.ok?null:"fcm_http_"+outcome.status,
          attempted_at:new Date().toISOString(),
        },{onConflict:"outbox_id,device_id"});
        if(outcome.ok)sent++;
        else {failed++;if(!outcome.invalidToken)hasFailure=true;}
        if(outcome.invalidToken)await db.from("native_fcm_devices").update({
          enabled:false,permission_status:"expired",updated_at:new Date().toISOString(),
        }).eq("id",d.id);
      }
      const finalState=hasFailure&&claimed.attempts<5?"pending":hasFailure?"dead":"sent";
      const backoff= Math.min(3600,60*Math.pow(2,Math.max(0,claimed.attempts-1)));
      await db.from("native_fcm_outbox").update({
        state:finalState,error_code:hasFailure?"delivery_retry_pending":null,
        next_attempt_at:new Date(Date.now()+backoff*1000).toISOString(),
        processed_at:finalState==="pending"?null:new Date().toISOString(),
      }).eq("id",item.id);
    }
    return json({ok:true,processed:selected.length,rolloutMode:mode,sent,failed,skipped});
  }catch(e){
    console.error("native_fcm_worker_failed",String((e as Error)?.message||"unknown"));
    return json({error:"worker_failed"},500);
  }
});
