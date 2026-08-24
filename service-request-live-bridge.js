(function(){
'use strict';
const VERSION='1.0.0';
const cfg=window.DBEST_RUNTIME_CONFIG||{};
const BASE=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const KEY=String(cfg.supabasePublishableKey||'');
const PENDING_KEY='dbest_manual_service_pending_v1';
if(!BASE||!KEY)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=(v,n=500)=>String(v??'').trim().slice(0,n);
const memberToken=()=>{try{return String(window.DBEST_MEMBER_LIVE?.getToken?.()||localStorage.getItem('dbest_member_live_token')||'')}catch(e){return''}};
const ownerToken=()=>{try{return String(window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.()||sessionStorage.getItem('dbest_owner_session_token')||'')}catch(e){return''}};
function notify(m){try{if(typeof toast==='function')toast(m);else console.log(m)}catch(e){console.log(m)}}
async function api(body,headers={}){
  const r=await fetch(BASE+'/functions/v1/service-request-live',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',...headers},body:JSON.stringify(body||{}),cache:'no-store'});
  let d={};try{d=await r.json()}catch(e){}
  if(!r.ok)throw new Error(d.error||d.detail||('HTTP '+r.status));
  return d;
}
function pending(){try{const a=JSON.parse(localStorage.getItem(PENDING_KEY)||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}}
function savePending(a){try{localStorage.setItem(PENDING_KEY,JSON.stringify(a.slice(-30)))}catch(e){}}
function queue(tx){const a=pending();if(!a.some(x=>x.id===tx.id))a.push({id:tx.id,tx,at:Date.now()});savePending(a)}
async function sendRequest(tx,silent=false){
  const token=memberToken();
  if(!token){queue(tx);if(!silent)notify('Service request saved. Operations notification will send after secure member session reconnects.');return null}
  try{
    const d=await api({action:'create',transaction:tx},{'x-dbest-member-token':token});
    try{tx.serviceRequestId=d.request?.request_id||('SR-'+tx.id);tx.operationsEmailStatus=d.emailSent?'Sent':(d.emailStatus||'Recorded');if(typeof save==='function')save()}catch(e){}
    if(!silent)notify(d.emailSent?'Service request sent to DBest Operations.':'Service request recorded in DBest Operations queue.');
    return d;
  }catch(e){
    queue(tx);
    if(!silent)notify('Service request recorded locally; operations notification will retry automatically.');
    console.warn('DBest manual service request sync',e);
    return null;
  }
}
async function flush(){
  const token=memberToken();if(!token)return;
  let a=pending();if(!a.length)return;
  const keep=[];
  for(const x of a){try{await api({action:'create',transaction:x.tx},{'x-dbest-member-token':token})}catch(e){keep.push(x)}}
  savePending(keep);
}
function findNewTx(before,id,i){
  try{
    return (Array.isArray(txs)?txs:[]).find(x=>!before.has(String(x.id||''))&&String(x.meta?.source||'')==='Content-wise Service Form'&&String(x.meta?.sectionId||'')===String(id)&&Number(x.meta?.subIndex)===Number(i));
  }catch(e){return null}
}
const originalSubmit=window.submitContentApplication;
if(typeof originalSubmit==='function'&&!originalSubmit.__dbestOpsWrapped){
  const wrapped=async function(e,id,i){
    const before=new Set((Array.isArray(window.txs)?window.txs:(typeof txs!=='undefined'&&Array.isArray(txs)?txs:[])).map(x=>String(x.id||'')));
    const out=await originalSubmit.apply(this,arguments);
    setTimeout(()=>{const tx=findNewTx(before,id,i);if(tx)sendRequest(tx,false)},60);
    return out;
  };
  wrapped.__dbestOpsWrapped=true;wrapped.__dbestOriginal=originalSubmit;window.submitContentApplication=wrapped;
}

function sensitiveKey(k){return /(aadhaar|aadhar|pan|account|bank|ifsc|chassis|passport|dob|birth|otp|password|card|cvv)/i.test(String(k||''))}
function masked(v){const s=String(v??'');if(s.length<=4)return '••••';return '•'.repeat(Math.min(8,Math.max(4,s.length-4)))+s.slice(-4)}
function appHtml(app){
  const a=Object.entries(app||{}).filter(([,v])=>String(v??'').trim());
  if(!a.length)return '<div class="notice">No application fields recorded.</div>';
  return '<div class="txDetailGrid">'+a.map(([k,v])=>`<div class="txDetailCell"><small>${esc(k.replace(/([A-Z])/g,' $1'))}</small><b>${esc(sensitiveKey(k)?masked(v):v)}</b></div>`).join('')+'</div>';
}
function docsHtml(docs){
  const a=Object.entries(docs||{});if(!a.length)return '<div class="notice">No document metadata recorded.</div>';
  return '<div class="ownerQueue">'+a.map(([k,d])=>`<div class="ownerQueueRow"><b>${esc(k.replace(/([A-Z])/g,' $1'))}</b><small>${esc(d?.name||'File')} • ${Math.round(Number(d?.size||0)/1024)} KB • ${esc(d?.type||'')}</small></div>`).join('')+'</div><div class="notice" style="margin-top:8px"><b>Current document status:</b> filename/type/size are recorded. Actual file bytes are not yet stored in DBest secure storage; do not process document-dependent requests until secure upload is enabled.</div>';
}
function statusCounts(rows){const c={New:0,'In Progress':0,'Awaiting Customer':0,Completed:0,Rejected:0};rows.forEach(x=>{if(c[x.status]!==undefined)c[x.status]++});return c}
let currentRows=[],currentSettings={email:'',enabled:true};
async function loadOwnerRows(){
  const token=ownerToken();if(!token)throw new Error('Owner security session expired. Please login again.');
  const d=await api({action:'list'},{'x-dbest-owner-token':token});currentRows=Array.isArray(d.requests)?d.requests:[];currentSettings=d.settings||{};return d;
}
window.openServiceRequestQueue=async function(){
  if(typeof session!=='undefined'&&session.role!=='owner')return typeof ownerLogin==='function'?ownerLogin():null;
  try{await loadOwnerRows()}catch(e){notify(e.message);return}
  const c=statusCounts(currentRows),rows=currentRows;
  const cards=rows.map((r,idx)=>`<div class="ownerQueueRow" style="margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap"><div><h4 style="margin:0">${esc(r.section)}${r.subsection?' • '+esc(r.subsection):''}</h4><small>${esc(r.request_id)} • ${esc(r.transaction_id)} • ${new Date(r.created_at).toLocaleString('en-IN')}</small></div><span class="approvalPill ${r.status==='Completed'?'approvalApproved':r.status==='Rejected'?'approvalRejected':'approvalPending'}">${esc(r.status||'New')}</span></div>
    <div class="revenueGrid"><div class="revenueCell"><small>Member</small><b>${esc(r.member_name||r.member_id)}</b><small>${esc(r.member_id)}</small></div><div class="revenueCell"><small>Contact</small><b>${esc(r.member_mobile||'—')}</b><small>${esc(r.member_email||'—')}</small></div><div class="revenueCell"><small>Fee / Amount</small><b>₹${Number(r.amount||0).toLocaleString('en-IN')}</b></div><div class="revenueCell"><small>Payment</small><b>${esc(r.payment_status||'—')}</b></div></div>
    <details><summary style="cursor:pointer;font-weight:850">Application summary</summary>${appHtml(r.application)}</details>
    <details style="margin-top:8px"><summary style="cursor:pointer;font-weight:850">Submitted document list</summary>${docsHtml(r.document_manifest)}</details>
    <div class="serviceFormGrid" style="margin-top:10px"><div class="sf"><label>Request Status</label><select id="srStatus_${idx}">${['New','In Progress','Awaiting Customer','Completed','Rejected'].map(s=>`<option ${s===r.status?'selected':''}>${s}</option>`).join('')}</select></div><div class="sf"><label>Payment / Eligibility Note</label><input id="srPay_${idx}" value="${esc(r.payment_status||'')}"></div><div class="sf full"><label>Owner / Operations Note</label><textarea id="srNote_${idx}">${esc(r.owner_note||'')}</textarea></div><div class="sf full"><button class="mini" onclick="saveServiceRequestUpdate(${idx})">Save Request Update</button> <button class="mini" onclick="txDetailsView('${esc(r.transaction_id)}')">Open Transaction</button></div></div>
  </div>`).join('')||'<div class="notice">No manual service requests yet.</div>';
  if(typeof sectionScreen!=='function')return;
  sectionScreen(`${typeof sectionTopBar==='function'?sectionTopBar('📥 Manual Service Requests','Forms • VAHAN • Govt • Repairs • Jobs • Other','ownerOperations()'):''}<div class="sectionContent owner55"><div class="ownerPanelCard"><h3 style="margin-top:0">Operations Notification</h3><form class="form" onsubmit="saveManualServiceEmail(event)"><div class="f"><label>Manual Service Operations Email</label><input type="email" name="email" value="${esc(currentSettings.email||'')}" required></div><div class="f"><label><input type="checkbox" name="enabled" ${currentSettings.enabled!==false?'checked':''}> Email notifications enabled</label></div><div class="f full"><button class="btn">Save Operations Email</button></div></form><div class="notice">New form-based/non-deeplink requests are stored here and emailed to this address. Sensitive identity fields and raw documents are not included in the email.</div></div><div class="owner55Summary" style="margin:14px 0"><div class="owner55Stat"><small>New</small><b>${c.New}</b></div><div class="owner55Stat"><small>In Progress</small><b>${c['In Progress']}</b></div><div class="owner55Stat"><small>Awaiting Customer</small><b>${c['Awaiting Customer']}</b></div><div class="owner55Stat"><small>Completed</small><b>${c.Completed}</b></div></div><div class="ownerQueue">${cards}</div></div>`);
};
window.saveManualServiceEmail=async function(e){
  e.preventDefault();const f=new FormData(e.target),token=ownerToken();
  try{await api({action:'save_settings',email:text(f.get('email'),220),enabled:f.get('enabled')==='on'},{'x-dbest-owner-token':token});notify('Manual service operations email saved.');openServiceRequestQueue()}catch(err){notify('Could not save operations email: '+err.message)}
};
window.saveServiceRequestUpdate=async function(idx){
  const r=currentRows[idx];if(!r)return;const token=ownerToken();
  try{await api({action:'update',transactionId:r.transaction_id,status:qval('srStatus_'+idx),paymentStatus:qval('srPay_'+idx),ownerNote:qval('srNote_'+idx)},{'x-dbest-owner-token':token});notify('Service request updated.');openServiceRequestQueue()}catch(err){notify('Could not update request: '+err.message)}
};
function qval(id){return document.getElementById(id)?.value||''}
function injectOwnerButton(){
  try{
    if(typeof session==='undefined'||session.role!=='owner'||document.getElementById('dbestManualServiceQueueBtn'))return;
    const title=document.querySelector('.sectionTitle b')?.textContent||'';
    if(!/Owner Operations|Project Owner/i.test(title))return;
    const grids=[...document.querySelectorAll('.owner55Grid')];const grid=grids[grids.length-1];if(!grid)return;
    const b=document.createElement('button');b.id='dbestManualServiceQueueBtn';b.className='owner55Action';b.onclick=()=>openServiceRequestQueue();b.innerHTML='<span>📥</span><b>Manual Service Requests</b><small>Forms, VAHAN, Govt, Repairs, Jobs and other non-deeplink requests.</small>';
    grid.appendChild(b);
  }catch(e){}
}
new MutationObserver(injectOwnerButton).observe(document.documentElement,{childList:true,subtree:true});
setInterval(()=>{injectOwnerButton();flush()},2500);
setTimeout(flush,800);
window.DBEST_SERVICE_REQUEST_LIVE={version:VERSION,sendRequest,flush,openQueue:()=>openServiceRequestQueue()};
})();