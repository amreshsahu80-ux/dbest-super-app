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
  category: string; title: string; body: string; target_url: string; expires_at?: string; };
const OUTBOX_KEYS = ["event_key","event_type","recipient_type","recipient_id","category","title","body","target_url"] as const;
function outboxFields(n: Notice) {
  return Object.fromEntries(OUTBOX_KEYS.map(k => [k,n[k]]));
}
function validOffer(r: Record<string,unknown>, now = Date.now()) {
  if (String(r.kind).toLowerCase() !== "ride" || String(r.status) !== "Open" ||
      !r.offered_partner_id || !!r.assigned_partner_id ||
      !Number.isInteger(Number(r.offer_attempt)) || Number(r.offer_attempt) <= 0) return false;
  const expires = Date.parse(String(r.offer_expires_at||""));
  const dispatched = Date.parse(String(r.dispatch_last_at||""));
  // Never alert for expired, stale, not-yet-issued or implausibly long offers.
  return Number.isFinite(expires) && Number.isFinite(dispatched) &&
    expires > now + 20_000 && expires <= now + 5*60_000 + 30_000 &&
    dispatched <= now + 15_000 && dispatched >= now - 5*60_000 - 30_000;
}
type Service = ReturnType<typeof createClient>;
async function fromEvent(db: Service, type: string, recordId: string): Promise<Notice | null> {
  if (!SAFE_EVENTS.has(type) || !recordId) return null;
  if (type.startsWith("marketplace_") && type !== "marketplace_payment_confirmed") {
    const { data: r, error } = await db.from("marketplace_orders_live")
      .select("id,vendor_id,customer_member_id,status,vendor_status")
      .eq("id", recordId).maybeSingle();
    if (error) throw error;
    if (!r) return null;
    if (type === "marketplace_vendor_new_order") return {
      event_key: type + ":" + r.id, event_type: type, recipient_type: "Vendor", recipient_id: r.vendor_id,
      category: "order", title: "New DBest Marketplace order",
      body: "A customer order is awaiting your review.", target_url: "/Vendor",
    };
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
      .select("id,kind,status,offered_partner_id,assigned_partner_id,customer_member_id,offer_attempt,offer_expires_at,dispatch_last_at")
      .eq("id", recordId).maybeSingle();
    if (error) throw error;
    if (!r) return null;
    if (type === "vaahak_ride_offer") {
      if (!validOffer(r)) return null;
      const target = clean(r.offered_partner_id,120);
      const attempt = Number(r.offer_attempt);
      return { event_key: type + ":" + r.id + ":" + attempt + ":" + target,
        event_type: type, recipient_type: "Vaahak", recipient_id: target,
        category: "ride", title: "New DBest ride request",
        body: "A nearby ride is available. Open your Vaahak workspace before the offer expires.",
        target_url: "/vaahak", expires_at: r.offer_expires_at };
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
      if (!r.assigned_partner_member_id || !["Assigned","Accepted","In Progress"].includes(clean(r.status))) return null;
      return { event_key: type + ":" + r.id + ":" + r.assigned_partner_member_id,
        event_type: type, recipient_type: "Service Partner", recipient_id: r.assigned_partner_member_id,
        category: "job", title: "DBest service assignment",
        body: "A service request has been assigned to your account.", target_url: "/ServicePartnerDashboard" };
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
    android:{ priority:"HIGH",
      ttl: d.event_type === "vaahak_ride_offer" ? 
        (Number(d.offer_ttl_seconds||0) > 0 ? String(d.offer_ttl_seconds)+"s" : "20s") : "300s",
      notification:{channel_id:channel} },
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
      return json({ok:true,pending:pending||0,registered:registered||0,sendingEnabled:Deno.env.get("DBEST_FCM_SEND_ENABLED")==="true"});
    }
    if (action==="enqueue" || action==="preview") {
      const type=clean(b.eventType,80),recordId=clean(b.recordId,180);
      if(!SAFE_EVENTS.has(type)||!recordId) return json({error:"invalid_event"},400);
      const notice=await fromEvent(db,type,recordId);
      if(!notice)return json({ok:true,skipped:true,reason:"source_record_unavailable_or_ineligible"});
      if(action==="preview")return json({ok:true,preview:{eventType:type,recipientType:notice.recipient_type,
        category:notice.category,targetUrl:notice.target_url,sourceVerified:true}});
      const {data,error}=await db.from("native_fcm_outbox").upsert(outboxFields(notice),{onConflict:"event_key",ignoreDuplicates:true})
        .select("id,event_key,state").maybeSingle();
      if(error)throw error;
      return json({ok:true,queued:!!data,duplicate:!data,eventKey:notice.event_key});
    }
    if(action!=="process")return json({error:"unknown_action"},400);
    if(Deno.env.get("DBEST_FCM_SEND_ENABLED")!=="true")
      return json({ok:true,processing:false,reason:"sending_disabled"});
    const accountStr=Deno.env.get("DBEST_FCM_SERVICE_ACCOUNT_JSON")||"";
    if(!accountStr)return json({error:"fcm_sender_not_configured"},503);
    const account=JSON.parse(accountStr) as Record<string,string>;
    if(account.project_id!=="dbest-mobile-notifications"||!account.private_key||!account.client_email)
      return json({error:"fcm_sender_config_invalid"},503);
    const access=await accessToken(account);
    const {data:queue,error:qe}=await db.from("native_fcm_outbox").select("*")
      .eq("state","pending").lte("next_attempt_at",new Date().toISOString())
      .order("created_at",{ascending:true}).limit(10);
    if(qe)throw qe;
    let sent=0,failed=0,skipped=0;
    for(const item of queue||[]){
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
        .eq("recipient_type",item.recipient_type).eq("recipient_id",item.recipient_id).eq("enabled",true)
        .eq("permission_status","granted")
        .gte("last_seen_at",new Date(Date.now()-30*24*3600_000).toISOString()).limit(10);
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
        // Short TTL ensures a delayed Android delivery does not revive an expired offer.
        const ttlSeconds = latest.event_type === "vaahak_ride_offer"
          ? Math.floor((Date.parse(latest.expires_at||"")-Date.now()-15_000)/1000) : 300;
        if (latest.event_type === "vaahak_ride_offer" && (!Number.isFinite(ttlSeconds) || ttlSeconds < 10)) {
          await db.from("native_fcm_outbox").update({
            state:"skipped",error_code:"ride_offer_expired_before_send",processed_at:new Date().toISOString(),
          }).eq("id",item.id);
          skipped++;
          hasFailure = false;
          break;
        }
        try{outcome=await sendFcm(d.fcm_token,access,account.project_id,
          {...item,offer_ttl_seconds:String(ttlSeconds)},d)}
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
    return json({ok:true,processed:(queue||[]).length,sent,failed,skipped});
  }catch(e){
    console.error("native_fcm_worker_failed",String((e as Error)?.message||"unknown"));
    return json({error:"worker_failed"},500);
  }
});
