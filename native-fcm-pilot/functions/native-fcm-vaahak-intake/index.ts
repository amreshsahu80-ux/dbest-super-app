import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import { eligible, dedupe, type Ride } from "./offer-rules.ts";

/** Isolated Vaahak ride-offer notification intake. Never changes Cab assignments.
 * By default preview-only. Enqueue requires two independent private switches.
 */
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{
  status,headers:{"content-type":"application/json","cache-control":"no-store"}
});

Deno.serve(async req=>{
  if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
  const roleKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const url=Deno.env.get("SUPABASE_URL")||"";
  if(!roleKey||!url||req.headers.get("apikey")!==roleKey)
    return reply({error:"trusted_service_only"},401);
  const db=createClient(url,roleKey,{auth:{persistSession:false,autoRefreshToken:false}});
  try{
    const input=await req.json().catch(()=>({}));
    const action=String(input.action||"");
    if(action!=="preview"&&action!=="enqueue")return reply({error:"invalid_action"},400);
    const jobId=String(input.jobId||"").trim();
    if(jobId && !/^VJ[A-Za-z0-9_-]{1,64}$/.test(jobId)) return reply({error:"invalid_job_id"},400);
    // Write path accepts exactly one dispatch-issued job ID, never bulk scans.
    if(action==="enqueue"&&!jobId)return reply({error:"job_id_required"},400);
    // Neither flag is enabled by this function, nor can callers override it.
    const intakeEnabled=Deno.env.get("DBEST_FCM_RIDE_INTAKE_ENABLED")==="true";
    const businessEnabled=Deno.env.get("DBEST_FCM_SEND_ENABLED")==="true";
    if(action==="enqueue"&&(!intakeEnabled||!businessEnabled))
      return reply({ok:true,queued:0,reason:"intake_or_sender_off"});
    const now=Date.now();
    let query=db.from("vaahak_jobs_live")
      .select("id,kind,status,offered_partner_id,assigned_partner_id,offer_attempt,offer_expires_at,dispatch_last_at")
      .eq("kind","ride").eq("status","Open")
      .not("offered_partner_id","is",null)
      .gt("offer_expires_at",new Date(now+60_000).toISOString())
      .gte("dispatch_last_at",new Date(now-330_000).toISOString());
    if(jobId) query=query.eq("id",jobId);
    const {data:rows,error}=await query.order("dispatch_last_at",{ascending:false})
      .limit(action==="enqueue"?1:100);
    if(error)throw error;
    let valid=0,approved=0,registered=0,queued=0,duplicates=0;
    for(const record of rows||[]){
      const ride=record as Ride;
      if(!eligible(ride,now))continue;
      valid++;
      const recipientId=String(ride.offered_partner_id);
      const {data:partner,error:pe}=await db.from("vaahak_partners_live")
        .select("owner_approval,available,operational_hold")
        .eq("id",recipientId).maybeSingle();
      if(pe)throw pe;
      if(!partner||partner.owner_approval!=="Approved"||
         partner.available!==true||partner.operational_hold===true)continue;
      approved++;
      const {data:pref,error:pr}=await db.from("push_notification_preferences")
        .select("rides").eq("recipient_type","Vaahak").eq("recipient_id",recipientId)
        .maybeSingle();
      if(pr)throw pr;
      if(pref?.rides===false)continue;
      const {count,error:de}=await db.from("native_fcm_devices")
        .select("id",{head:true,count:"exact"})
        .eq("recipient_type","Vaahak").eq("recipient_id",recipientId)
        .eq("app_id","com.dbest4u.partner").eq("enabled",true)
        .eq("permission_status","granted")
        .gte("last_seen_at",new Date(now-30*86400_000).toISOString());
      if(de)throw de;
      if(!count)continue;
      registered++;
      if(action==="preview")continue;
      const payload={
        event_key:dedupe(ride),event_type:"vaahak_ride_offer",
        recipient_type:"Vaahak",recipient_id:recipientId,category:"ride",
        title:"New DBest ride request",
        body:"A nearby ride is awaiting your response. Open DBest Partner.",
        target_url:"/vaahak"
      };
      const {data:added,error:upsertError}=await db.from("native_fcm_outbox")
        .upsert(payload,{onConflict:"event_key",ignoreDuplicates:true})
        .select("id").maybeSingle();
      if(upsertError)throw upsertError;
      if(added)queued++;else duplicates++;
    }
    return reply({ok:true,mode:action,validOffers:valid,approvedOffers:approved,
      registeredRecipientOffers:registered,queued,duplicates,
      intakeEnabled,businessSendingEnabled:businessEnabled});
  }catch(error){
    console.error("vaahak_fcm_intake_failed",error instanceof Error?error.name:"unknown");
    return reply({error:"intake_check_failed"},503);
  }
});