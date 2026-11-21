/**
 * Single shared source-of-truth for DBest event eligibility and recipient lookup.
 * Used by the staged worker at enqueue AND immediately before dispatch.
 * Pure DB reads; never writes, sends, or authenticates a caller.
 */
const clean = (x: unknown, n = 180) => String(x ?? "").trim().slice(0,n);
const SAFE_EVENTS = new Set([
  "marketplace_vendor_new_order", "marketplace_customer_status",
  "marketplace_payment_confirmed", "vaahak_ride_offer",
  "vaahak_ride_status", "service_partner_job_assigned", "service_customer_job_status",
]);
type Notice = { event_key: string; event_type: string; recipient_type: string; recipient_id: string;
  category: string; title: string; body: string; target_url: string; };
// Database schema is intentionally dynamic in this staged snapshot; the Notice
// return type and PostgreSQL integration tests enforce event payload contracts.
type Service = any;
export async function fromEvent(db: Service, type: string, recordId: string): Promise<Notice | null> {
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
