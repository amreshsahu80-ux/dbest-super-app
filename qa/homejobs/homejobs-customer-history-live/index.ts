import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-dbest-member-token","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:cors});
const txt=(value:unknown,size=300)=>String(value??"").trim().slice(0,size);
const labels:Record<string,string>={"maid":"Maid / House Help","electrician":"Electrician","plumber":"Plumber","refrigerator":"Refrigerator Mechanic","ac":"AC Mechanic"};
const allowed=new Set(Object.values(labels));
const cleanObject=(value:unknown):Record<string,unknown>=>value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
const number=(value:unknown)=>{const n=Number(value);return Number.isFinite(n)&&n>=0?n:0};
async function sha256(input:string){const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(input));return Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,"0")).join("")}
function hasVerifiedPayment(t:Record<string,unknown>){
 const meta=cleanObject(t.metadata),status=txt(t.payment_status,55).toLowerCase(),method=txt(t.payment_mode,40).toLowerCase(),amount=number(t.amount);
 if(!amount||/sandbox|test|qa|mock|demo|pending|unpaid|failed|refund|cancel/i.test(status+" "+method))return false;
 if(meta.qa===true||meta.sandbox_only===true||meta.is_test===true)return false;
 if(!/^(verified|paid|captured|received|razorpay verified|payu verified)$/.test(status))return false;
 const razorpay=/razorpay/.test(method)&&
  (meta.razorpay_signature_verified===true||meta.razorpay_verified===true)&&
  !!txt(meta.razorpay_payment_id,180);
 const payu=/payu/.test(method)&&meta.payu_verified===true&&!!txt(meta.payu_mihpayid,180);
 return razorpay||payu;
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"method_not_allowed"},405);
 try{
  const url=Deno.env.get("SUPABASE_URL")||"",key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!url||!key)return json({error:"service_unavailable"},503);
  const token=txt(req.headers.get("x-dbest-member-token"),600);
  if(!token)return json({error:"member_login_required"},401);
  const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:session,error:sessionError}=await sb.from("member_sessions_live").select("member_id").eq("token_hash",await sha256(token)).gt("expires_at",new Date().toISOString()).maybeSingle();
  if(sessionError||!session?.member_id)return json({error:"member_session_invalid"},401);
  const memberId=txt(session.member_id,180);
  const {data:member,error:memberError}=await sb.from("onboarding_records").select("external_id,status").eq("kind","member").eq("external_id",memberId).is("deleted_at",null).maybeSingle();
  if(memberError||String(member?.status)!=="Active")return json({error:"member_not_active"},403);
  const request=await req.json().catch(()=>({}));
  if(request.action!=="list")return json({error:"unsupported_action"},400);
  // Never accept member IDs or invoice approval flags from the caller.
  const [jobsResult,requestsResult]=await Promise.all([
    sb.from("hyperlocal_jobs_live").select("transaction_id,member_id,service_type,status,created_at,preferred_date,preferred_slot,assigned_partner_member_id,accepted_at,started_at,completed_at,city,pincode").eq("member_id",memberId).order("created_at",{ascending:false}).limit(100),
    sb.from("service_requests_live").select("transaction_id,member_id,section,subsection,status,created_at").eq("member_id",memberId).eq("section","Home Jobs & Local Services").order("created_at",{ascending:false}).limit(100)
  ]);
  if(jobsResult.error||requestsResult.error)throw jobsResult.error||requestsResult.error;
  const jobs=jobsResult.data||[],requests=(requestsResult.data||[]).filter((r:any)=>allowed.has(txt(r.subsection,100)));
  const idSet=new Set<string>();
  for(const job of jobs)if(job.transaction_id)idSet.add(txt(job.transaction_id,150));
  for(const request of requests)if(request.transaction_id)idSet.add(txt(request.transaction_id,150));
  const ids=Array.from(idSet).slice(0,200);
  let transactions:any[]=[];
  if(ids.length){
   const result=await sb.from("transactions").select("transaction_id,actor_ref,amount,payment_mode,payment_status,metadata,created_at").in("transaction_id",ids).eq("actor_ref",memberId).limit(200);
   if(result.error)throw result.error;
   transactions=result.data||[];
  }
  const txmap=new Map(transactions.map((t:any)=>[txt(t.transaction_id,150),t]));
  const rm=new Map(requests.map((r:any)=>[txt(r.transaction_id,150),r]));
  const jm=new Map(jobs.map((j:any)=>[txt(j.transaction_id,150),j]));
  const items=ids.map(id=>{
   const j:any=jm.get(id),r:any=rm.get(id),t:any=txmap.get(id);
   const name=j?labels[txt(j.service_type,40)]:txt(r?.subsection,120);
   if(!allowed.has(name))return null;
   const status=txt(j?.status,60)||txt(r?.status,60)||"Pending Assignment";
   const amount=number(t?.amount);
   const receipt=!!t&&hasVerifiedPayment(t);
   return {id,service:name,status,jobStatus:txt(j?.status,60)||null,
    requestedAt:j?.created_at||r?.created_at||t?.created_at||null,
    preferredDate:j?.preferred_date||null,preferredSlot:j?.preferred_slot||null,
    city:txt(j?.city,120),pincode:txt(j?.pincode,20),
    assigned:!!j?.assigned_partner_member_id,acceptedAt:j?.accepted_at||null,
    startedAt:j?.started_at||null,completedAt:j?.completed_at||null,
    charge:amount,paymentStatus:receipt?"Verified payment":"Payment not verified",
    receiptEligible:receipt,receiptDate:receipt?(t?.created_at||null):null,paymentMethod:receipt?txt(t?.payment_mode,45):null};
  }).filter(Boolean).sort((a:any,b:any)=>new Date(b.requestedAt||0).getTime()-new Date(a.requestedAt||0).getTime());
  return json({ok:true,services:items,summary:{total:items.length,completed:items.filter((x:any)=>x.jobStatus==="Completed").length,active:items.filter((x:any)=>x.jobStatus!=="Completed"&&x.jobStatus!=="Cancelled").length},notes:{charges:"A quoted or recorded charge is not proof of payment.",receipt:"Payment receipts are available only for backend-verified non-test collections. Government tax invoice details are not implied."}});
 }catch(e){console.error("homejobs_customer_history_error",e);return json({error:"service_history_unavailable"},503)}
});
