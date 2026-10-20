(function(){
'use strict';
const VERSION='20261020-homejobs-customer-history-v1',SECTION='Home Jobs & Local Services';
if(window.DBEST_HOMEJOBS_CUSTOMER?.version===VERSION)return;
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=String(cfg.supabasePublishableKey||'');
const url=BASE+'/functions/v1/homejobs-customer-history-live';
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const date=v=>{if(!v)return'—';const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—'};
const money=v=>'₹'+Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:2});
const memberToken=()=>{try{return String(window.DBEST_MEMBER_LIVE?.getToken?.()||localStorage.getItem('dbest_member_live_token')||'').trim()}catch(_){return''}};
let cache=[],filter='all',loaded=false;
const isDone=x=>String(x.jobStatus||x.status||'')==='Completed',isCancelled=x=>/Cancelled|Rejected/.test(String(x.jobStatus||x.status||''));
function milestone(x){
 const steps=['Requested','Assigned','Accepted','In Progress','Completed'];
 const stage=x.jobStatus==='Completed'?4:x.jobStatus==='In Progress'?3:x.jobStatus==='Accepted'?2:x.jobStatus==='Assigned'?1:0;
 return '<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;margin-top:12px">'+steps.map((label,i)=>'<div style="text-align:center;font-size:10px;overflow-wrap:anywhere;color:'+(i<=stage?'#166534':'#687386')+'"><div style="height:5px;border-radius:6px;background:'+(i<=stage?'#22a765':'#dce5ef')+';margin-bottom:5px"></div>'+label+'</div>').join('')+'</div>';
}
function card(x){
 const status=isDone(x)?'Completed':isCancelled(x)?'Cancelled':x.jobStatus||x.status||'Pending Assignment';
 return '<div class="ownerPanelCard" style="border:1px solid #e1e8f2;border-radius:15px;padding:14px;margin:10px 0;background:#fff">'+
 '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><b>'+esc(x.service)+'</b><small style="display:block;color:#64748b">Request '+esc(x.id)+' • '+date(x.requestedAt)+'</small></div>'+
 '<span style="font-size:12px;font-weight:700;color:'+(isDone(x)?'#166534':'#1d4ed8')+'">'+esc(status)+'</span></div>'+
 '<p style="font-size:13px;color:#53637a;margin:7px 0">Visit: '+date(x.preferredDate)+' • '+esc(x.preferredSlot||'Slot to be confirmed')+(x.city?' • '+esc(x.city):'')+'</p>'+
 milestone(x)+
 '<p style="font-size:12px;color:#475569;margin:10px 0">Charge: '+(x.charge>0?money(x.charge)+' (recorded; payment requires verification)':'Quotation / service charge to be confirmed')+'</p>'+
 '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="mini" type="button" data-homejob-doc="summary" data-homejob-id="'+esc(x.id)+'">View / Save Service Summary</button>'+
 (x.receiptEligible?'<button class="mini" type="button" data-homejob-doc="receipt" data-homejob-id="'+esc(x.id)+'">Download Payment Receipt</button>':
 '<small style="font-size:11px;color:#64748b">Paid invoice / receipt available after verified collection</small>')+
 '</div></div>';
}
function view(){
 const data=cache.filter(x=>filter==='all'||(filter==='completed'?isDone(x):(filter==='active'?!isDone(x)&&!isCancelled(x):x.receiptEligible)));
 const buttons=[['all','All Services'],['active','Active'],['completed','Completed'],['receipts','Receipts']];
 const section=document.querySelector('.homeJobsHistoryPage');if(!section)return;
 section.innerHTML='<div class="sectionHero"><b>My Home Services</b><small>Live service history, assignment progress and your downloadable service documents</small></div>'+
 '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">'+buttons.map(([key,label])=>'<button type="button" class="mini" data-homejob-filter="'+key+'" style="font-weight:'+(key===filter?'800':'500')+'">'+label+'</button>').join('')+'</div>'+
 '<div class="refGrid" style="margin:10px 0"><div class="refCell"><small>Total Requests</small><b>'+cache.length+'</b></div><div class="refCell"><small>Completed</small><b>'+cache.filter(isDone).length+'</b></div><div class="refCell"><small>Active</small><b>'+cache.filter(x=>!isDone(x)&&!isCancelled(x)).length+'</b></div></div>'+
 (data.length?data.map(card).join(''):'<div class="notice">No '+(filter==='all'?'Home Service requests':'matching service records')+' found.</div>')+
 '<div class="notice" style="margin:15px 0;font-size:12px">Service Summaries are not proof of payment. Payment receipts appear only after a verified DBest collection. A GST tax invoice requires separately issued statutory details.</div>';
}
async function load(){
 if(!BASE||!KEY)throw Error('Home Services connection unavailable');
 const token=memberToken();if(!token)throw Error('Please log in to your DBest member account');
 const response=await fetch(url,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY,'x-dbest-member-token':token},body:JSON.stringify({action:'list'})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.ok!==true)throw Error(data.error||'Unable to load service history');
 cache=Array.isArray(data.services)?data.services:[];
 loaded=true;return data;
}
async function open(){
 if(typeof requireMember==='function'&&!requireMember())return;
 if(typeof sectionScreen!=='function'||typeof sectionTopBar!=='function')return;
 sectionScreen(sectionTopBar('🧰 My Home Services','Service History & Documents',"openService('jobs')")+'<div class="sectionContent homeJobsHistoryPage"><div class="notice">Loading your service records…</div></div>');
 filter='all';
 try{await load();if(document.querySelector('.homeJobsHistoryPage'))view()}
 catch(e){let root=document.querySelector('.homeJobsHistoryPage');if(root)root.innerHTML='<div class="notice">'+esc(e.message||e)+'</div><button class="btn" type="button" data-homejob-retry="1">Retry History</button>'}
}
function documentPage(x,type){
 const isReceipt=type==='receipt';
 if(isReceipt&&!x.receiptEligible)return null;
 const heading=isReceipt?'DBest Payment Receipt':'DBest Home Service Summary';
 const value=isReceipt?'<div><small>Verified DBest Payment</small><b>'+money(x.charge)+'</b></div><div><small>Method</small><b>'+esc(x.paymentMethod||'Verified payment')+'</b></div>':
 '<div><small>Service Charges</small><b>'+(x.charge>0?money(x.charge)+' (not a payment confirmation)':'To be confirmed')+'</b></div>';
 return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(heading)+'</title><style>body{font-family:Arial,Helvetica,sans-serif;color:#172441;background:#f3f6fb;margin:0}.sheet{max-width:800px;background:#fff;margin:24px auto;padding:32px;border-radius:15px}h1{font-size:22px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:15px}.meta div{border:1px solid #dae3ed;padding:13px;border-radius:8px}.meta small{display:block;color:#64748b}.actions{margin-top:20px}button{background:#175cff;color:#fff;border:0;border-radius:7px;padding:12px 16px}@media print{body{background:#fff}.sheet{margin:0;padding:20px}.actions{display:none}}@media(max-width:600px){.meta{grid-template-columns:1fr}.sheet{margin:0;padding:18px}}</style></head><body><main class="sheet"><img src="/dbest-logo.png" alt="DBest" style="width:145px;max-height:65px;object-fit:contain"><p>Sarwashresth Services OPC Pvt. Ltd.</p><h1>'+esc(heading)+'</h1><div class="meta"><div><small>Reference</small><b>'+esc(x.id)+'</b></div><div><small>Service</small><b>'+esc(x.service)+'</b></div><div><small>Request Date</small><b>'+date(x.requestedAt)+'</b></div><div><small>Service Status</small><b>'+esc(x.jobStatus||x.status)+'</b></div><div><small>Preferred Visit</small><b>'+date(x.preferredDate)+' • '+esc(x.preferredSlot||'To be confirmed')+'</b></div>'+value+'</div><p style="color:#475569;font-size:13px">'+(isReceipt?'This receipt relates only to the verified DBest-collected amount. No GST registration, tax breakdown or official tax-invoice number is represented.':'This service summary confirms the recorded request/status only. It is not a payment invoice or proof of settlement.')+'</p><div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div></main></body></html>';
}
function download(id,type){
 const item=cache.find(x=>String(x.id)===String(id));if(!item)return;
 const html=documentPage(item,type);if(!html)return;
 const win=window.open('','_blank');if(!win){alert('Please allow pop-ups to view the document.');return}
 win.document.open();win.document.write(html);win.document.close();
}
function install(){
 const base=window.openService;if(typeof base==='function'&&!base.__dbestHomeJobsHistory){
   const next=function(id){const result=base.apply(this,arguments);if(String(id)==='jobs')setTimeout(showTile,90);return result};
   next.__dbestHomeJobsHistory=true;next.__original=base;
   window.openService=next;try{openService=next}catch(_){}
 }
 showTile();
}
function showTile(){
 const section=document.querySelector('.sectionContent'),heading=document.querySelector('.sectionHero b');
 if(!section||!heading||!/Home Jobs/i.test(heading.textContent||''))return;
 if(section.querySelector('#dbestHomeJobsMyHistory'))return;
 const box=document.createElement('button');box.id='dbestHomeJobsMyHistory';box.type='button';box.className='sub';box.innerHTML='<b>🧾 My Service History & Documents</b><small>Track requests • completed services • receipts</small>';
 box.onclick=open;
 const target=section.querySelector('.subs');if(target)target.insertBefore(box,target.firstChild);else section.appendChild(box);
}
document.addEventListener('click',e=>{
 const button=e.target?.closest?.('button');if(!button)return;
 if(button.hasAttribute('data-homejob-filter')){filter=button.dataset.homejobFilter;view()}
 if(button.hasAttribute('data-homejob-doc'))download(button.dataset.homejobId,button.dataset.homejobDoc);
 if(button.hasAttribute('data-homejob-retry'))open();
});
[50,200,700,1600,3200].forEach(t=>setTimeout(install,t));
window.DBEST_HOMEJOBS_CUSTOMER={version:VERSION,open,load,download,showTile,receiptAvailable:id=>!!cache.find(x=>x.id===id)?.receiptEligible};
})();