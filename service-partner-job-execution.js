(function(){
'use strict';
const VERSION='1.0.1';
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=String(cfg.supabasePublishableKey||'');
if(!BASE||!KEY)return;
const ENDPOINT=BASE+'/functions/v1/hyperlocal-job-execution-live';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=v=>String(v??'').trim();
const notify=m=>{try{typeof toast==='function'?toast(m):alert(m)}catch(_){alert(m)}};
function authHeaders(){
 const h={apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'};
 let pt='',mt='';try{pt=text(localStorage.getItem('dbest_partner_live_token'))}catch(_){}
 try{mt=text(window.DBEST_MEMBER_LIVE?.getToken?.()||localStorage.getItem('dbest_member_live_token'))}catch(_){}
 if(pt)h['x-dbest-partner-token']=pt;else if(mt)h['x-dbest-member-token']=mt;
 return h;
}
function hasSession(){const h=authHeaders();return !!(h['x-dbest-partner-token']||h['x-dbest-member-token'])}
async function api(body){
 const r=await fetch(ENDPOINT,{method:'POST',cache:'no-store',headers:authHeaders(),body:JSON.stringify(body||{})});let d={};try{d=await r.json()}catch(_){}
 if(!r.ok){const e=new Error(d.error||d.detail||('HTTP '+r.status));e.data=d;throw e}return d;
}
function isPortal(){return !!(document.getElementById('dbestSpAvailability')||document.getElementById('dbestFreeSpAvailability'))}
function host(){
 const form=document.getElementById('dbestFreeSpAvailability')||document.getElementById('dbestSpAvailability');
 return form?.closest('.sectionContent')||document.querySelector('.sectionContent');
}
function actionButton(j){
 const s=text(j.status);
 if(s==='Assigned')return `<button class="btn" type="button" onclick="DBEST_SERVICE_JOB_EXECUTION.act('${esc(j.transaction_id)}','accept')">✓ Accept Job</button>`;
 if(s==='Accepted')return `<button class="btn" type="button" onclick="DBEST_SERVICE_JOB_EXECUTION.act('${esc(j.transaction_id)}','start')">▶ Start Service</button>`;
 if(s==='In Progress')return `<button class="btn" type="button" onclick="DBEST_SERVICE_JOB_EXECUTION.act('${esc(j.transaction_id)}','complete')">✅ Complete Service</button>`;
 return '';
}
function statusBadge(s){const done=s==='Completed',active=['Assigned','Accepted','In Progress'].includes(s);return `<span style="display:inline-block;padding:5px 8px;border-radius:999px;font-size:10px;font-weight:850;background:${done?'#e9f8ef':active?'#eaf1ff':'#eef2f7'};color:${done?'#17633f':active?'#175cff':'#687386'}">${esc(s||'Open')}</span>`}
function jobCard(j){
 const when=[j.preferred_date,j.preferred_slot].filter(Boolean).join(' • '),where=[j.address,j.city,j.pincode].filter(Boolean).join(', ');
 return `<div class="ownerQueueRow" style="margin-bottom:10px">
   <div style="display:flex;justify-content:space-between;gap:8px;align-items:start;flex-wrap:wrap"><div><b>${esc(j.service_type||'Home Service')}</b><small style="display:block">${esc(j.transaction_id||'')}</small></div>${statusBadge(text(j.status))}</div>
   ${where?`<div style="margin-top:8px;font-size:12px"><b>Location:</b> ${esc(where)}</div>`:''}
   ${when?`<div style="margin-top:5px;font-size:12px"><b>Preferred:</b> ${esc(when)}</div>`:''}
   ${j.details?`<div style="margin-top:5px;font-size:12px"><b>Work:</b> ${esc(j.details)}</div>`:''}
   <div style="margin-top:9px">${actionButton(j)}</div>
 </div>`;
}
function hideLegacyList(){
 document.querySelectorAll('.ownerPanelCard h3').forEach(h=>{if(/^Assigned Home Jobs$/i.test(text(h.textContent))&&!h.closest('#dbestServiceJobExecution')){const p=h.closest('.ownerPanelCard');if(p)p.style.display='none'}});
}
let inFlight=false,lastRenderedAt=0;
async function render(){
 if(inFlight||!isPortal()||!hasSession())return false;
 const root=host();if(!root)return false;inFlight=true;
 let box=document.getElementById('dbestServiceJobExecution');
 if(!box){box=document.createElement('div');box.id='dbestServiceJobExecution';box.className='ownerPanelCard';box.style.marginTop='12px';root.appendChild(box)}
 box.innerHTML='<h3>🧰 Live Job Execution</h3><div class="notice">Loading assigned jobs…</div>';
 try{
   const d=await api({action:'list'}),jobs=Array.isArray(d.jobs)?d.jobs:[];
   box.innerHTML=`<h3>🧰 Live Job Execution</h3><div class="notice"><b>${jobs.filter(j=>!['Completed','Cancelled'].includes(text(j.status))).length}</b> active job(s) • Accept → Start Service → Complete Service</div>${jobs.length?`<div class="ownerQueue">${jobs.map(jobCard).join('')}</div>`:'<div class="notice">No assigned jobs yet. Keep your availability ON to receive nearby requests.</div>'}`;
   hideLegacyList();lastRenderedAt=Date.now();return true;
 }catch(e){
   if(['owner_approval_required','service_partner_not_registered'].includes(e.message)){box.remove();return false}
   box.innerHTML='<h3>🧰 Live Job Execution</h3><div class="notice">Live jobs could not be loaded. Please refresh or login again.</div>';lastRenderedAt=Date.now();return false;
 }finally{inFlight=false}
}
async function act(transactionId,step){
 const labels={accept:'Accepting job…',start:'Starting service…',complete:'Completing service…'};notify(labels[step]||'Updating job…');
 try{const d=await api({action:'job_action',transactionId,step});notify(step==='accept'?'Job accepted.':step==='start'?'Service marked In Progress.':'Service completed successfully.');await render();return d}catch(e){const map={invalid_job_transition:'This job status has already changed. Refresh and retry.',assigned_job_not_found:'This job is no longer assigned to this account.',owner_approval_required:'Owner approval is required before executing jobs.',super_admin_operational_hold:'This account is currently on operational hold.'};notify(map[e.message]||('Job update failed: '+e.message));await render();return null}
}
let timer;
function schedule(){if(Date.now()-lastRenderedAt<400)return;clearTimeout(timer);timer=setTimeout(render,140)}
new MutationObserver(ms=>{
 const relevant=ms.some(m=>{const t=m.target?.nodeType===1?m.target:m.target?.parentElement;if(t?.closest?.('#dbestServiceJobExecution'))return false;return true});
 if(relevant)schedule();
}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',e=>{if(e.target?.closest?.('#dbestServiceJobExecution'))return;setTimeout(render,450)},true);
[300,900,1800,3500].forEach(ms=>setTimeout(render,ms));
window.DBEST_SERVICE_JOB_EXECUTION={version:VERSION,render,act};
})();