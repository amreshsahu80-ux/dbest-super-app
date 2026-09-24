(function(){
'use strict';
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=String(cfg.supabasePublishableKey||'');
if(!BASE||!KEY)return;
const API=BASE+'/functions/v1/whatsapp-notification-live';

function token(){try{return sessionStorage.getItem('dbest_owner_session_token')||''}catch(_){return ''}}
function headers(){return {apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json','x-dbest-owner-token':token()}}
async function call(body){
 const r=await fetch(API,{method:'POST',cache:'no-store',headers:headers(),body:JSON.stringify(body)});
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(d.error||d.detail?.error?.message||d.detail||('HTTP '+r.status));
 return d;
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function notice(t,ok=true){let n=document.getElementById('dbestWaOwnerToast');if(!n){n=document.createElement('div');n.id='dbestWaOwnerToast';n.style.cssText='position:fixed;left:14px;right:14px;bottom:20px;max-width:560px;margin:auto;z-index:2147483647;padding:13px 15px;border-radius:14px;font:800 13px system-ui;box-shadow:0 12px 35px #0003';document.body.appendChild(n)}n.textContent=t;n.style.background=ok?'#eafff3':'#fff0f0';n.style.color=ok?'#146b43':'#9b2525';n.style.display='block';clearTimeout(n._t);n._t=setTimeout(()=>n.style.display='none',5000)}

let state=null;
async function load(){
 state=await call({action:'owner_config_status'});
 render();
}
function templateRows(){
 const rows=state?.templates||[];
 if(!rows.length)return '<div style="padding:12px;color:#64748b">No DBest WhatsApp templates found.</div>';
 const ctaEvents=new Set(['vendor_new_order','vaahak_new_request','service_partner_new_job']);
 const v4Name=x=>String(x.event_type||'').replace('vendor_new_order','dbest_vendor_new_order_v4').replace('vaahak_new_request','dbest_vaahak_new_request_v4').replace('service_partner_new_job','dbest_service_partner_new_job_v4');
 const pill=(label,status)=>{const s=String(status||'PENDING').toUpperCase(),ok=s==='APPROVED',bad=s==='REJECTED'||s==='NOT_FOUND';return '<span style="padding:5px 8px;border-radius:999px;font:800 9px system-ui;background:'+(ok?'#e8fff1':bad?'#fff0f0':'#fff5df')+';color:'+(ok?'#166534':bad?'#9b2525':'#92400e')+'">'+esc(label+': '+s)+'</span>'};
 return rows.map(x=>{const ms=String(x.metaStatus||'').toUpperCase()||(x.enabled?'APPROVED':'PENDING'),cs=String(x.ctaStatus||'').toUpperCase(),active=String(x.template_name||''),hasCta=ctaEvents.has(String(x.event_type||'')),activeStatus=x.enabled?'APPROVED':'OFF';let extra='';if(hasCta){extra='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px">'+pill('Active',activeStatus)+pill('CTA v4',cs||'PENDING')+'</div><div style="font-size:10px;color:#64748b;margin-top:5px">Active: '+esc(active)+'<br>CTA: '+esc(v4Name(x))+'</div>'}else{extra='<div style="margin-top:7px">'+pill('Template',ms)+'</div>'}return '<div style="padding:11px 0;border-bottom:1px solid #eef2f7"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><b>'+esc(x.event_type)+'</b><div style="font-size:11px;color:#64748b;margin-top:2px">'+esc(x.recipient_type)+'</div></div>'+pill('Rule',x.enabled?'ON':'OFF')+'</div>'+extra+'</div>'}).join('');
}
function render(){
 let m=document.getElementById('dbestWaOwnerModal');if(!m)return;
 const c=state||{};
 m.querySelector('.waBody').innerHTML=
 '<div style="display:grid;gap:14px">'+
 '<div style="padding:12px 14px;border-radius:14px;background:'+(c.configured?'#eafff3':'#fff7e8')+';color:'+(c.configured?'#146b43':'#8a5a00')+';font:800 12px system-ui">'+(c.configured?'Meta WhatsApp credentials stored in DBest Vault.':'Meta WhatsApp credentials are not complete yet.')+'</div>'+
 '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">'+
 '<label style="display:grid;gap:5px;font:800 11px system-ui;color:#334155">Phone Number ID<input id="waPhoneId" value="'+esc(c.phoneNumberId||'')+'" placeholder="Meta Phone Number ID" style="padding:12px;border:1px solid #dbe3ef;border-radius:12px"></label>'+
 '<label style="display:grid;gap:5px;font:800 11px system-ui;color:#334155">WABA ID<input id="waWabaId" value="'+esc(c.wabaId||'')+'" placeholder="WhatsApp Business Account ID" style="padding:12px;border:1px solid #dbe3ef;border-radius:12px"></label>'+
 '<label style="display:grid;gap:5px;font:800 11px system-ui;color:#334155">Access Token<input id="waAccess" type="password" placeholder="'+esc(c.accessTokenMasked||'Paste Meta access token')+'" style="padding:12px;border:1px solid #dbe3ef;border-radius:12px"></label>'+
 '<label style="display:grid;gap:5px;font:800 11px system-ui;color:#334155">Meta App Secret<input id="waAppSecret" type="password" placeholder="'+esc(c.appSecretMasked||'Paste Meta App Secret')+'" style="padding:12px;border:1px solid #dbe3ef;border-radius:12px"></label>'+
 '<label style="display:grid;gap:5px;font:800 11px system-ui;color:#334155">Graph API Version<input id="waGraph" value="'+esc(c.graphVersion||'v25.0')+'" style="padding:12px;border:1px solid #dbe3ef;border-radius:12px"></label>'+
 '</div>'+
 '<button id="waSave" style="border:0;border-radius:13px;padding:12px 14px;background:#128C7E;color:#fff;font:900 12px system-ui;cursor:pointer">Save Securely to DBest Vault</button>'+
 '<div style="padding:13px;border:1px solid #dbe3ef;border-radius:14px;background:#f8fafc"><div style="font:900 11px system-ui;color:#334155">Meta Webhook Callback URL</div><div style="font:700 11px ui-monospace,monospace;word-break:break-all;margin-top:6px">'+esc(c.webhookUrl||'Save credentials first')+'</div><button id="waCopyUrl" style="margin-top:8px;border:1px solid #cbd5e1;background:#fff;border-radius:9px;padding:7px 9px;font:800 10px system-ui">Copy URL</button></div>'+
 '<div style="padding:13px;border:1px solid #dbe3ef;border-radius:14px;background:#f8fafc"><div style="font:900 11px system-ui;color:#334155">Webhook Verify Token</div><div style="font:700 11px ui-monospace,monospace;word-break:break-all;margin-top:6px">'+esc(c.verifyToken||'Generated after first save')+'</div><button id="waCopyToken" style="margin-top:8px;border:1px solid #cbd5e1;background:#fff;border-radius:9px;padding:7px 9px;font:800 10px system-ui">Copy Token</button></div>'+
 '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button id="waSubmitTemplates" style="border:0;border-radius:13px;padding:12px;background:#175cff;color:#fff;font:900 11px system-ui">Submit DBest Templates to Meta</button><button id="waSyncTemplates" style="border:1px solid #b8c6db;border-radius:13px;padding:12px;background:#fff;color:#17325c;font:900 11px system-ui">Sync Template Approvals</button></div>'+
 '<div><h3 style="margin:4px 0 4px;font:900 14px system-ui">Automatic WhatsApp Events</h3>'+templateRows()+'</div>'+
 '</div>';

 const q=id=>m.querySelector(id);
 q('#waSave').onclick=save;
 q('#waSubmitTemplates').onclick=submitTemplates;
 q('#waSyncTemplates').onclick=syncTemplates;
 q('#waCopyUrl').onclick=()=>copy(c.webhookUrl||'');
 q('#waCopyToken').onclick=()=>copy(c.verifyToken||'');
}
async function copy(v){if(!v)return;try{await navigator.clipboard.writeText(v);notice('Copied.')}catch(_){notice('Copy failed.',false)}}
async function save(){
 try{
  const m=document.getElementById('dbestWaOwnerModal');
  const body={action:'owner_configure',phoneNumberId:m.querySelector('#waPhoneId').value.trim(),wabaId:m.querySelector('#waWabaId').value.trim(),accessToken:m.querySelector('#waAccess').value.trim(),appSecret:m.querySelector('#waAppSecret').value.trim(),graphVersion:m.querySelector('#waGraph').value.trim()};
  const d=await call(body);notice('WhatsApp credentials saved securely.');await load();if(d.verifyToken)notice('Saved. Now configure the webhook in Meta using the URL and Verify Token shown here.');
 }catch(e){console.error(e);notice('Save failed: '+e.message,false)}
}
async function submitTemplates(){
 if(!confirm('Submit the DBest transactional WhatsApp templates to Meta for approval?'))return;
 try{const d=await call({action:'owner_submit_templates'});const ok=(d.submitted||[]).filter(x=>x.ok).length,fail=(d.submitted||[]).length-ok;notice('Template submissions: '+ok+' successful'+(fail?', '+fail+' need review':'')+'.');await syncTemplates();}catch(e){console.error(e);notice('Template submission failed: '+e.message,false)}
}
async function syncTemplates(){
 try{const d=await call({action:'owner_sync_templates'});state.templates=d.templates||state.templates;render();notice('Meta template status synced.');}catch(e){console.error(e);notice('Template sync failed: '+e.message,false)}
}
function open(){
 let m=document.getElementById('dbestWaOwnerModal');
 if(!m){
  m=document.createElement('div');m.id='dbestWaOwnerModal';m.style.cssText='position:fixed;inset:0;background:#0f172a88;z-index:2147483646;display:grid;place-items:center;padding:12px';
  m.innerHTML='<div style="width:min(760px,100%);max-height:92dvh;overflow:auto;background:#fff;border-radius:22px;box-shadow:0 30px 80px #0005"><div style="position:sticky;top:0;background:#fff;padding:16px 18px;border-bottom:1px solid #e7edf5;display:flex;align-items:center;justify-content:space-between;z-index:2"><div><b style="font:900 18px system-ui">WhatsApp Cloud API</b><div style="font:700 11px system-ui;color:#64748b;margin-top:3px">Direct Meta integration • DBest secure vault</div></div><button class="waClose" style="border:0;background:#eef2f7;width:36px;height:36px;border-radius:50%;font-size:18px">×</button></div><div class="waBody" style="padding:18px">Loading…</div></div>';
  document.body.appendChild(m);m.querySelector('.waClose').onclick=()=>m.remove();m.onclick=e=>{if(e.target===m)m.remove()};
 }
 load().then(()=>{if(!sessionStorage.getItem('dbest_wa_cta_autosync_v1')){sessionStorage.setItem('dbest_wa_cta_autosync_v1','1');setTimeout(()=>syncTemplates().catch(()=>{}),350)}}).catch(e=>{m.querySelector('.waBody').innerHTML='<div style="padding:16px;color:#9b2525;font:800 13px system-ui">Unable to load WhatsApp setup: '+esc(e.message)+'</div>'});
}
function install(){
 if(location.pathname.toLowerCase()!='/owner'||!token()||document.getElementById('dbestOwnerWhatsAppSetup'))return;
 const b=document.createElement('button');b.id='dbestOwnerWhatsAppSetup';b.type='button';b.textContent='WhatsApp Setup';b.style.cssText='position:fixed;right:14px;bottom:70px;z-index:2147483643;border:0;border-radius:999px;padding:11px 14px;background:#25D366;color:#083b27;font:900 12px system-ui;box-shadow:0 9px 28px rgba(0,0,0,.2);cursor:pointer';b.onclick=open;document.body.appendChild(b);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,900),{once:true});else setTimeout(install,900);
setInterval(install,5000);
window.DBEST_WHATSAPP_OWNER={open,load,syncTemplates,version:'1.2.0-cta-status-ui'};
})();