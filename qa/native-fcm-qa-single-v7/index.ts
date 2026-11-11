import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import { buildOneDeviceVaahakQaPayload } from "./payload.ts";

/**
 * Controlled, explicitly opted-in single-device Vaahak QA. Does not read
 * or change live order/ride records. Never enables the event worker.
 *
 * Requires DBEST_FCM_SERVICE_ACCOUNT_JSON and
 * DBEST_FCM_QA_SEND_ENABLED=true in Supabase's private Edge Function secrets.
 * Both remain separate from DBEST_FCM_SEND_ENABLED (general delivery flag).
 */
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" },
});
const str = (v: unknown, max = 512) => String(v ?? "").trim().slice(0, max);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const encode = new TextEncoder();
const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

async function sha256(text: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encode.encode(text)));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function oauthToken(account: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now()/1000);
  const header = base64url(encode.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = base64url(encode.encode(JSON.stringify({
    iss: account.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now+1800,
  })));
  const unsigned = header + "." + claims;
  const pkcs8 = account.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const der = Uint8Array.from(atob(pkcs8), c => c.charCodeAt(0));
  const signingKey = await crypto.subtle.importKey("pkcs8", der, {
    name: "RSASSA-PKCS1-v1_5", hash: "SHA-256",
  }, false, ["sign"]);
  const signature = base64url(new Uint8Array(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", signingKey, encode.encode(unsigned))));
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: unsigned + "." + signature,
    }),
  });
  if (!response.ok) throw new Error("oauth_http_" + response.status);
  const payload = await response.json();
  if (!payload.access_token) throw new Error("oauth_missing_access_token");
  return String(payload.access_token);
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({error:"method_not_allowed"},405);
  const dbUrl = Deno.env.get("SUPABASE_URL") || "";
  const privateKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!dbUrl || !privateKey) return json({ error: "server_setup_unavailable" },503);
  const db = createClient(dbUrl,privateKey,{auth:{autoRefreshToken:false,persistSession:false}});
  const token = str(request.headers.get("x-vaahak-token"),700);
  if (token.length < 24) return json({error:"vaahak_login_required"},401);
  try {
    const {data:session,error:sessionError} = await db.from("vaahak_sessions_live")
      .select("partner_id").eq("token_hash",await sha256(token))
      .gt("expires_at",new Date().toISOString()).maybeSingle();
    if (sessionError) return json({error:"session_check_unavailable"},503);
    if (!session?.partner_id) return json({error:"vaahak_login_expired"},401);
    const {data:partner} = await db.from("vaahak_partners_live").select("owner_approval")
      .eq("id",session.partner_id).maybeSingle();
    if (partner?.owner_approval !== "Approved")
      return json({error:"approved_vaahak_required"},403);

    const body = await request.json().catch(() => ({}));
    const action = str(body.action,20).toLowerCase();
    const installationId = str(body.installationId,80);
    if (!uuid.test(installationId)) return json({error:"invalid_installation"},400);
    const {data:device,error:deviceError} = await db.from("native_fcm_devices")
      .select("id,fcm_token,app_id,enabled,permission_status")
      .eq("recipient_type","Vaahak").eq("recipient_id",session.partner_id)
      .eq("app_id","com.dbest4u.partner").eq("installation_id",installationId)
      .eq("enabled",true).eq("permission_status","granted").maybeSingle();
    if (deviceError) return json({error:"device_lookup_unavailable"},503);
    // A new controlled tap-routing QA session may run only when the private
    // QA switch is explicitly enabled. The general sender remains OFF.
    const qaEnabled = false; // Locked after successful Android notification tap QA.
    const senderConfigured = !!Deno.env.get("DBEST_FCM_SERVICE_ACCOUNT_JSON");

    if (action === "status") return json({
      ok:true,approvedVaahak:true,registered:!!device,
      qaEnabled,senderConfigured,
      generalSendingEnabled:Deno.env.get("DBEST_FCM_SEND_ENABLED")==="true",
    });
    if (action !== "send") return json({error:"action_not_allowed"},400);
    if (body.consent !== true) return json({error:"explicit_test_consent_required"},403);
    if (!device) return json({error:"active_linked_device_required"},403);
    if (!qaEnabled) return json({error:"qa_sender_disabled"},503);
    if (Deno.env.get("DBEST_FCM_SEND_ENABLED")==="true") return json({error:"general_sender_must_remain_off"},503);
    if (!senderConfigured) return json({error:"service_account_missing"},503);

    const {count:daily,error:countError}=await db.from("native_fcm_qa_attempts")
      .select("id",{head:true,count:"exact"}).eq("device_id",device.id)
      .gte("created_at",new Date(Date.now()-24*60*60*1000).toISOString());
    if (countError) return json({error:"rate_check_unavailable"},503);
    if ((daily||0)>=3) return json({error:"daily_test_limit_reached"},429);

    // Unique 15-minute bucket: concurrent or repeated calls cannot send twice.
    const bucket = new Date(Math.floor(Date.now()/900_000)*900_000).toISOString();
    const {data:attempt,error:insertError}=await db.from("native_fcm_qa_attempts")
      .insert({device_id:device.id,recipient_type:"Vaahak",recipient_id:session.partner_id,
        bucket_utc:bucket,state:"processing"})
      .select("id").maybeSingle();
    if (insertError?.code === "23505") return json({error:"test_already_requested_this_window"},429);
    if (insertError || !attempt) return json({error:"test_audit_unavailable"},503);

    let errorCode: string|null = null;
    let messageId: string|null = null;
    try {
      const account = JSON.parse(Deno.env.get("DBEST_FCM_SERVICE_ACCOUNT_JSON")||"{}");
      if (account.project_id!=="dbest-mobile-notifications" || !account.private_key || !account.client_email)
        throw new Error("firebase_project_or_credentials_invalid");
      const access = await oauthToken(account);
      // The Android production v7 receiver rejects qa_vaahak_one_device.
      // Use its approved event type plus a synthetic, unique event key.
      // Audit attempt ID provides idempotency; this creates NO actual ride.
      const payload = buildOneDeviceVaahakQaPayload(device.fcm_token,attempt.id);
      const sent = await fetch("https://fcm.googleapis.com/v1/projects/dbest-mobile-notifications/messages:send",{
        method:"POST",
        headers:{"authorization":"Bearer "+access,"content-type":"application/json"},
        body:JSON.stringify(payload),
      });
      const result = await sent.json().catch(()=>({}));
      if (!sent.ok) throw new Error("fcm_http_"+sent.status);
      messageId = str(result.name,400);
      if (!messageId) throw new Error("fcm_missing_message_id");
    } catch (error) {
      const category = str(error instanceof Error ? error.message : "unknown",100);
      // Logs record a coarse error code; never log tokens or credentials.
      errorCode = /^([a-z_]+|fcm_http_\d{3}|oauth_http_\d{3})$/.test(category)
        ? category : "delivery_error";
    }
    const accepted = messageId !== null;
    const {error:auditError}=await db.from("native_fcm_qa_attempts")
      .update({
        state:accepted?"accepted":"failed",
        provider_message_id:messageId,
        error_code:errorCode,
        completed_at:new Date().toISOString(),
      }).eq("id",attempt.id);
    if (auditError) return json({error:"audit_write_failed"},503);
    return json(accepted
      ? {ok:true,providerAccepted:true,deliveredToDevice:false,qaAttemptId:attempt.id}
      : {ok:false,providerAccepted:false,error:errorCode}, accepted?200:502);
  } catch(error) {
    console.error("qa_fcm_internal_error",str(error instanceof Error ? error.name : "unknown",50));
    return json({error:"qa_test_unavailable"},503);
  }
});