(function(){
'use strict';
const VERSION='20261020-homejobs-customer-history-v1';
if(window.DBEST_HOMEJOBS_CUSTOMER_HISTORY?.version===VERSION)return;
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=String(cfg.supabasePublishableKey||'');
const API=BASE+'/functions/v1/homejobs-customer-history-live';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dt=v=>{if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric'})};
const money=n=>'₹'+Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const getToken=()=>{try{return String(window.DBEST_MEMBER_LIVE?.getToken?.()||localStorage.getItem('dbest_member_live_token')||'').trim()}catch(_){return''}};
let history=[],account='',filter='all',opening=0,busy=false;
function resetForAccount(t){if(account!==t){history=[];account=t;filter='all'}}
async function load(){
 const t=getToken();resetForAccount(t);
 if(!t)throw Error('member_login_required');
 if(!BASE||!KEY)throw Error('service_unavailable');
 const headers={'apikey':KEY,'Content-Type':'application/json','x-dbest-member-token':t};
 if(KEY.startsWith('eyJ'))headers.Authorization='Bearer '+KEY;
 const r=await fetch(API,{method:'POST',cache:'no-store',headers,body:'{}'});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(String(data.error||'history_unavailable'));
 if(getToken()!==t)throw Error('member_session_changed');
 history=Array.isArray(data.history)?data.history:[];return data;
}
const isDone=x=>String(x.status||'')==='Completed';
const isCancelled=x=>/Cancelled|Rejected/i.test(String(x.status||''));
function visible(){if(filter==='completed')return history.filter(isDone);if(filter==='active')return history.filter(x=>!isDone(x)&&!isCancelled(x));return history}
function card(x){
 const status=String(x.status||'Request Submitted'),completed=isDone(x),document=String(x.documentType||'');
 const action=document==='payment_receipt'?'<button type="button" class="mini" data-homejob-document="'+esc(x.transactionId)+'">🧾 View Receipt / Save PDF</button>':
    document==='service_summary'?'<button type="button" class="mini" data-homejob-document="'+esc(x.transactionId)+'">📄 Service Summary / Save PDF</button>':'<small style="color:#64748b">Receipt available after payment verification</small>';
 return '<article class="dbestHomeJobRow" style="border:1px solid #e2e8f2;border-radius:16px;background:#fff;padding:14px;margin:10px 0;box-shadow:0 5px 18px rgba(16,40,80,.05)">'+
 '<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px"><b>🛠️ '+esc(x.service)+'</b><span style="border-radius:99px;padding:5px 10px;background:'+(completed?'#e5f7ed':isCancelled(x)?'#fff0ef':'#edf3ff')+';color:'+(completed?'#17633f':isCancelled(x)?'#9a3535':'#1552bd')+';font-size:12px;font-weight:800">'+esc(status)+'</span></div>'+
 '<div style="margin:8px 0;color:#64748b;font-size:13px">Ref: <b>'+esc(x.transactionId)+'</b> • '+dt(x.createdAt)+'</div>'+
 '<div style="margin:5px 0;font-size:13px">Preferred: '+esc(x.preferredDate?dt(x.preferredDate):'Not specified')+(x.preferredSlot?' • '+esc(x.preferredSlot):'')+'</div>'+
 '<div style="margin:5px 0;font-size:13px">Assignment: <b>'+(x.assigned?'Partner assigned':'Awaiting partner')+'</b> • '+(completed?'Completed '+dt(x.completedAt):'Current status: '+esc(status))+'</div>'+
 '<div style="margin:9px 0;color:#45566c;font-size:13px">Billing: '+(x.payment?.verified?'Verified '+money(x.payment.amount):esc(x.payment?.status||'No confirmed charge'))+'</div>'+
 '<div style="margin-top:12px">'+action+'</div></article>';
}
function layout(){
 const all=history.length,done=history.filter(isDone).length,active=history.filter(x=>!isDone(x)&&!isCancelled(x)).length,receipts=history.filter(x=>x.documentType==='payment_receipt').length;
 return '<div class="sectionContent dbestHomeJobsCustomerPage" id="dbestHomeJobsCustomerPage">'+
 '<div class="sectionHero"><b>📚 My Home Services</b><small>Live service history, assignment status and verified payment receipts</small></div>'+
 '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:13px 0">'+
 [['Requests',all],['Active',active],['Completed',done]].map(z=>'<div style="padding:12px;border:1px solid #e2e8f2;border-radius:12px;background:#fff;text-align:center"><b style="display:block;font-size:20px">'+z[1]+'</b><small>'+z[0]+'</small></div>').join('')+'</div>'+
 '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0"><button type="button" class="mini" data-homejob-filter="all">All ('+all+')</button><button type="button" class="mini" data-homejob-filter="active">Active ('+active+')</button><button type="button" class="mini" data-homejob-filter="completed">Completed ('+done+')</button><button type="button" class="mini" data-homejob-refresh="1">↻ Refresh</button></div>'+
 '<div class="notice" style="font-size:12px">Receipt/Invoice records are shown only for confirmed payments. A completed but unbilled job receives a service summary, not a paid invoice. Available payment receipts: '+receipts+'.</div>'+
 '<div id="dbestHomeJobsCustomerRows">'+(visible().length?visible().map(card).join(''):'<div class="notice">No matching Home Services requests found for this account.</div>')+'</div></div>';
}
function paint(){const root=document.querySelector('#dbestHomeJobsCustomerPage');if(!root)return;root.outerHTML=layout()}
async function open(){
 const turn=++opening;
 if(typeof sectionScreen!=='function'||typeof sectionTopBar!=='function')return;
 if(!getToken()){
  sectionScreen(sectionTopBar('📚 My Service History','Member login required',"openService('jobs')")+'<div class="sectionContent"><div class="notice">Please sign in to your DBest member account to view private service history.</div><button class="btn" onclick="location.href=\'/preview-member-login-v2.html?return=%2F%3FopenService%3Djobs\'">Sign In</button></div>');return;
 }
 sectionScreen(sectionTopBar('📚 Home Jobs Dashboard','History • Tracking • Invoices',"openService('jobs')")+'<div class="sectionContent" id="dbestHomeJobsCustomerPage"><div class="notice">Loading your secure Home Jobs history…</div></div>');
 try{await load();if(turn!==opening)return;paint()}
 catch(err){if(turn!==opening)return;const box=document.getElementById('dbestHomeJobsCustomerPage');if(box)box.innerHTML='<div class="notice">'+esc(err.message==='member_login_required'?'Please sign in again.':'Could not retrieve history. Please retry.')+'</div><button class="btn" type="button" data-homejob-refresh="1">Retry</button>'}
}
function printDocument(id){
 const x=history.find(v=>String(v.transactionId)===String(id));if(!x||getToken()!==account)return;
 const receipt=x.documentType==='payment_receipt'&&x.payment?.verified&&Number(x.payment.amount)>0;
 const summary=x.documentType==='service_summary'&&isDone(x);
 if(!receipt&&!summary)return;
 const title=receipt?'DBest Payment Receipt':'DBest Home Service Completion Summary';
 const lines=[
  ['Document Type',title],['Transaction ID',x.transactionId],['Service',x.service],
  ['Request Date',dt(x.createdAt)],['Job Status',x.status],['Completed On',dt(x.completedAt)]
 ];
 if(receipt){
  lines.push(['Verified Amount',money(x.payment.amount)],['Payment Mode',x.payment.mode||'Recorded Payment'],['Payment Reference',x.payment.reference||x.transactionId]);
 }else lines.push(['Payment','No verified payment recorded — this is not a paid invoice']);
 const win=window.open('','_blank');if(!win)return;
 const html='<!doctype html><html><head><meta charset="utf-8"><title>'+esc(title)+'</title><style>body{font:15px Arial,sans-serif;color:#14213d;margin:35px;line-height:1.6}h1{font-size:22px}table{width:100%;border-collapse:collapse;margin-top:20px}td{padding:10px;border-bottom:1px solid #ddd}td:first-child{font-weight:bold;width:40%}.muted{color:#667}button{padding:10px 18px}@media print{button{display:none}}</style></head><body><h1>DBest — '+esc(title)+'</h1><div class="muted">Sarwashresth Services OPC Pvt Ltd. • dbest4u.com</div><table>'+lines.map(([k,v])=>'<tr><td>'+esc(k)+'</td><td>'+esc(v)+'</td></tr>').join('')+'</table><p class="muted">'+(receipt?'This is a payment receipt based on a verified DBest transaction. A statutory GST tax invoice, if applicable, requires the issuer’s verified tax-invoice details.':'Service-completion summary only. Payment has not been confirmed in the DBest ledger.')+'</p><button onclick="window.print()">Print / Save as PDF</button></body></html>';
 win.document.open();win.document.write(html);win.document.close();win.focus();
}
function inject(){
 const root=document.querySelector('.sectionContent'),hero=root?.querySelector('.sectionHero > b');
 if(!root||!hero||!/Home Jobs & Local Services/i.test(hero.textContent||''))return;
 const tabs=root.querySelector('.subs');if(!tabs||tabs.querySelector('#dbestHomeJobsCustomerDashboardTile'))return;
 const b=document.createElement('button');b.type='button';b.className='sub';b.id='dbestHomeJobsCustomerDashboardTile';
 const top=document.createElement('b');top.textContent='📚 My Service History & Invoices';
 const caption=document.createElement('small');caption.textContent='Track service requests • Completion details • Receipts';
 b.append(top,caption);b.addEventListener('click',open);
 tabs.prepend(b);
}
document.addEventListener('click',e=>{
 const b=e.target?.closest?.('[data-homejob-filter],[data-homejob-document],[data-homejob-refresh]');
 if(!b)return;
 if(b.hasAttribute('data-homejob-filter')){filter=b.getAttribute('data-homejob-filter')||'all';paint();return}
 if(b.hasAttribute('data-homejob-document')){printDocument(b.getAttribute('data-homejob-document'));return}
 if(b.hasAttribute('data-homejob-refresh')){if(busy)return;busy=true;open().finally(()=>{busy=false})}
});
let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;setTimeout(()=>{pending=false;inject()},100)}).observe(document.documentElement,{subtree:true,childList:true});
setTimeout(inject,400);setTimeout(inject,1600);
window.DBEST_HOMEJOBS_CUSTOMER_HISTORY={version:VERSION,open,refresh:load,document:printDocument,inject,filter:value=>{filter=value;paint()}};
})();
