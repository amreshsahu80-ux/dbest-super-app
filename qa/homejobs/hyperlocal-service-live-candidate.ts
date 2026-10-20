import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-dbest-member-token,x-dbest-partner-token,x-dbest-owner-token","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json"};
const json=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:cors});
const enc=new TextEncoder();
const txt=(v:any,n=500)=>String(v??'').trim().slice(0,n);
const num=(v:any)=>{const n=Number(v);return Number.isFinite(n)?n:null};
async function sha(v:string){const d=await crypto.subtle.digest('SHA-256',enc.encode(v));return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,'0')).join('')}
function arr(v:any){return Array.isArray(v)?v.map(x=>txt(x,60)).filter(Boolean):[]}
function safeObj(v:any){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function distKm(aLat:number,aLng:number,bLat:number,bLng:number){const R=6371,dLat=(bLat-aLat)*Math.PI/180,dLng=(bLng-aLng)*Math.PI/180;const q=Math.sin(dLat/2)**2+Math.cos(aLat*Math.PI/180)*Math.cos(bLat*Math.PI/180)*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(q))}
function txid(){return 'TXSP'+Date.now()+crypto.randomUUID().replace(/-/g,'').slice(0,6).toUpperCase()}

Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'method_not_allowed'},405);
 try{
  const url=Deno.env.get('SUPABASE_URL')||'',service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
  if(!url||!service)return json({error:'service_unavailable'},503);
  const sb=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});const bg=(pr:Promise<any>)=>{const er=(globalThis as any).EdgeRuntime;if(er?.waitUntil)er.waitUntil(pr.catch(()=>{}));else pr.catch(()=>{})};const serviceVoice=(transactionId:string)=>bg(fetch(url+'/functions/v1/partner-voice-alert',{method:'POST',headers:{apikey:service,'Content-Type':'application/json'},body:JSON.stringify({action:'service_job',txId:transactionId})}));const pushEvent=(recipientType:string,recipientId:string,title:string,msg:string,category:string,targetUrl:string,cta:string,eventKey:string,data:any={})=>{if(!recipientId)return;bg(fetch(url+'/functions/v1/push-notification-live',{method:'POST',headers:{apikey:service,'Content-Type':'application/json'},body:JSON.stringify({action:'internal_event',recipientType,recipientId,title,body:msg,category,targetUrl,cta,eventKey,data})}))};
  const body=await req.json().catch(()=>({})); const action=txt(body.action,50);
  const memberAuth=async()=>{const token=txt(req.headers.get('x-dbest-member-token'),500);if(!token)return null;const {data:s}=await sb.from('member_sessions_live').select('member_id,expires_at').eq('token_hash',await sha(token)).gt('expires_at',new Date().toISOString()).maybeSingle();if(!s?.member_id)return null;const {data:m}=await sb.from('onboarding_records').select('external_id,name,email,mobile,status,payment_status').eq('kind','member').eq('external_id',String(s.member_id)).is('deleted_at',null).maybeSingle();if(!m||String(m.status)!=='Active')return null;return {id:String(s.member_id),type:'member',name:txt(m.name,180),email:txt(m.email,220),mobile:txt(m.mobile,80)}};
  const partnerAuth=async()=>{const token=txt(req.headers.get('x-dbest-partner-token'),500);if(!token)return null;const {data:s}=await sb.from('partner_sessions_live').select('account_id,expires_at').eq('token_hash',await sha(token)).gt('expires_at',new Date().toISOString()).maybeSingle();if(!s?.account_id)return null;const {data:a}=await sb.from('partner_accounts_live').select('*').eq('account_id',s.account_id).eq('account_status','Active').maybeSingle();if(!a)return null;return {id:String(a.account_id),type:'partner',name:txt(a.name,180),email:txt(a.email,220),mobile:txt(a.mobile,80)}};
  const actorAuth=async()=>await memberAuth()||await partnerAuth();
  const ownerAuth=async()=>{const token=txt(req.headers.get('x-dbest-owner-token'),500);if(!token)return null;const {data:o}=await sb.rpc('validate_owner_session',{p_token:token});return o?String(o):null};

  if(action==='register'){
   const actor=await actorAuth(); if(!actor)return json({error:'partner_or_member_session_invalid'},401);
   const services=arr(body.serviceTypes); if(!services.length)return json({error:'service_type_required'},400);
   const now=new Date().toISOString(),transactionId=txt(body.transactionId,140)||txid();
   let leaderId:string|null=null,launchId:string|null=null;
   const leaderToken=txt(body.leaderOnboardToken,220);
   if(leaderToken){
     const {data:l}=await sb.from('leader_partner_onboarding_launches').select('id,leader_id,status,expires_at').eq('token_hash',await sha(leaderToken)).eq('partner_type','Service Partner').in('status',['Launched','Claimed']).gt('expires_at',now).maybeSingle();
     if(!l)return json({error:'leader_onboarding_link_invalid_or_expired'},410);
     const {data:m}=await sb.from('onboarding_records').select('external_id,category,status').eq('kind','member').eq('external_id',l.leader_id).is('deleted_at',null).maybeSingle();
     if(!m||String(m.category||'').toLowerCase()!=='leader'||String(m.status||'').toLowerCase()!=='active')return json({error:'leader_not_active'},403);
     leaderId=String(l.leader_id);launchId=String(l.id);
   }
   const row={member_id:actor.id,service_partner_id:'SP-'+actor.id.replace(/[^A-Za-z0-9]/g,'').toUpperCase(),name:txt(body.name||actor.name,180),mobile:txt(body.mobile||actor.mobile,80),email:txt(body.email||actor.email,220),address:txt(body.address,600),city:txt(body.city,120),pincode:txt(body.pincode,20),service_types:services,experience_years:Math.max(0,Math.min(60,Number(body.experienceYears||0))),service_area:txt(body.serviceArea,1000),radius_km:Math.max(1,Math.min(100,Number(body.radiusKm||10))),lat:num(body.lat),lng:num(body.lng),location_accuracy_m:num(body.accuracy),location_updated_at:(num(body.lat)!=null&&num(body.lng)!=null)?now:null,registration_transaction_id:transactionId,approval_status:'Pending',active:false,availability_status:'Offline',onboarding_leader_id:leaderId,updated_at:now};
   const {data,error}=await sb.from('service_partner_profiles_live').upsert(row,{onConflict:'member_id'}).select('*').maybeSingle(); if(error)throw error;if(body.whatsappConsent===true&&row.mobile){const m=String(row.mobile||'').replace(/\D/g,'');await sb.from('whatsapp_contact_preferences').upsert({recipient_type:'Service Partner',recipient_id:row.member_id,mobile_e164:m.length===10?'91'+m:m,opted_in:true,opt_in_source:'DBest Service Partner onboarding consent',opt_in_at:now,opted_out_at:null,transactional_enabled:true,marketing_enabled:false,updated_at:now},{onConflict:'recipient_type,recipient_id'});}
   if(launchId)await sb.from('leader_partner_onboarding_launches').update({partner_id:row.service_partner_id,applicant_email:row.email||null,applicant_mobile:row.mobile||null,status:'Claimed',claimed_at:now,updated_at:now}).eq('id',launchId);
   const meta={flow:'service_partner_registration',source:'DBest Service Partner Registration',identityType:actor.type,servicePartnerId:row.service_partner_id,serviceTypes:services,address:row.address,city:row.city,pincode:row.pincode,experience:row.experience_years,radiusKm:row.radius_km,serviceArea:row.service_area,approvalStatus:'Pending Owner Approval',agreementStatus:'Not Signed',onboardingLeaderId:leaderId};
   const {error:te}=await sb.from('transactions').upsert({transaction_id:transactionId,transaction_date:now,section:'Home Jobs & Local Services',subsection:'Service Partner Registration',actor_type:actor.type,actor_name:row.name,actor_ref:actor.id,counterparty_type:'platform',counterparty_name:'DBest',amount:0,payment_mode:'No Registration Fee',payment_status:'Pending Owner Approval',reference:'Service Partner KYC / Agreement / Owner Approval',payout_amount:0,metadata:meta,updated_at:now},{onConflict:'transaction_id'});if(te)throw te;
   return json({ok:true,partner:data,transactionId,leaderAttributed:!!leaderId});
  }

  if(action==='availability'){
   const actor=await actorAuth(); if(!actor)return json({error:'partner_or_member_session_invalid'},401);
   const {data:p}=await sb.from('service_partner_profiles_live').select('*').eq('member_id',actor.id).maybeSingle(); if(!p)return json({error:'partner_not_registered'},404);
   if(p.approval_status!=='Approved'||!p.active)return json({error:'owner_approval_required'},403);
   if(p.operational_hold)return json({error:'super_admin_operational_hold',reason:p.operational_hold_reason||'Operational review'},403);
   const status=txt(body.status,20)==='Available'?'Available':'Offline', now=new Date().toISOString();
   const patch:any={availability_status:status,radius_km:Math.max(1,Math.min(100,Number(body.radiusKm||p.radius_km||10))),updated_at:now};
   if(num(body.lat)!=null&&num(body.lng)!=null){patch.lat=num(body.lat);patch.lng=num(body.lng);patch.location_accuracy_m=num(body.accuracy);patch.location_updated_at=now}
   const {data,error}=await sb.from('service_partner_profiles_live').update(patch).eq('member_id',actor.id).select('*').maybeSingle(); if(error)throw error;
   return json({ok:true,partner:data});
  }

  if(action==='me'){
   const actor=await actorAuth(); if(!actor)return json({error:'partner_or_member_session_invalid'},401);
   const {data:p}=await sb.from('service_partner_profiles_live').select('*').eq('member_id',actor.id).maybeSingle();
   const {data:j}=await sb.from('hyperlocal_jobs_live').select('*').eq('assigned_partner_member_id',actor.id).order('created_at',{ascending:false}).limit(50);
   let agreement:any={signed:false,status:'Not Signed'};if(p?.registration_transaction_id){const {data:t}=await sb.from('transactions').select('metadata').eq('transaction_id',p.registration_transaction_id).maybeSingle();const m=safeObj(t?.metadata);agreement={signed:!!m.agreementPartnerSigned,signedAt:m.agreementPartnerSignedAt||null,ownerSigned:!!m.agreementOwnerSigned,ownerSignedAt:m.agreementOwnerSignedAt||null,status:m.agreementStatus||'Not Signed',ownerOverride:!!m.ownerOverride}}
   return json({ok:true,identity:{id:actor.id,type:actor.type,name:actor.name},partner:p||null,jobs:j||[],agreement});
  }

  if(action==='sync_job'){
   const member=await memberAuth();if(!member)return json({error:'member_session_invalid'},401);
   const tx=safeObj(body.transaction),transactionId=txt(tx.id||tx.transactionId,140);
   if(!transactionId)return json({error:'transaction_id_required'},400);
   const names:any={'maid / house help':'maid','electrician':'electrician','plumber':'plumber','refrigerator mechanic':'refrigerator','ac mechanic':'ac'};
   const sub=txt(tx.sub||tx.subsection,100).toLowerCase(),serviceKey=names[sub];
   if(!serviceKey)return json({error:'unsupported_home_service'},400);
   const {data:existing,error:readError}=await sb.from('hyperlocal_jobs_live').select('*').eq('transaction_id',transactionId).maybeSingle();
   if(readError)throw readError;
   if(existing){
    if(String(existing.member_id)!==member.id)return json({error:'service_job_not_owned'},403);
    if(String(existing.service_type)!==serviceKey)return json({error:'service_type_mismatch'},409);
    // Replays preserve assignment, acceptance, progress and completion.
    if(String(existing.status)!=='Open')return json({ok:true,job:existing,reused:true,matched:!!existing.assigned_partner_member_id,cascade:false});
    const cascade=await fetch(url+'/functions/v1/service-cascade-live',{method:'POST',headers:{apikey:service,'Content-Type':'application/json'},body:JSON.stringify({transactionId})});
    const cd=await cascade.json().catch(()=>({}));if(!cascade.ok)console.error('cascade retry failed',cascade.status,cd);
    return json({ok:true,job:cd.job||existing,reused:true,matched:!!cd.partner,cascade:!!cascade.ok});
   }
   // Only the member who owns a persisted Home Jobs request may create a job.
   const [rq,tq]=await Promise.all([
    sb.from('service_requests_live').select('member_id,section,subsection').eq('transaction_id',transactionId).maybeSingle(),
    sb.from('transactions').select('actor_ref,section,subsection,metadata').eq('transaction_id',transactionId).maybeSingle()
   ]);
   if(rq.error||tq.error)throw rq.error||tq.error;
   const section='Home Jobs & Local Services',meta=safeObj(tq.data?.metadata);
   const requestOwned=!!rq.data&&String(rq.data.member_id)===member.id&&String(rq.data.section)===section&&String(rq.data.subsection).toLowerCase()===sub;
   const transactionOwned=!!tq.data&&String(tq.data.actor_ref)===member.id&&String(tq.data.section)===section&&String(tq.data.subsection).toLowerCase()===sub&&String(meta.flow)==='hyperlocal_home_service';
   if(!requestOwned&&!transactionOwned)return json({error:'verified_home_service_request_required'},409);
   const app=safeObj(tx.meta?.application||tx.application),lat=num(app.lat||app.latitude||tx.meta?.location?.lat),lng=num(app.lng||app.longitude||tx.meta?.location?.lng);
   const now=new Date().toISOString(),row:any={transaction_id:transactionId,member_id:member.id,service_type:serviceKey,customer_name:txt(app.name,180),customer_mobile:txt(app.mobile,80),customer_email:txt(app.email,220),address:txt(app.address,700),city:txt(app.city,120),pincode:txt(app.pincode,20),lat,lng,preferred_date:txt(app.preferredDate,20)||null,preferred_slot:txt(app.preferredSlot,100),details:txt(app.details,1200),status:'Open',updated_at:now};
   const {data:stored,error:insertError}=await sb.from('hyperlocal_jobs_live').insert(row).select('*').maybeSingle();
   if(insertError){
    if(String((insertError as any).code)!=='23505')throw insertError;
    const {data:concurrent}=await sb.from('hyperlocal_jobs_live').select('*').eq('transaction_id',transactionId).maybeSingle();
    if(!concurrent||String(concurrent.member_id)!==member.id||String(concurrent.service_type)!==serviceKey)return json({error:'service_job_conflict'},409);
    return json({ok:true,job:concurrent,reused:true,matched:!!concurrent.assigned_partner_member_id,cascade:false});
   }
   const cascade=await fetch(url+'/functions/v1/service-cascade-live',{method:'POST',headers:{apikey:service,'Content-Type':'application/json'},body:JSON.stringify({transactionId})});
   const cd=await cascade.json().catch(()=>({}));if(!cascade.ok)console.error('service cascade failed',cascade.status,cd);
   return json({ok:true,job:cd.job||stored,matched:!!cd.partner,partner:cd.partner||null,offerAttempt:cd.offerAttempt||0,offerExpiresAt:cd.offerExpiresAt||null,cascade:!!cascade.ok});
  }


  if(action==='owner_set_approval'){
   const owner=await ownerAuth(); if(!owner)return json({error:'owner_session_invalid'},401);
   const memberId=txt(body.memberId,120),transactionId=txt(body.transactionId,140),approval=txt(body.approval,20),override=body.override===true;
   let q=sb.from('service_partner_profiles_live').select('*'); if(memberId)q=q.eq('member_id',memberId); else if(transactionId)q=q.eq('registration_transaction_id',transactionId); else return json({error:'partner_reference_required'},400);
   const {data:p}=await q.maybeSingle(); if(!p)return json({error:'partner_not_found'},404);
   let prior:any={};if(p.registration_transaction_id){const {data:t}=await sb.from('transactions').select('metadata').eq('transaction_id',p.registration_transaction_id).maybeSingle();prior=safeObj(t?.metadata)}
   const approved=approval==='Approved';
   if(approved&&!override&&!prior.agreementPartnerSigned)return json({error:'service_partner_agreement_required'},409);
   if(approved&&!override&&!prior.agreementOwnerSigned)return json({error:'service_partner_owner_signature_required'},409);
   const now=new Date().toISOString();const {data,error}=await sb.from('service_partner_profiles_live').update({approval_status:approved?'Approved':'Rejected',active:approved,availability_status:'Offline',updated_at:now}).eq('member_id',p.member_id).select('*').maybeSingle(); if(error)throw error;if(approved&&override&&data?.mobile){const m=String(data.mobile||'').replace(/\D/g,'');await sb.from('whatsapp_contact_preferences').upsert({recipient_type:'Service Partner',recipient_id:data.member_id,mobile_e164:m.length===10?'91'+m:m,opted_in:true,opt_in_source:'DBest Owner-assisted onboarding consent',opt_in_at:now,opted_out_at:null,transactional_enabled:true,marketing_enabled:false,updated_at:now},{onConflict:'recipient_type,recipient_id'});}
   if(p.registration_transaction_id){const fullySigned=!!prior.agreementPartnerSigned&&!!prior.agreementOwnerSigned;const meta={...prior,flow:'service_partner_registration',approvalStatus:approved?'Approved':'Rejected',approvedBy:'Owner',approvedByEmail:owner,approvedAt:now,ownerOverride:approved&&override,ownerOverrideReason:override?txt(body.overrideReason||'Owner reviewed registration and applied manual override',500):null,agreementStatus:fullySigned?(override?'Fully Signed / Owner Override Approved':'Fully Signed / Owner Approved'):(override?'Agreement Bypassed by Owner Override':'Not Fully Signed')};await sb.from('transactions').update({payment_status:approved?'Approved':'Rejected',updated_at:now,metadata:meta}).eq('transaction_id',p.registration_transaction_id)}
   return json({ok:true,partner:data,approvedBy:owner,overrideApplied:approved&&override});
  }

  if(action==='owner_list'){
   const owner=await ownerAuth(); if(!owner)return json({error:'owner_session_invalid'},401);
   const {data:p}=await sb.from('service_partner_profiles_live').select('*').order('created_at',{ascending:false}); const {data:j}=await sb.from('hyperlocal_jobs_live').select('*').order('created_at',{ascending:false}).limit(300);
   const txids=(p||[]).map((x:any)=>x.registration_transaction_id).filter(Boolean);let tmap=new Map<string,any>();if(txids.length){const {data:ts}=await sb.from('transactions').select('transaction_id,metadata,payment_status,reference').in('transaction_id',txids);tmap=new Map((ts||[]).map((t:any)=>[String(t.transaction_id),t]))}
   const partners=(p||[]).map((x:any)=>{const t=tmap.get(String(x.registration_transaction_id||'')),m=safeObj(t?.metadata);return {...x,agreement_partner_signed:!!m.agreementPartnerSigned,agreement_partner_signed_at:m.agreementPartnerSignedAt||null,agreement_owner_signed:!!m.agreementOwnerSigned,agreement_owner_signed_at:m.agreementOwnerSignedAt||null,agreement_status:m.agreementStatus||'Not Signed',owner_override:!!m.ownerOverride}});
   return json({ok:true,partners,jobs:j||[]});
  }
  return json({error:'unknown_action'},400);
 }catch(e){console.error(e);return json({error:'unexpected_error',detail:String((e as any)?.message||e)},500)}
});