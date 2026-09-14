(function(){
'use strict';
if(!/\/vaahak-standalone-v2\.html\/?$/i.test(location.pathname))return;
if(window.DBEST_VAAHAK_ACTIVE_JOB_FIX)return;
const C=window.DBEST_RUNTIME_CONFIG||{},B=String(C.supabaseUrl||'').replace(/\/$/,''),K=C.supabasePublishableKey||'',TOK='dbest_vaahak_live_token';
const COM=B+'/functions/v1/vaahak-commerce-live',DIS=B+'/functions/v1/vaahak-dispatch-live';
let tmr=null,busy=false;
const tok=()=>{try{return localStorage.getItem(TOK)||''}catch(_){return''}};
async function post(url,action,body={}){const h={'apikey':K,'Authorization':'Bearer '+K,'Content-Type':'application/json'};if(tok())h['x-vaahak-token']=tok();const r=await fetch(url,{method:'POST',cache:'no-store',headers:h,body:JSON.stringify({action,...body})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d}
async function refresh(force=false){clearTimeout(tmr);if(!tok())return;try{if(typeof pinModalOpen!=='undefined'&&pinModalOpen&&!force){tmr=setTimeout(()=>refresh(false),2000);return}const d=await post(COM,'dashboard_status',{}),p=d.partner||{},jobs=Array.isArray(d.jobs)?d.jobs:[];try{current=p}catch(_){ }const active=jobs.find(j=>String(j.assigned_partner_id||'')===String(p.id||'')&&['Accepted','Trip Started'].includes(String(j.status||'')))||null;let job=active;if(!job&&p.available&&p.owner_approval==='Approved'){try{const o=await post(DIS,'my_offer',{});job=o?.job||null}catch(_){}}try{renderJob(job)}catch(_){ }tmr=setTimeout(()=>refresh(false),2000)}catch(_){tmr=setTimeout(()=>refresh(false),3000)}}
window.loadStatus=refresh;
setTimeout(()=>refresh(true),250);
window.DBEST_VAAHAK_ACTIVE_JOB_FIX={version:'1.0.0',refresh:()=>refresh(true)};
})();