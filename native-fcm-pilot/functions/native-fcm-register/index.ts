import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

// Auth is DBest's existing hashed, expiring app-session tokens, NOT Supabase Auth JWT.
// No service role credentials are returned to callers; all data tables are private.
const cors = {
  "Access-Control-Allow-Origin": "https://dbest4u.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-dbest-member-token, x-vendor-token, x-vaahak-token, x-dbest-partner-token",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: cors });
const clean = (x: unknown, n = 700) => String(x ?? "").trim().slice(0, n);
async function digest(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, "0")).join("");
}
const sessionTypes = [
  { header: "x-dbest-member-token", table: "member_sessions_live", ref: "member_id", role: "Member" },
  { header: "x-vendor-token", table: "marketplace_vendor_sessions_live", ref: "vendor_id", role: "Vendor" },
  { header: "x-vaahak-token", table: "vaahak_sessions_live", ref: "partner_id", role: "Vaahak" },
  { header: "x-dbest-partner-token", table: "partner_sessions_live", ref: "account_id", role: "Service Partner" },
] as const;
const appAllowed = (role: string, appId: string) => role === "Member"
  ? ["com.dbest4u.app", "com.dbest4u.app.test"].includes(appId)
  : appId === "com.dbest4u.partner";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !key) return json({ error: "service_unavailable" }, 503);
  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  try {
    const found = sessionTypes.filter(item => !!clean(req.headers.get(item.header), 700));
    if (found.length !== 1) return json({ error: "exactly_one_dbest_session_required" }, 401);
    const item = found[0];
    const token = clean(req.headers.get(item.header), 700);
    const { data: session, error: se } = await db.from(item.table)
      .select(item.ref).eq("token_hash", await digest(token))
      .gt("expires_at", new Date().toISOString()).maybeSingle();
    if (se) return json({ error: "session_validation_unavailable" }, 503);
    const recipientId = clean(session?.[item.ref], 180);
    if (!recipientId) return json({ error: "session_expired_or_invalid" }, 401);

    const b = await req.json().catch(() => ({}));
    const action = clean(b.action, 35).toLowerCase();
    if (action === "status") {
      const { data, error } = await db.from("native_fcm_devices")
        .select("app_id,installation_id,enabled,permission_status,last_seen_at")
        .eq("recipient_type", item.role).eq("recipient_id", recipientId)
        .order("last_seen_at", { ascending: false }).limit(20);
      if (error) throw error;
      return json({ ok: true, role: item.role, activeCount: (data ?? []).filter(d => d.enabled).length, devices: data ?? [] });
    }
    const appId = clean(b.appId, 100);
    const installationId = clean(b.installationId, 80);
    if (!appAllowed(item.role, appId) || !uuid.test(installationId))
      return json({ error: "invalid_app_or_installation" }, 400);
    if (action === "unregister") {
      const { error } = await db.from("native_fcm_devices").delete()
        .eq("recipient_type", item.role).eq("recipient_id", recipientId)
        .eq("app_id", appId).eq("installation_id", installationId);
      if (error) throw error;
      return json({ ok: true, registered: false });
    }
    if (action !== "register") return json({ error: "unknown_action" }, 400);
    if (b.consent !== true || b.permissionStatus !== "granted")
      return json({ error: "notification_consent_required" }, 403);
    const fcmToken = clean(b.fcmToken, 4096);
    if (fcmToken.length < 40 || fcmToken.length > 4096 || !/^[A-Za-z0-9:_\\.~-]+$/.test(fcmToken))
      return json({ error: "invalid_fcm_token" }, 400);
    const { count, error: countError } = await db.from("native_fcm_devices")
      .select("id", { count: "exact", head: true }).eq("recipient_type", item.role)
      .eq("recipient_id", recipientId).eq("enabled", true);
    if (countError) throw countError;
    const { data: prior } = await db.from("native_fcm_devices")
      .select("id").eq("recipient_type", item.role).eq("recipient_id", recipientId)
      .eq("app_id", appId).eq("installation_id", installationId).maybeSingle();
    if ((count ?? 0) >= 10 && !prior) return json({ error: "device_limit_reached" }, 409);
    const now = new Date().toISOString();
    const row = { recipient_type: item.role, recipient_id: recipientId, app_id: appId,
      installation_id: installationId, fcm_token: fcmToken, token_hash: await digest(fcmToken),
      enabled: true, permission_status: "granted", last_seen_at: now, updated_at: now };
    // A token must not remain attached to a previous user after switching accounts.
    const { error: oldError } = await db.from("native_fcm_devices").delete()
      .eq("token_hash", row.token_hash)
      .neq("recipient_id", recipientId);
    if (oldError) throw oldError;
    const { error } = await db.from("native_fcm_devices")
      .upsert(row, { onConflict: "app_id,installation_id" });
    if (error) throw error;
    return json({ ok: true, registered: true, role: item.role, appId });
  } catch (e) {
    console.error("native_fcm_registration_failed", String((e as Error)?.message ?? "unknown"));
    return json({ error: "registration_failed" }, 500);
  }
});
