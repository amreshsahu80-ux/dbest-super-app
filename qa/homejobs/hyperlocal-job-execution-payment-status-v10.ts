import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-dbest-member-token,x-dbest-partner-token","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json"};
const json=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:cors});
const enc=new TextEncoder();
const txt=(v:any,n=500)=>String(v??'').trim().slice(0,n);
async function sha(v:string){const d=await crypto.subtle.digest('SHA-256',enc.encode(v));return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,'0')).join('')}

Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'method_not_allowed'},405);
 try{
  const url=Deno.env.get('SUPABASE_URL')||'',service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
  if(!url||!service)return json({error:'service_unavailable'},503);
  const sb=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});const bg=(pr:Promise<any>)=>{const er=(globalThis as any).EdgeRuntime;if(er?.waitUntil)er.waitUntil(pr.catch(()=>{}));else pr.catch(()=>{})};const pushEvent=(recipientType:string,recipientId:string,title:string,msg:string,category:string,targetUrl:string,cta:string,eventKey:string,data:any={})=>{if(!recipientId)return;bg(fetch(url+'/functions/v1/push-notification-live',{method:'POST',headers:{apikey:service,'Content-Type':'application/json'},body:JSON.stringify({action:'internal_event',recipientType,recipientId,title,body:msg,category,targetUrl,cta,eventKey,data})}))};const waEvent=(recipientType:string,recipientId:string,eventType:string,eventKey:string,params:string[])=>{if(!recipientId)return;const components=params.length?[{type:'body',parameters:params.map(x=>({type:'text',text:String(x)}))}]:[];bg(fetch(url+'/functions/v1/whatsapp-notification-live',{method:'POST',headers:{apikey:service,'Content-Type':'application/json'},body:JSON.stringify({action:'internal_event',recipientType,recipientId,eventType,eventKey,components})}))};const cascade=(transactionId:string)=>fetch(url+'/functions/v1/service-cascade-live',{method:'POST',headers:{apikey:service,'Content-Type':'application/json'},body:JSON.stringify({transactionId})});
  const body=await req.json().catch(()=>({})),action=txt(body.action,40);

  async function actorAuth(){
   const mt=txt(req.headers.get('x-dbest-member-token'),500);
   if(mt){
    const {data:s}=await sb.from('member_sessions_live').select('member_id,expires_at').eq('token_hash',await sha(mt)).gt('expires_at',new Date().toISOString()).maybeSingle();
    if(s?.member_id){
     const {data:m}=await sb.from('onboarding_records').select('external_id,status').eq('kind','member').eq('external_id',String(s.member_id)).is('deleted_at',null).maybeSingle();
     if(m&&String(m.status)==='Active')return {id:String(s.member_id),type:'member'};
    }
   }
   const pt=txt(req.headers.get('x-dbest-partner-token'),500);
   if(pt){
    const {data:s}=await sb.from('partner_sessions_live').select('account_id,expires_at').eq('token_hash',await sha(pt)).gt('expires_at',new Date().toISOString()).maybeSingle();
    if(s?.account_id){
     const {data:a}=await sb.from('partner_accounts_live').select('account_id,account_status').eq('account_id',s.account_id).maybeSingle();
     if(a&&String(a.account_status)==='Active')return {id:String(a.account_id),type:'partner'};
    }
   }
   return null;
  }

  const actor=await actorAuth();if(!actor)return json({error:'partner_or_member_session_invalid'},401);
  const {data:profile}=await sb.from('service_partner_profiles_live').select('member_id,approval_status,active,operational_hold,operational_hold_reason').eq('member_id',actor.id).maybeSingle();
  if(!profile)return json({error:'service_partner_not_registered'},404);
  if(profile.approval_status!=='Approved'||!profile.active)return json({error:'owner_approval_required'},403);
  if(profile.operational_hold)return json({error:'super_admin_operational_hold',reason:profile.operational_hold_reason||'Operational review'},403);

  if(action==='list'){
   const {data:expired}=await sb.from('hyperlocal_jobs_live').select('transaction_id').eq('status','Assigned').eq('assigned_partner_member_id',actor.id).lt('offer_expires_at',new Date().toISOString()).limit(10);
   for(const x of expired||[])await cascade(String(x.transaction_id)).catch(()=>null);
   const {data,error}=await sb.from('hyperlocal_jobs_live').select('*').eq('assigned_partner_member_id',actor.id).order('created_at',{ascending:false}).limit(100);if(error)throw error;
   return json({ok:true,jobs:data||[]});
  }

  if(action==='job_action'){
   const transactionId=txt(body.transactionId||body.transaction_id,140),step=txt(body.step,30).toLowerCase();
   if(!transactionId)return json({error:'transaction_id_required'},400);
   const {data:job,error:je}=await sb.from('hyperlocal_jobs_live').select('*').eq('transaction_id',transactionId).eq('assigned_partner_member_id',actor.id).maybeSingle();if(je)throw je;if(!job)return json({error:'assigned_job_not_found'},404);
   const current=String(job.status||''),now=new Date().toISOString();let patch:any={updated_at:now},txStatus='',requestStatus='Processing';
   if(step==='accept'){
    if(current==='Accepted')return json({ok:true,job,existing:true});
    if(current!=='Assigned')return json({error:'invalid_job_transition',current},409);
    if(job.offer_expires_at&&new Date(job.offer_expires_at).getTime()<=Date.now()){await cascade(transactionId).catch(()=>null);return json({error:'offer_expired'},409)}
    patch={...patch,status:'Accepted',accepted_at:now,offer_expires_at:null};txStatus='Service Partner Accepted';
   }else if(step==='reject'){
    if(current!=='Assigned')return json({error:'invalid_job_transition',current},409);
    const rejected=Array.isArray(job.rejected_partner_ids)?job.rejected_partner_ids.filter(Boolean):[];
    if(!rejected.includes(actor.id))rejected.push(actor.id);
    const {error:re}=await sb.from('hyperlocal_jobs_live').update({status:'Open',assigned_partner_member_id:null,assigned_at:null,offer_expires_at:null,rejected_partner_ids:rejected,dispatch_last_at:now,updated_at:now}).eq('transaction_id',transactionId).eq('assigned_partner_member_id',actor.id);if(re)throw re;
    const cr=await cascade(transactionId);const cd=await cr.json().catch(()=>({}));
    return json({ok:true,rejected:true,nextOffered:!!cd.partner,nextPartner:cd.partner||null,exhausted:!!cd.exhausted});
   }else if(step==='start'){
    if(current==='In Progress')return json({ok:true,job,existing:true});
    if(current!=='Accepted')return json({error:'invalid_job_transition',current},409);
    patch={...patch,status:'In Progress',started_at:now};txStatus='Service In Progress';
   }else if(step==='complete'){
    if(current==='Completed')return json({ok:true,job,existing:true});
    if(current!=='In Progress')return json({error:'invalid_job_transition',current},409);
    patch={...patch,status:'Completed',completed_at:now};txStatus='Completed';requestStatus='Completed';
   }else return json({error:'unsupported_job_action'},400);

   const {data:updated,error}=await sb.from('hyperlocal_jobs_live').update(patch).eq('transaction_id',transactionId).eq('assigned_partner_member_id',actor.id).select('*').maybeSingle();if(error||!updated)throw error||new Error('job_update_failed');
   await sb.from('service_requests_live').update({status:requestStatus,owner_note:step==='complete'?'Service completed by assigned Service Partner.':undefined,updated_at:now}).eq('transaction_id',transactionId);
   const {data:t}=await sb.from('transactions').select('metadata').eq('transaction_id',transactionId).maybeSingle();
   const meta=(t?.metadata&&typeof t.metadata==='object'&&!Array.isArray(t.metadata))?t.metadata:{};
   await sb.from('transactions').update({metadata:{...meta,hyperlocalExecution:{status:updated.status,assignedPartnerId:actor.id,acceptedAt:updated.accepted_at||null,startedAt:updated.started_at||null,completedAt:updated.completed_at||null}},updated_at:now}).eq('transaction_id',transactionId);
   if(step==='accept'&&updated.member_id){pushEvent('Member',String(updated.member_id),'Service Partner Assigned','A DBest Service Partner has accepted your service request.','job','/?openService=jobs','View Service','member-service:'+transactionId+':accepted',{transactionId,partnerId:actor.id});waEvent('Member',String(updated.member_id),'member_service_assigned','wa-member-service:'+transactionId+':accepted',[transactionId])}
   if(step==='complete'&&updated.member_id){pushEvent('Member',String(updated.member_id),'Service Completed','Your DBest service request '+transactionId+' has been completed.','job','/?openService=jobs','View Service','member-service:'+transactionId+':completed',{transactionId});waEvent('Member',String(updated.member_id),'member_service_completed','wa-member-service:'+transactionId+':completed',[transactionId])}
   return json({ok:true,job:updated});
  }
  return json({error:'unknown_action'},400);
 }catch(e){console.error(e);return json({error:'unexpected_error',detail:String((e as any)?.message||e)},500)}
});