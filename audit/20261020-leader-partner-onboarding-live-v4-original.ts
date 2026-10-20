import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-dbest-member-token","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json"};
const enc=new TextEncoder();
const json=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:cors});
const txt=(v:any,n=300)=>String(v??'').trim().slice(0,n);
const digits=(v:any)=>String(v??'').replace(/\D/g,'').slice(-10);
async function sha(v:string){const d=await crypto.subtle.digest('SHA-256',enc.encode(v));return Array.from(new Uint8Array(d)).map(x=>x.toString(16).padStart(2,'0')).join('')}

Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'method_not_allowed'},405);
 try{
  const url=Deno.env.get('SUPABASE_URL')||'',service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
  if(!url||!service)return json({error:'service_unavailable'},503);
  const sb=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const b=await req.json().catch(()=>({})),action=txt(b.action,40);

  async function leader(){
    const token=txt(req.headers.get('x-dbest-member-token'),700);
    if(!token)return null;
    const {data:s}=await sb.from('member_sessions_live').select('member_id,expires_at').eq('token_hash',await sha(token)).gt('expires_at',new Date().toISOString()).maybeSingle();
    if(!s)return null;
    const {data:m}=await sb.from('onboarding_records').select('external_id,name,email,mobile,category,status').eq('kind','member').eq('external_id',s.member_id).is('deleted_at',null).maybeSingle();
    if(!m||String(m.status||'').toLowerCase()!=='active'||String(m.category||'').toLowerCase()!=='leader')return null;
    return m;
  }

  async function launchByToken(raw:string){
    const {data}=await sb.from('leader_partner_onboarding_launches').select('*').eq('token_hash',await sha(raw)).maybeSingle();
    return data||null;
  }

  if(action==='launch'){
    const m=await leader();if(!m)return json({error:'leader_session_required'},401);
    const type=txt(b.partnerType,30);
    if(!['Vendor','Vaahak','Service Partner'].includes(type))return json({error:'invalid_partner_type'},400);
    const {data:set}=await sb.from('app_settings').select('value').eq('key','leader_partner_onboarding_rules').maybeSingle();
    const cfg=(set?.value&&typeof set.value==='object')?set.value:{};
    if(cfg.enabled===false)return json({error:'leader_onboarding_disabled'},403);
    const promoEnd=String(cfg.promo_ends_at||'2026-10-31T23:59:59+05:30');
    const promoActive=Date.now()<=new Date(promoEnd).getTime();
    const configured=Number(type==='Vendor'?cfg.vendor:type==='Vaahak'?cfg.vaahak:cfg.service_partner);
    const amount=promoActive?(Number.isFinite(configured)?configured:(type==='Vendor'?300:type==='Vaahak'?200:100)):0;
    const raw=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
    const expires=new Date(Date.now()+6*60*60*1000).toISOString();
    const {data,error}=await sb.from('leader_partner_onboarding_launches').insert({
      token_hash:await sha(raw),leader_id:m.external_id,partner_type:type,incentive_amount:amount,expires_at:expires
    }).select('id').single();
    if(error)throw error;
    const params=new URLSearchParams({type,leader_onboard:raw});
    return json({ok:true,launchId:data.id,partnerType:type,incentiveAmount:amount,promoActive,promoEndsAt:promoEnd,expiresAt:expires,url:'/partner-onboarding.html?'+params.toString()});
  }

  if(action==='validate'){
    const raw=txt(b.token,200);if(!raw)return json({error:'token_required'},400);
    const x=await launchByToken(raw);
    if(!x||!['Launched','Claimed'].includes(String(x.status))||new Date(x.expires_at).getTime()<Date.now())return json({error:'onboarding_link_invalid_or_expired'},410);
    const {data:m}=await sb.from('onboarding_records').select('external_id,name,category,status').eq('kind','member').eq('external_id',x.leader_id).is('deleted_at',null).maybeSingle();
    if(!m||String(m.category||'').toLowerCase()!=='leader'||String(m.status||'').toLowerCase()!=='active')return json({error:'leader_not_active'},403);
    return json({ok:true,source:{leaderId:x.leader_id,leaderName:m.name||'',partnerType:x.partner_type,incentiveAmount:Number(x.incentive_amount??0),status:x.status}});
  }

  if(action==='claim'){
    const raw=txt(b.token,200);if(!raw)return json({error:'token_required'},400);
    const x=await launchByToken(raw);
    if(!x||!['Launched','Claimed'].includes(String(x.status))||new Date(x.expires_at).getTime()<Date.now())return json({error:'onboarding_link_invalid_or_expired'},410);
    const email=txt(b.email,180).toLowerCase(),mobile=digits(b.mobile),pid=txt(b.partnerId,120);
    const since=new Date(new Date(x.created_at).getTime()-60000).toISOString();
    let row:any=null;

    if(x.partner_type==='Vendor'){
      const {data}=await sb.from('marketplace_vendors_live').select('id,email,mobile,onboarding_admin_id,onboarding_leader_id,created_at').gte('created_at',since).order('created_at',{ascending:false}).limit(20);
      row=(data||[]).find((r:any)=>pid?r.id===pid:((email&&String(r.email||'').toLowerCase()===email)||(mobile&&digits(r.mobile)===mobile)))||null;
      if(row){
        if(row.onboarding_admin_id)return json({error:'partner_already_attributed_to_distributor'},409);
        if(row.onboarding_leader_id&&row.onboarding_leader_id!==x.leader_id)return json({error:'partner_already_attributed'},409);
        await sb.from('marketplace_vendors_live').update({onboarding_leader_id:x.leader_id}).eq('id',row.id);
      }
    }else if(x.partner_type==='Vaahak'){
      const {data}=await sb.from('vaahak_partners_live').select('id,email,mobile,onboarding_admin_id,onboarding_leader_id,created_at').gte('created_at',since).order('created_at',{ascending:false}).limit(20);
      row=(data||[]).find((r:any)=>pid?r.id===pid:((email&&String(r.email||'').toLowerCase()===email)||(mobile&&digits(r.mobile)===mobile)))||null;
      if(row){
        if(row.onboarding_admin_id)return json({error:'partner_already_attributed_to_distributor'},409);
        if(row.onboarding_leader_id&&row.onboarding_leader_id!==x.leader_id)return json({error:'partner_already_attributed'},409);
        await sb.from('vaahak_partners_live').update({onboarding_leader_id:x.leader_id}).eq('id',row.id);
      }
    }else{
      const {data}=await sb.from('service_partner_profiles_live').select('member_id,service_partner_id,email,mobile,onboarding_admin_id,onboarding_leader_id,created_at').gte('created_at',since).order('created_at',{ascending:false}).limit(20);
      row=(data||[]).find((r:any)=>pid?(r.service_partner_id===pid||r.member_id===pid):((email&&String(r.email||'').toLowerCase()===email)||(mobile&&digits(r.mobile)===mobile)))||null;
      if(row){
        if(row.onboarding_admin_id)return json({error:'partner_already_attributed_to_distributor'},409);
        if(row.onboarding_leader_id&&row.onboarding_leader_id!==x.leader_id)return json({error:'partner_already_attributed'},409);
        const rid=row.service_partner_id||row.member_id;
        await sb.from('service_partner_profiles_live').update({onboarding_leader_id:x.leader_id}).or(`service_partner_id.eq.${rid},member_id.eq.${rid}`);
        row.id=rid;
      }
    }

    if(!row)return json({ok:false,pending:true,reason:'partner_not_created_yet'},202);
    const partnerId=row.id||row.service_partner_id||row.member_id;
    if(x.partner_id&&x.partner_id!==partnerId)return json({error:'token_already_claimed'},409);

    const {error}=await sb.from('leader_partner_onboarding_launches').update({
      partner_id:partnerId,applicant_email:email||null,applicant_mobile:mobile||null,
      status:'Claimed',claimed_at:new Date().toISOString(),updated_at:new Date().toISOString()
    }).eq('id',x.id);
    if(error)throw error;
    return json({ok:true,claimed:true,partnerType:x.partner_type,partnerId,incentiveAmount:Number(x.incentive_amount??0)});
  }

  if(action==='list'){
    const m=await leader();if(!m)return json({error:'leader_session_required'},401);
    const {data,error}=await sb.from('leader_partner_onboarding_launches').select('id,partner_type,partner_id,incentive_amount,status,created_at,claimed_at,credited_at,expires_at').eq('leader_id',m.external_id).order('created_at',{ascending:false}).limit(100);
    if(error)throw error;
    const rows=data||[];
    const summary={started:rows.length,pending:rows.filter((x:any)=>['Launched','Claimed'].includes(String(x.status))).length,activated:rows.filter((x:any)=>x.status==='Credited').length,earned:rows.filter((x:any)=>x.status==='Credited').reduce((s:number,x:any)=>s+Number(x.incentive_amount||0),0)};
    return json({ok:true,leader:{id:m.external_id,name:m.name},summary,rows});
  }

  return json({error:'unknown_action'},400);
 }catch(e){
  console.error(e);
  const msg=String((e as any)?.message||e);
  if(msg.includes('partner_onboarding_source_conflict'))return json({error:'partner_onboarding_source_conflict'},409);
  return json({error:'unexpected_error',detail:msg},500);
 }
});