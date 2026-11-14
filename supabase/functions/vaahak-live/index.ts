import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-dbest-owner-token, x-vaahak-token","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const enc=new TextEncoder();
const SAFE_JOB_FIELDS="id,tx_id,kind,customer_name,customer_mobile,pickup,dropoff,pickup_lat,pickup_lng,drop_lat,drop_lng,distance_km,fare,vehicle_type,status,assigned_partner_id,partner_earning,payment_status,payment_method,order_meta,accepted_at,started_at,completed_at,cancelled_at,cancelled_by,cancellation_reason,created_at,updated_at";
async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",enc.encode(v));return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,"0")).join("")}
function id(prefix:string){return prefix+Date.now().toString().slice(-9)+Math.floor(Math.random()*90+10)}
function json(body:any,status=200){return new Response(JSON.stringify(body),{status,headers:cors})}
const esc=(s:any)=>String(s??'').replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;"}[c]||c));

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 try{
  const url=Deno.env.get("SUPABASE_URL")!,serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const b=await req.json().catch(()=>({}));
  const action=String(b.action||"");

  async function partnerSession(){
   const token=String(req.headers.get("x-vaahak-token")||b.token||"").trim();
   if(!token)return null;
   const h=await sha(token);
   const {data:s}=await sb.from("vaahak_sessions_live").select("partner_id,expires_at").eq("token_hash",h).gt("expires_at",new Date().toISOString()).maybeSingle();
   if(!s)return null;
   const {data:p}=await sb.from("vaahak_partners_live").select("*").eq("id",s.partner_id).maybeSingle();
   return p||null;
  }
  async function getWorkPrefs(partnerId:string){
   const {data}=await sb.from("vaahak_partner_preferences_live").select("services").eq("partner_id",partnerId).maybeSingle();
   const s=(data?.services&&typeof data.services==="object")?data.services:{};
   return {rides:s.rides!==false,deliveries:(s.deliveries!==false&&s.marketplace!==false),carpool:s.carpool!==false};
  }
  async function ownerEmail(){
   const token=String(req.headers.get("x-dbest-owner-token")||"").trim();
   if(!token)return null;
   const {data,error}=await sb.rpc("validate_owner_session",{p_token:token});
   return error?null:data;
  }
  async function sendCompletionMail(job:any,partner:any){
   if(job.completion_email_sent_at)return {sent:false,already:true};
   let email=String(job.customer_email||"").trim().toLowerCase();
   let memberName=String(job.customer_name||"Customer");
   if(!email&&job.customer_member_id){
    const {data:m}=await sb.from("onboarding_records").select("email,name").eq("kind","member").eq("external_id",job.customer_member_id).is("deleted_at",null).order("updated_at",{ascending:false}).limit(1).maybeSingle();
    if(m){email=String(m.email||"").trim().toLowerCase();memberName=String(m.name||memberName)}
   }
   if(!email&&job.customer_mobile){
    const mob=String(job.customer_mobile).replace(/\D/g,"").slice(-10);
    const {data:rows}=await sb.from("onboarding_records").select("email,name,mobile,status,payment_status,updated_at").eq("kind","member").is("deleted_at",null).order("updated_at",{ascending:false}).limit(20);
    const m=(rows||[]).find((x:any)=>String(x.status)==="Active"&&String(x.payment_status)==="Approved"&&String(x.email||"").includes("@")&&String((x as any).mobile||"").replace(/\D/g,"").slice(-10)===mob);
    if(m){email=String(m.email||"").trim().toLowerCase();memberName=String(m.name||memberName)}
   }
   if(!email||!email.includes("@"))return {sent:false,error:"customer_email_missing"};
   const voucher=String(job.completion_voucher_no||(`DBR-${String(job.id||"").replace(/^VJ/,"")}`));
   if(!job.completion_voucher_no)await sb.from("vaahak_jobs_live").update({completion_voucher_no:voucher}).eq("id",job.id);
   const {data:resendKey,error:secretErr}=await sb.rpc("get_dbest_secret",{p_name:"dbest_resend_api_key"});
   if(secretErr||!resendKey)return {sent:false,error:"email_service_unavailable"};
   const fare=Number(job.fare||0),dist=Number(job.distance_km||0);
   const completed=new Date(job.completed_at||Date.now()).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"});
   const subject=`DBest Ride Completed — Voucher ${voucher}`;
   const text=`Hi ${memberName}, your DBest ride is completed successfully. Voucher: ${voucher}. Ride ID: ${job.id}. Pickup: ${job.pickup}. Drop: ${job.dropoff}. Distance: ${dist.toFixed(1)} km. Fare: ₹${fare.toFixed(0)}. Vaahak: ${partner?.name||job.assigned_partner_id||''}. Completed: ${completed}. Thank you for riding with DBest.`;
   const html=`<!doctype html><html><body style="margin:0;background:#f4f7fc;font-family:Arial,Helvetica,sans-serif;color:#13213a"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding-top:24px;padding-bottom:24px"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #e1e8f2;border-radius:16px"><tr><td bgcolor="#175cff" style="background-color:#175cff;padding-top:24px;padding-right:24px;padding-bottom:24px;padding-left:24px"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;color:#dfe8ff">DBest Ride Completion</p><p style="margin-top:8px;margin-bottom:0;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:32px;color:#ffffff;font-weight:700">Ride completed successfully</p></td></tr><tr><td style="padding-top:24px;padding-right:24px;padding-bottom:24px;padding-left:24px"><p style="margin-top:0;margin-bottom:16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#13213a">Hi ${esc(memberName)}, thank you for riding with DBest.</p><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #dfe7f2;border-radius:12px"><tr><td bgcolor="#f6f9ff" style="background-color:#f6f9ff;padding-top:14px;padding-right:14px;padding-bottom:14px;padding-left:14px"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#64748b">RIDE VOUCHER</p><p style="margin-top:4px;margin-bottom:0;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:28px;color:#175cff;font-weight:700">${esc(voucher)}</p></td></tr><tr><td style="padding-top:14px;padding-right:14px;padding-bottom:14px;padding-left:14px"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#13213a"><b>Ride ID:</b> ${esc(job.id)}<br><b>Pickup:</b> ${esc(job.pickup)}<br><b>Drop:</b> ${esc(job.dropoff)}<br><b>Distance:</b> ${dist.toFixed(1)} km<br><b>Fare:</b> ₹${fare.toLocaleString('en-IN')}<br><b>Vaahak:</b> ${esc(partner?.name||job.assigned_partner_id||'')} ${partner?.vehicle_no?`(${esc(partner.vehicle_no)})`:''}<br><b>Completed:</b> ${esc(completed)}</p></td></tr></table><p style="margin-top:20px;margin-bottom:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:#64748b">Please retain this email as your ride completion voucher/receipt.</p><p style="margin-top:22px;margin-bottom:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#13213a">Regards,<br><b>DBest / Sarwashresth Services OPC Pvt. Ltd.</b></p></td></tr></table></td></tr></table></body></html>`;
   const mail=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${resendKey}`,"Content-Type":"application/json"},body:JSON.stringify({from:"DBest Rides <no-reply@dbest4u.com>",to:[email],subject,text,html,tags:[{name:"purpose",value:"ride-completion-voucher"},{name:"ride",value:String(job.id).slice(0,50)}]})});
   if(!mail.ok){console.error("Ride completion email failed",mail.status,await mail.text());return {sent:false,error:"ride_completion_email_failed"};}
   await sb.from("vaahak_jobs_live").update({customer_email:email,completion_voucher_no:voucher,completion_email_sent_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",job.id);
   return {sent:true,voucher,email};
  }

  if(action==="register"){
   const name=String(b.name||"").trim(),mobile=String(b.mobile||"").replace(/\D/g,""),email=String(b.email||"").trim().toLowerCase(),pin=String(b.pin||"").trim(),vehicle=String(b.vehicle||"").trim(),vehicleNo=String(b.vehicleNo||"").trim().toUpperCase();
   if(name.length<2||mobile.length<10||!/^\d{4,8}$/.test(pin)||!vehicle)return json({error:"required_fields_missing"},400);
   let leaderId:string|null=null,launchId:string|null=null;
   const leaderToken=String(b.leaderOnboardToken||"").trim();
   if(leaderToken){
     const {data:l}=await sb.from("leader_partner_onboarding_launches").select("id,leader_id,status,expires_at").eq("token_hash",await sha(leaderToken)).eq("partner_type","Vaahak").in("status",["Launched","Claimed"]).gt("expires_at",new Date().toISOString()).maybeSingle();
     if(!l)return json({error:"leader_onboarding_link_invalid_or_expired"},410);
     const {data:m}=await sb.from("onboarding_records").select("external_id,category,status").eq("kind","member").eq("external_id",l.leader_id).is("deleted_at",null).maybeSingle();
     if(!m||String(m.category||"").toLowerCase()!=="leader"||String(m.status||"").toLowerCase()!=="active")return json({error:"leader_not_active"},403);
     leaderId=String(l.leader_id);launchId=String(l.id);
   }
   const pid=id("VHK");
   const {error}=await sb.from("vaahak_partners_live").insert({id:pid,name,mobile,email:email||null,pin_hash:await sha(pin),vehicle,vehicle_no:vehicleNo||null,can_ride:b.canRide!==false,can_deliver:b.canDeliver!==false,owner_approval:"Pending",agreement_status:"Pending",available:false,onboarding_leader_id:leaderId});
   if(error){if(String(error.code)==="23505")return json({error:"mobile_already_registered"},409);throw error}
   await sb.from("vaahak_partner_preferences_live").upsert({partner_id:pid,services:{rides:b.canRide!==false,deliveries:b.canDeliver!==false,carpool:b.canRide!==false,marketplace:b.canDeliver!==false},updated_at:new Date().toISOString()},{onConflict:"partner_id"});
   if(b.whatsappConsent===true){await sb.from("whatsapp_contact_preferences").upsert({recipient_type:"Vaahak",recipient_id:pid,mobile_e164:mobile.length===10?"91"+mobile:mobile,opted_in:true,opt_in_source:"DBest Vaahak onboarding consent",opt_in_at:new Date().toISOString(),opted_out_at:null,transactional_enabled:true,marketing_enabled:false,updated_at:new Date().toISOString()},{onConflict:"recipient_type,recipient_id"});}
   if(launchId)await sb.from("leader_partner_onboarding_launches").update({partner_id:pid,applicant_email:email||null,applicant_mobile:mobile,status:"Claimed",claimed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",launchId);
   // Best-effort Owner notification. Registration must succeed even if mail delivery fails.
   try {
     const {data:resendKey}=await sb.rpc("get_dbest_secret",{p_name:"dbest_resend_api_key"});
     if(resendKey){
       const mail=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${resendKey}`,"Content-Type":"application/json"},body:JSON.stringify({
         from:"DBest Partners <no-reply@dbest4u.com>",
         to:["director@thebestservices.org.in"],
         subject:`DBest Vaahak registration pending review — ${pid}`,
         text:`A new Vaahak has registered and is awaiting Owner review. Name: ${name}. Partner ID: ${pid}. Vehicle: ${vehicle}. Open the secure Owner KYC console to review documents before approval. Do not approve until all required documents are verified.`,
         tags:[{name:"purpose",value:"vaahak-owner-registration"},{name:"partner",value:pid.slice(0,50)}]
       })});
       if(!mail.ok)console.error("Vaahak Owner registration notification failed",mail.status,await mail.text());
     }else console.error("Vaahak Owner notification skipped: mail service unavailable");
   }catch(mailError){console.error("Vaahak Owner registration notification error",mailError)}
   return json({ok:true,id:pid,status:"Pending Owner Approval",leaderAttributed:!!leaderId});
  }

  if(action==="login"){
   const login=String(b.login||"").trim(),pin=String(b.pin||"").trim();
   const isMobile=/^\d{10,}$/.test(login.replace(/\D/g,""));
   let q=sb.from("vaahak_partners_live").select("*");q=isMobile?q.eq("mobile",login.replace(/\D/g,"")):q.eq("id",login.toUpperCase());
   const {data:p}=await q.maybeSingle();if(!p||p.pin_hash!==await sha(pin))return json({error:"invalid_login"},401);
   const token=crypto.randomUUID()+crypto.randomUUID();await sb.from("vaahak_sessions_live").delete().eq("partner_id",p.id);await sb.from("vaahak_sessions_live").insert({token_hash:await sha(token),partner_id:p.id,expires_at:new Date(Date.now()+7*86400000).toISOString()});
   const {pin_hash,...safe}=p;return json({ok:true,token,partner:safe});
  }

  if(action==="status"){
   const p=await partnerSession();if(!p)return json({error:"vaahak_session_invalid"},401);
   let jobs:any[]=[];
   const {data:ownActive}=await sb.from("vaahak_jobs_live").select(SAFE_JOB_FIELDS).eq("assigned_partner_id",p.id).in("status",["Accepted","Trip Started"]).order("created_at",{ascending:false}).limit(1);
   if((ownActive||[]).length)jobs=ownActive||[];
   else if(p.owner_approval==="Approved"&&p.available){const {data}=await sb.from("vaahak_jobs_live").select(SAFE_JOB_FIELDS).eq("status","Open").is("assigned_partner_id",null).order("created_at",{ascending:false}).limit(1);jobs=data||[];}
   else{const {data}=await sb.from("vaahak_jobs_live").select(SAFE_JOB_FIELDS).eq("assigned_partner_id",p.id).order("created_at",{ascending:false}).limit(20);jobs=data||[];}
   const prefs=await getWorkPrefs(p.id);const {pin_hash,...safe}=p;return json({ok:true,partner:safe,jobs,workPreferences:prefs});
  }

  if(action==="work_preferences"){
   const p=await partnerSession();if(!p)return json({error:"vaahak_session_invalid"},401);
   if(b.update===true){
     const current=await getWorkPrefs(p.id);
     const next={rides:b.rides===undefined?current.rides:!!b.rides,deliveries:b.deliveries===undefined?current.deliveries:!!b.deliveries,carpool:b.carpool===undefined?current.carpool:!!b.carpool};
     const {data:old}=await sb.from("vaahak_partner_preferences_live").select("services").eq("partner_id",p.id).maybeSingle();
     const merged={...((old?.services&&typeof old.services==="object")?old.services:{}),...next,marketplace:next.deliveries};
     await sb.from("vaahak_partner_preferences_live").upsert({partner_id:p.id,services:merged,updated_at:new Date().toISOString()},{onConflict:"partner_id"});
     await sb.from("vaahak_partners_live").update({can_ride:next.rides||next.carpool,can_deliver:next.deliveries,updated_at:new Date().toISOString()}).eq("id",p.id);
     return json({ok:true,workPreferences:next});
   }
   return json({ok:true,workPreferences:await getWorkPrefs(p.id)});
  }

  if(action==="availability"){
   const p=await partnerSession();if(!p)return json({error:"vaahak_session_invalid"},401);if(p.owner_approval!=="Approved")return json({error:"owner_approval_pending"},409);
   const available=!!b.available;await sb.from("vaahak_partners_live").update({available,updated_at:new Date().toISOString()}).eq("id",p.id);return json({ok:true,available});
  }

  if(action==="change_pin"){
   const p=await partnerSession();if(!p)return json({error:"vaahak_session_invalid"},401);const currentPin=String(b.currentPin||"").trim(),newPin=String(b.newPin||"").trim();
   if(!/^\d{4,8}$/.test(newPin))return json({error:"pin_must_be_4_to_8_digits"},400);if(p.pin_hash!==await sha(currentPin))return json({error:"current_pin_incorrect"},401);
   await sb.from("vaahak_partners_live").update({pin_hash:await sha(newPin),updated_at:new Date().toISOString()}).eq("id",p.id);await sb.from("vaahak_sessions_live").delete().eq("partner_id",p.id);return json({ok:true,relogin:true});
  }

  if(action==="accept"){
   const p=await partnerSession();if(!p)return json({error:"vaahak_session_invalid"},401);if(p.owner_approval!=="Approved"||!p.available)return json({error:"vaahak_not_available"},409);
   const {data:active}=await sb.from("vaahak_jobs_live").select("id").eq("assigned_partner_id",p.id).in("status",["Accepted","Trip Started"]).limit(1);if((active||[]).length)return json({error:"vaahak_already_has_active_ride"},409);
   const jobId=String(b.jobId||"");const {data,error}=await sb.from("vaahak_jobs_live").update({assigned_partner_id:p.id,status:"Accepted",accepted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",jobId).eq("status","Open").is("assigned_partner_id",null).select(SAFE_JOB_FIELDS).maybeSingle();
   if(error||!data)return json({error:"ride_already_taken"},409);return json({ok:true,job:data});
  }

  if(action==="reject"){const p=await partnerSession();if(!p)return json({error:"vaahak_session_invalid"},401);return json({ok:true});}

  if(action==="start"){
   const p=await partnerSession();if(!p)return json({error:"vaahak_session_invalid"},401);
   const jobId=String(b.jobId||"").trim(),rideOtp=String(b.otp||"").replace(/\D/g,"");if(!/^\d{4}$/.test(rideOtp))return json({error:"ride_otp_required"},400);
   const {data:job}=await sb.from("vaahak_jobs_live").select("id,status,assigned_partner_id,otp").eq("id",jobId).eq("assigned_partner_id",p.id).maybeSingle();
   if(!job||job.status!=="Accepted")return json({error:"ride_not_ready_to_start"},409);
   const stored=String(job.otp||"").replace(/\D/g,"");if(stored!==rideOtp)return json({error:"invalid_ride_otp"},401);
   const {data}=await sb.from("vaahak_jobs_live").update({status:"Trip Started",started_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",jobId).eq("assigned_partner_id",p.id).eq("status","Accepted").select(SAFE_JOB_FIELDS).maybeSingle();
   if(!data)return json({error:"ride_not_ready_to_start"},409);return json({ok:true,job:data,otpVerified:true});
  }

  if(action==="confirm_payment"){
   const p=await partnerSession();if(!p)return json({error:"vaahak_session_invalid"},401);
   const jobId=String(b.jobId||"").trim(),method=String(b.method||"").trim();
   if(!jobId)return json({error:"job_id_required"},400);
   if(!["Cash","UPI","Online / Other"].includes(method))return json({error:"invalid_payment_method"},400);
   const {data:job}=await sb.from("vaahak_jobs_live").select("id,kind,status,assigned_partner_id,payment_status,payment_method").eq("id",jobId).eq("assigned_partner_id",p.id).maybeSingle();
   if(!job)return json({error:"job_not_found"},404);
   if(job.kind!=="ride")return json({error:"ride_payment_only"},409);
   if(job.status!=="Trip Started"&&job.status!=="Completed")return json({error:"ride_not_ready_for_payment"},409);
   if(["Received","Paid"].includes(String(job.payment_status||"")))return json({ok:true,job,alreadyConfirmed:true});
   const now=new Date().toISOString();
   const {data,error}=await sb.from("vaahak_jobs_live").update({payment_status:"Received",payment_method:method,payment_received_at:now,payment_confirmed_by:p.id,updated_at:now}).eq("id",jobId).eq("assigned_partner_id",p.id).select(SAFE_JOB_FIELDS).maybeSingle();
   if(error)throw error;if(!data)return json({error:"payment_update_failed"},409);
   return json({ok:true,job:data})
  }

  if(action==="start_return"){
   const p=await partnerSession();if(!p)return json({error:"vaahak_session_invalid"},401);const jobId=String(b.jobId||"");
   const {data:ready}=await sb.from("vaahak_jobs_live").select("id,kind,status,assigned_partner_id,order_meta").eq("id",jobId).eq("assigned_partner_id",p.id).maybeSingle();
   if(!ready)return json({error:"job_not_found"},404);if(ready.kind!=="ride"||ready.status!=="Trip Started")return json({error:"ride_not_ready_for_return"},409);
   const meta=(ready.order_meta&&typeof ready.order_meta==="object")?ready.order_meta:{};if(!(meta.roundTrip===true&&meta.sameVehicle===true))return json({error:"not_a_same_vehicle_return_ride"},409);
   if(String(meta.returnLegStatus||"")==="started")return json({ok:true,alreadyStarted:true});
   const now=new Date().toISOString(),next={...meta,returnLegStatus:"started",returnStartedAt:now};
   const {data,error}=await sb.from("vaahak_jobs_live").update({order_meta:next,updated_at:now}).eq("id",jobId).eq("assigned_partner_id",p.id).eq("status","Trip Started").select(SAFE_JOB_FIELDS).maybeSingle();if(error)throw error;if(!data)return json({error:"ride_not_ready_for_return"},409);return json({ok:true,job:data});
  }

  if(action==="complete"){
   const p=await partnerSession();if(!p)return json({error:"vaahak_session_invalid"},401);const jobId=String(b.jobId||"");
   const {data:ready}=await sb.from("vaahak_jobs_live").select("id,tx_id,kind,status,assigned_partner_id,payment_status,payment_method,order_meta").eq("id",jobId).eq("assigned_partner_id",p.id).maybeSingle();
   if(!ready)return json({error:"job_not_found"},404);
   if(ready.kind!=="ride")return json({error:"ride_completion_only"},409);
   if(ready.status!=="Trip Started")return json({error:"ride_not_ready_to_complete"},409);
   const meta=(ready.order_meta&&typeof ready.order_meta==="object")?ready.order_meta:{};if(meta.roundTrip===true&&meta.sameVehicle===true&&String(meta.returnLegStatus||"")!=="started")return json({error:"return_leg_not_started"},409);
   if(!["Received","Paid","Prepaid","Razorpay Verified"].includes(String(ready.payment_status||"")))return json({error:"payment_confirmation_required"},409);
   const completedAt=new Date().toISOString();
   const {data,error}=await sb.from("vaahak_jobs_live").update({status:"Completed",completed_at:completedAt,updated_at:completedAt}).eq("id",jobId).eq("assigned_partner_id",p.id).eq("status","Trip Started").select("*").maybeSingle();
   if(error)throw error;if(!data)return json({error:"ride_not_ready_to_complete"},409);
   const txKey=String(data.tx_id||ready.tx_id||"");const {data:txExisting}=await sb.from("transactions").select("metadata").eq("transaction_id",txKey).maybeSingle();const mergedMeta={...((txExisting?.metadata&&typeof txExisting.metadata==="object")?txExisting.metadata:{}),ride_live_status:"Completed",ride_live_job_id:data.id,ride_completed_at:completedAt};await sb.from("transactions").update({payment_status:"Paid",payment_mode:String(data.payment_method||ready.payment_method||""),updated_at:completedAt,metadata:mergedMeta}).eq("transaction_id",txKey);
   const mail=await sendCompletionMail(data,p).catch(e=>{console.error(e);return {sent:false,error:"ride_completion_email_failed"}});
   fetch(url+"/functions/v1/dbest-points-live",{method:"POST",headers:{apikey:serviceKey,"Content-Type":"application/json"},body:JSON.stringify({action:"earn_internal",service:"cab",reference:data.id})}).catch(e=>console.error("ride points credit failed",e));
   fetch(url+"/functions/v1/vaahak-kitty-live",{method:"POST",headers:{apikey:serviceKey,"Content-Type":"application/json"},body:JSON.stringify({action:"credit_cab_points",reference:data.id})}).catch(e=>console.error("cab kitty credit failed",e));
   const safe:any={};for(const k of SAFE_JOB_FIELDS.split(','))safe[k]=data[k];return json({ok:true,job:safe,email:mail});
  }

  if(action==="create_ride"){
   const txId=String(b.txId||"").trim(),pickup=String(b.pickup||"").trim(),dropoff=String(b.drop||"").trim();let fare=Number(b.fare||0),dist=Number(b.distanceKm||0);
   if(txId.length<2||txId.length>100||pickup.length<2||dropoff.length<2||!Number.isFinite(fare)||fare<=0||fare>100000)return json({error:"invalid_ride_request"},400);
   const {data:txRow}=await sb.from("transactions").select("amount").eq("transaction_id",txId).maybeSingle();
   const customerPayable=Number(b.customerPayable||fare),pointsDiscount=Math.max(0,Number(b.pointsDiscount||0));
   if(txRow&&Number(txRow.amount||0)>0){const authoritative=Number(txRow.amount);if(Math.abs(authoritative-customerPayable)>1)return json({error:"ride_payable_mismatch",authoritativePayable:authoritative},409);if(pointsDiscount<=0)fare=authoritative;}
   const existing=await sb.from("vaahak_jobs_live").select("id").eq("tx_id",txId).maybeSingle();if(existing.data)return json({error:"ride_already_created"},409);
   const jobId=id("VJ"),otp=String(Math.floor(1000+Math.random()*9000)),customerToken=crypto.randomUUID()+crypto.randomUUID();
   const row={id:jobId,tx_id:txId,kind:"ride",customer_name:String(b.customerName||"").slice(0,120),customer_mobile:String(b.customerMobile||"").replace(/\D/g,"").slice(-15),customer_email:String(b.customerEmail||"").trim().toLowerCase().slice(0,254)||null,customer_member_id:String(b.customerMemberId||"").trim().slice(0,80)||null,pickup:pickup.slice(0,300),dropoff:dropoff.slice(0,300),pickup_lat:b.pickupLat==null?null:Number(b.pickupLat),pickup_lng:b.pickupLng==null?null:Number(b.pickupLng),drop_lat:b.dropLat==null?null:Number(b.dropLat),drop_lng:b.dropLng==null?null:Number(b.dropLng),distance_km:dist||null,fare,vehicle_type:String(b.vehicleType||"").slice(0,80),status:"Open",otp,partner_earning:Math.round(fare*0.17),customer_token_hash:await sha(customerToken),order_meta:{originalFare:fare,customerPayable,pointsDiscount,bookingType:String(b.bookingType||"Ride").slice(0,40),tripType:String(b.tripType||"oneway").slice(0,20),roundTrip:!!b.roundTrip,sameVehicle:!!b.sameVehicle,nightHalt:!!b.nightHalt,tollsExtra:!!b.tollsExtra,stops:Array.isArray(b.stops)?b.stops.slice(0,3).map((x:any)=>String(x).slice(0,240)):[],stopCoords:Array.isArray(b.stopCoords)?b.stopCoords.slice(0,3):[],returnPickup:b.returnPickup?String(b.returnPickup).slice(0,300):null,returnDrop:b.returnDrop?String(b.returnDrop).slice(0,300):null,scheduledAt:b.scheduledAt?String(b.scheduledAt).slice(0,80):null}};
   const {error}=await sb.from("vaahak_jobs_live").insert(row);if(error){if(String(error.code)==="23505")return json({error:"ride_already_created"},409);throw error}
   const dr=await fetch(url+"/functions/v1/vaahak-dispatch-live",{method:"POST",headers:{apikey:serviceKey,"Content-Type":"application/json"},body:JSON.stringify({action:"tick",jobId})});const dispatchResult=await dr.json().catch(()=>({}));if(!dr.ok)console.error("immediate ride dispatch failed",dr.status,JSON.stringify(dispatchResult).slice(0,500));else if(!dispatchResult.offeredPartnerId)console.warn("ride created without immediate Vaahak offer",jobId,JSON.stringify(dispatchResult).slice(0,500));
   const safe:any={...row};delete safe.otp;delete safe.customer_token_hash;delete safe.customer_email;return json({ok:true,job:safe,customerToken,dispatch:dispatchResult});
  }

  if(action==="dispatch_internal"){if(String(req.headers.get("apikey")||"")!==serviceKey)return json({error:"forbidden"},403);const jobId=String(b.jobId||"").trim();if(!jobId)return json({error:"job_id_required"},400);const rr=await fetch(url+"/functions/v1/vaahak-dispatch-live",{method:"POST",headers:{apikey:serviceKey,"Content-Type":"application/json"},body:JSON.stringify({action:"tick",jobId})});return new Response(await rr.text(),{status:rr.status,headers:cors})}

  if(action==="ride_status"){
   const txId=String(b.txId||"").trim(),customerToken=String(b.customerToken||"").trim();if(!txId||!customerToken)return json({error:"customer_ride_session_required"},401);
   const tokenHash=await sha(customerToken);let {data}=await sb.from("vaahak_jobs_live").select("id,tx_id,pickup,dropoff,distance_km,fare,vehicle_type,status,assigned_partner_id,otp,completion_voucher_no,completion_email_sent_at,created_at,accepted_at,started_at,completed_at,cancelled_at,cancelled_by,cancellation_reason,order_meta").eq("tx_id",txId).eq("customer_token_hash",tokenHash).order("created_at",{ascending:false}).limit(1).maybeSingle();
   if(data&&data.status==="Open"&&!data?.order_meta?.scheduledAt&&data.created_at&&Date.now()-new Date(data.created_at).getTime()>3*60*1000){const now=new Date().toISOString();const {data:expired}=await sb.from("vaahak_jobs_live").update({status:"Expired",offered_partner_id:null,offer_expires_at:null,dispatch_mode:"expired",dispatch_last_at:now,updated_at:now}).eq("id",data.id).eq("status","Open").select("id,tx_id,pickup,dropoff,distance_km,fare,vehicle_type,status,assigned_partner_id,otp,completion_voucher_no,completion_email_sent_at,created_at,accepted_at,started_at,completed_at,cancelled_at,cancelled_by,cancellation_reason,order_meta").maybeSingle();if(expired)data=expired}
   if(!data)return json({error:"customer_ride_session_invalid"},401);let partner=null;if(data.assigned_partner_id){const {data:p}=await sb.from("vaahak_partners_live").select("id,name,mobile,vehicle,vehicle_no,rating").eq("id",data.assigned_partner_id).maybeSingle();partner=p||null}
   const customerJob={...data,otp:['Accepted','Trip Started'].includes(String(data.status))?data.otp:null};return json({ok:true,job:customerJob,partner});
  }

  if(action==="owner_list"){
   if(!await ownerEmail())return json({error:"owner_session_invalid"},401);const {data:partners}=await sb.from("vaahak_partners_live").select("id,name,mobile,email,vehicle,vehicle_no,can_ride,can_deliver,owner_approval,agreement_status,available,rating,created_at").order("created_at",{ascending:false});const {data:jobs}=await sb.from("vaahak_jobs_live").select(SAFE_JOB_FIELDS).order("created_at",{ascending:false}).limit(50);return json({ok:true,partners:partners||[],jobs:jobs||[]});
  }
  if(action==="owner_approve"){
   if(!await ownerEmail())return json({error:"owner_session_invalid"},401);const pid=String(b.partnerId||"");const decision=b.approve?"Approved":"Rejected";await sb.from("vaahak_partners_live").update({owner_approval:decision,agreement_status:b.approve?"Approved for Live Test":"Rejected",available:false,updated_at:new Date().toISOString()}).eq("id",pid);return json({ok:true,status:decision});
  }
  if(action==="owner_reset_pin"){
   if(!await ownerEmail())return json({error:"owner_session_invalid"},401);const pid=String(b.partnerId||"").trim().toUpperCase(),pin=String(b.newPin||"").trim();if(!/^\d{4,8}$/.test(pin))return json({error:"pin_must_be_4_to_8_digits"},400);const {data,error}=await sb.from("vaahak_partners_live").update({pin_hash:await sha(pin),updated_at:new Date().toISOString()}).eq("id",pid).select("id").maybeSingle();if(error)throw error;if(!data)return json({error:"vaahak_not_found"},404);await sb.from("vaahak_sessions_live").delete().eq("partner_id",pid);return json({ok:true,partnerId:pid});
  }
  return json({error:"unknown_action"},400);
 }catch(e){console.error(e);return json({error:"unexpected_error"},500)}
});