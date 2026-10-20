import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-dbest-member-token","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json","Cache-Control":"private, no-store"};
const reply=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers});
const clean=(v:unknown,max=150)=>String(v??"").trim().slice(0,max);
async function sha(value:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return [...new Uint8Array(d)].map(c=>c.toString(16).padStart(2,"0")).join("")}
const labels=new Set(["Maid / House Help","Electrician","Plumber","Refrigerator Mechanic","AC Mechanic"]);
const paymentEvidence=(amount:number,status:string)=>amount>0&&Number.isFinite(amount)&&/^(Verified|Payment Verified|Paid|Settled|Captured|Razorpay Verified|PayU Verified)$/i.test(status.trim());
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers});
 if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
 try{
  const url=Deno.env.get("SUPABASE_URL")||"",key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!url||!key)return reply({error:"service_unavailable"},503);
  const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const token=clean(req.headers.get("x-dbest-member-token"),512);
  if(!token)return reply({error:"member_session_required"},401);
  const {data:session,error:se}=await sb.from("member_sessions_live").select("member_id,expires_at")
    .eq("token_hash",await sha(token)).gt("expires_at",new Date().toISOString()).maybeSingle();
  if(se)throw se;
  if(!session?.member_id)return reply({error:"member_session_invalid"},401);
  const memberId=clean(session.member_id,140);
  const {data:member,error:me}=await sb.from("onboarding_records").select("status")
    .eq("kind","member").eq("external_id",memberId).is("deleted_at",null).maybeSingle();
  if(me)throw me;
  if(!member||String(member.status||"").toLowerCase()!=="active")return reply({error:"member_not_active"},403);
  // All three queries are filtered by the authenticated member ID on the SERVER.
  // Do not use client-provided member IDs; do not return unrelated member PII.
  const [jr,rr,tr]=await Promise.all([
   sb.from("hyperlocal_jobs_live").select("transaction_id,service_type,status,assigned_partner_member_id,created_at,updated_at,preferred_date,preferred_slot,accepted_at,started_at,completed_at,cancelled_at")
     .eq("member_id",memberId).order("created_at",{ascending:false}).limit(150),
   sb.from("service_requests_live").select("transaction_id,subsection,status,created_at,updated_at")
     .eq("member_id",memberId).eq("section","Home Jobs & Local Services").order("created_at",{ascending:false}).limit(150),
   sb.from("transactions").select("transaction_id,subsection,amount,payment_mode,payment_status,reference,transaction_date,updated_at")
     .eq("actor_ref",memberId).eq("section","Home Jobs & Local Services").order("transaction_date",{ascending:false}).limit(150)
  ]);
  if(jr.error||rr.error||tr.error)throw jr.error||rr.error||tr.error;
  const jobs=new Map((jr.data||[]).map((x:any)=>[String(x.transaction_id),x]));
  const requests=new Map((rr.data||[]).map((x:any)=>[String(x.transaction_id),x]));
  const invoices=new Map((tr.data||[]).map((x:any)=>[String(x.transaction_id),x]));
  const ids=[...new Set([...jobs.keys(),...requests.keys(),...invoices.keys()])];
  const out=ids.map(id=>{
   const j:any=jobs.get(id),r:any=requests.get(id),t:any=invoices.get(id);
   const label=clean(r?.subsection||t?.subsection||"",100);
   const matched=[...labels].find(name=>name.toLowerCase()===label.toLowerCase());
   if(!j&&!matched)return null; // never show a Service Partner registration or unrelated transaction here
   const title=matched||({"maid":"Maid / House Help","electrician":"Electrician","plumber":"Plumber","refrigerator":"Refrigerator Mechanic","ac":"AC Mechanic"} as Record<string,string>)[clean(j?.service_type,50)]||"Home Service";
   const status=clean(j?.status||r?.status||"Request Submitted",55),amount=Number(t?.amount||0);
   const verified=!!t&&paymentEvidence(amount,clean(t.payment_status,80));
   const receivedAt=j?.created_at||r?.created_at||t?.transaction_date||null;
   return {transactionId:id,service:title,status,createdAt:receivedAt,updatedAt:j?.updated_at||r?.updated_at||t?.updated_at||receivedAt,
    preferredDate:j?.preferred_date||null,preferredSlot:clean(j?.preferred_slot,100),assigned:!!j?.assigned_partner_member_id,
    acceptedAt:j?.accepted_at||null,startedAt:j?.started_at||null,completedAt:j?.completed_at||null,cancelledAt:j?.cancelled_at||null,
    // Completion of the job is NOT evidence that fees were received.
    payment:{amount:verified?amount:0,currency:"INR",verified,mode:verified?clean(t?.payment_mode,80):"",reference:verified?clean(t?.reference,120):"",status:verified?"Payment Verified":amount>0?"Payment Not Verified":"No Confirmed Charge"},
    documentType:verified?"payment_receipt":status==="Completed"?"service_summary":null};
  }).filter(Boolean).sort((a:any,b:any)=>new Date(b.createdAt||0).getTime()-new Date(a.createdAt||0).getTime());
  return reply({ok:true,history:out.slice(0,150),summary:{total:out.length,completed:out.filter((x:any)=>x.status==="Completed").length,active:out.filter((x:any)=>!["Completed","Cancelled","Rejected"].includes(x.status)).length,receipts:out.filter((x:any)=>x.documentType==="payment_receipt").length}});
 }catch(e){console.error("homejobs-history",e);return reply({error:"history_unavailable"},500)}
});
