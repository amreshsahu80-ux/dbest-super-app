(function(){
'use strict';
const VERSION='1.0.0';
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=String(cfg.supabasePublishableKey||'');
if(!BASE||!KEY)return;
const ENDPOINT=BASE+'/functions/v1/direct-payment-live';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2});
const memberToken=()=>{try{return String(window.DBEST_MEMBER_LIVE?.getToken?.()||localStorage.getItem('dbest_member_live_token')||'')}catch(e){return''}};
const ownerToken=()=>{try{return String(window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.()||sessionStorage.getItem('dbest_owner_session_token')||'')}catch(e){return''}};
function notify(m){try{if(typeof toast==='function')toast(m);else console.log(m)}catch(e){console.log(m)}}
function txById(id){try{return (Array.isArray(txs)?txs:[]).find(x=>String(x.id||'')===String(id||''))||null}catch(e){return null}}
async function post(body,headers={}){const r=await fetch(ENDPOINT,{method:'POST',cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',...headers},body:JSON.stringify(body||{})});let d={};try{d=await r.json()}catch(e){}if(!r.ok)throw new Error(d.error||d.detail||('HTTP '+r.status));return d}
let publicCfg=null,publicCfgAt=0;
async function getPublicConfig(){if(publicCfg&&Date.now()-publicCfgAt<60000)return publicCfg;const d=await post({action:'get_public'});publicCfg=d;publicCfgAt=Date.now();return d}
function payuReady(){try{return !!(payuSettings&&payuSettings.enabled&&String(payuSettings.mode||'').toLowerCase()==='live'&&String(payuSettings.createEndpoint||'').trim())}catch(e){return false}}
function safeId(id){return String(id||'').replace(/[^A-Za-z0-9_-]/g,'_')}
function choiceHtml(tx){
  const id=safeId(tx.id),ready=payuReady();
  return `<div class="ownerPanelCard dbestDualPayCard" id="dbestDualPay_${id}" style="margin:14px 0;border:1px solid #d9e4f7">
    <h3 style="margin:0 0 6px">Choose Payment Method</h3>
    <div class="notice" style="margin-bottom:10px">DBest Transaction ID: <b>${esc(tx.id)}</b> • Amount: <b>${money(tx.amount)}</b></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <button class="btn" type="button" onclick="openICICIDirectPayment('${esc(tx.id)}')">🏦 ICICI Direct</button>
      <button class="btn soft" type="button" onclick="openPayUPaymentChoice('${esc(tx.id)}')">💳 PayU Online</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:7px"><small>UPI to DBest company account • UTR verification</small><small>${ready?'Live PayU handoff available':'PayU option retained • live setup pending'}</small></div>
    <div id="dbestPayChoiceBody_${id}" style="margin-top:12px"></div>
  </div>`;
}
function decorate(txId){
  const tx=txById(txId);if(!tx)return;
  const root=document.querySelector('.paymentPage')||document.querySelector('.sectionContent');if(!root)return;
  const id='dbestDualPay_'+safeId(tx.id);document.getElementById(id)?.remove();
  const holder=document.createElement('div');holder.innerHTML=choiceHtml(tx);const card=holder.firstElementChild;
  const summary=root.querySelector('.paymentSummary');if(summary)root.insertBefore(card,summary);else root.prepend(card);
  root.querySelectorAll('button[onclick*="startPayU"]').forEach(b=>{b.style.display='none';b.dataset.dualPayHidden='1'});
  root.querySelectorAll('.payuBadge').forEach(x=>{x.textContent='💳 Online Payment';});
}
window.openICICIDirectPayment=async function(txId){
  const tx=txById(txId),body=document.getElementById('dbestPayChoiceBody_'+safeId(txId));if(!tx||!body)return;
  body.innerHTML='<div class="notice">Loading ICICI payment details…</div>';
  try{
    const d=await getPublicConfig(),c=d.config||{};
    if(!d.configured){body.innerHTML='<div class="notice"><b>ICICI Direct is reserved but not yet configured.</b><br>Owner must add the company UPI/QR details before customers can use this method.</div>';return}
    body.innerHTML=`<div class="payCard" style="border:1px solid #dbe6f8">
      <span class="payuBadge">🏦 ICICI Bank • Direct to DBest</span>
      <h3 style="margin:10px 0 4px">Pay ${money(tx.amount)}</h3>
      <div class="txDetailGrid">
        <div class="txDetailCell"><small>Payee</small><b>${esc(c.payeeName||c.companyName||'DBest')}</b></div>
        ${c.upiId?`<div class="txDetailCell"><small>UPI ID</small><b>${esc(c.upiId)}</b></div>`:''}
        ${c.mobile?`<div class="txDetailCell"><small>UPI / Mobile</small><b>${esc(c.mobile)}</b></div>`:''}
        <div class="txDetailCell"><small>DBest Reference</small><b>${esc(tx.id)}</b></div>
      </div>
      ${c.qrUrl?`<div style="text-align:center;margin:12px 0"><img src="${esc(c.qrUrl)}" alt="DBest ICICI payment QR" style="max-width:220px;max-height:220px;object-fit:contain;border:1px solid #e3e8f1;border-radius:14px;padding:8px;background:#fff"></div>`:''}
      <div class="notice" style="margin:10px 0">Pay the exact amount. After payment, enter the bank/UPI reference or UTR below. DBest will mark the transaction paid only after verification.</div>
      <form class="form" onsubmit="submitICICIDirectClaim(event,'${esc(tx.id)}')">
        <div class="f"><label>UTR / UPI Reference Number</label><input name="utr" minlength="6" maxlength="60" autocomplete="off" required placeholder="Enter payment reference"></div>
        <div class="f"><label>Note (optional)</label><input name="note" maxlength="500" placeholder="e.g. paid from company/personal UPI"></div>
        <div class="f full"><button class="btn">Submit Payment for Verification</button></div>
      </form>
    </div>`;
  }catch(e){body.innerHTML='<div class="notice">Could not load ICICI payment details: '+esc(e.message||e)+'</div>'}
};
window.openPayUPaymentChoice=function(txId){
  const body=document.getElementById('dbestPayChoiceBody_'+safeId(txId));if(!body)return;
  if(!payuReady()){
    body.innerHTML='<div class="notice"><b>PayU remains available as the second payment option.</b><br>The current configuration is not yet in live mode, so DBest will not present it as a live payment channel until the production PayU setup is completed.</div>';
    return;
  }
  body.innerHTML='<div class="notice">Opening secure PayU payment…</div>';
  setTimeout(()=>{try{startPayU(txId)}catch(e){notify('PayU could not be opened: '+(e.message||e))}},80);
};
window.submitICICIDirectClaim=async function(e,txId){
  e.preventDefault();const tx=txById(txId);if(!tx)return notify('Transaction not found.');
  const f=new FormData(e.target),utr=String(f.get('utr')||'').trim().toUpperCase(),note=String(f.get('note')||'').trim();
  if(!/^[A-Z0-9-]{6,60}$/.test(utr))return notify('Enter a valid UTR / UPI reference number.');
  const token=memberToken();if(!token)return notify('Please login again before submitting payment verification.');
  const btn=e.target.querySelector('button');if(btn){btn.disabled=true;btn.textContent='Submitting…'}
  try{
    if(window.DBEST_TRANSACTION_LEDGER?.record)await window.DBEST_TRANSACTION_LEDGER.record(tx);
    const d=await post({action:'claim',transactionId:tx.id,utr,note},{'x-dbest-member-token':token});
    tx.paymentMode='ICICI Direct UPI';tx.paymentStage='Verification Pending';tx.paymentRef=utr;tx.status='ICICI Payment Submitted / Verification Pending';tx.iciciClaimId=d.claim?.claim_id||'';
    tx.meta={...(tx.meta||{}),paymentMethod:'icici_direct',paymentStage:'Verification Pending',iciciClaimId:tx.iciciClaimId};
    try{if(typeof save==='function')save()}catch(_e){}
    try{await window.DBEST_TRANSACTION_LEDGER?.record?.(tx)}catch(_e){}
    notify('ICICI payment reference submitted. DBest verification is pending.');
    if(typeof txDetailsView==='function')setTimeout(()=>txDetailsView(tx.id),120);
  }catch(err){
    const m=String(err.message||err);notify(m==='utr_already_used'?'This UTR/reference is already linked to another DBest transaction.':'Payment reference could not be submitted: '+m);
    if(btn){btn.disabled=false;btn.textContent='Submit Payment for Verification'}
  }
};
function wrap(name){
  const fn=window[name];if(typeof fn!=='function'||fn.__dbestDualPayWrapped)return;
  const w=function(){const txId=arguments[0],out=fn.apply(this,arguments);setTimeout(()=>decorate(txId),70);return out};
  w.__dbestDualPayWrapped=true;w.__dbestOriginal=fn;window[name]=w;
}
['paymentReview','ridePaymentScreen','groceryPaymentScreen','marketPaymentScreen'].forEach(wrap);

let ownerClaims=[];
async function loadClaims(){const token=ownerToken();if(!token)throw new Error('Owner security session expired. Please login again.');const d=await post({action:'list'},{'x-dbest-owner-token':token});ownerClaims=Array.isArray(d.claims)?d.claims:[];return ownerClaims}
window.openICICIPaymentClaims=async function(){
  if(typeof session!=='undefined'&&session.role!=='owner')return typeof ownerLogin==='function'?ownerLogin():null;
  try{await loadClaims()}catch(e){return notify(e.message)}
  const pending=ownerClaims.filter(x=>x.status==='Pending Verification').length,verified=ownerClaims.filter(x=>x.status==='Verified').length,rejected=ownerClaims.filter(x=>x.status==='Rejected').length;
  const rows=ownerClaims.map((r,i)=>`<div class="ownerQueueRow" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><b>${esc(r.transaction_id)}</b><small style="display:block">Claim ${esc(r.claim_id)} • ${new Date(r.created_at).toLocaleString('en-IN')}</small></div><span class="approvalPill ${r.status==='Verified'?'approvalApproved':r.status==='Rejected'?'approvalRejected':'approvalPending'}">${esc(r.status)}</span></div><div class="revenueGrid" style="margin-top:8px"><div class="revenueCell"><small>Member</small><b>${esc(r.member_id)}</b></div><div class="revenueCell"><small>Amount</small><b>${money(r.amount)}</b></div><div class="revenueCell"><small>UTR / Ref</small><b>${esc(r.utr)}</b></div></div><div class="serviceFormGrid" style="margin-top:8px"><div class="sf full"><label>Owner Note</label><input id="iciciClaimNote_${i}" value="${esc(r.owner_note||'')}"></div><div class="sf full">${r.status==='Pending Verification'?`<button class="mini" onclick="updateICICIClaim(${i},'Verified')">✓ Verify Payment</button> <button class="mini" onclick="updateICICIClaim(${i},'Rejected')">✕ Reject</button>`:''} <button class="mini" onclick="txDetailsView('${esc(r.transaction_id)}')">Open Transaction</button></div></div></div>`).join('')||'<div class="notice">No ICICI direct payment claims yet.</div>';
  if(typeof sectionScreen!=='function')return;
  sectionScreen(`${typeof sectionTopBar==='function'?sectionTopBar('🏦 ICICI Direct Payment Claims','UTR verification • central transaction status','ownerOperations()'):''}<div class="sectionContent owner55"><div class="owner55Summary"><div class="owner55Stat"><small>Pending</small><b>${pending}</b></div><div class="owner55Stat"><small>Verified</small><b>${verified}</b></div><div class="owner55Stat"><small>Rejected</small><b>${rejected}</b></div></div><div class="notice" style="margin:12px 0">Verify the UTR/reference against the ICICI company account before approving. Approval updates the central DBest transaction and linked manual service request.</div><div class="ownerQueue">${rows}</div></div>`);
};
window.updateICICIClaim=async function(idx,status){const r=ownerClaims[idx];if(!r)return;const token=ownerToken(),note=document.getElementById('iciciClaimNote_'+idx)?.value||'';try{await post({action:'update',transactionId:r.transaction_id,status,ownerNote:note},{'x-dbest-owner-token':token});notify(status==='Verified'?'ICICI payment verified.':'ICICI payment claim rejected.');openICICIPaymentClaims()}catch(e){notify('Could not update payment claim: '+e.message)}};
function injectOwnerButton(){
  try{
    if(typeof session==='undefined'||session.role!=='owner'||document.getElementById('dbestICICIClaimsBtn'))return;
    const title=document.querySelector('.sectionTitle b')?.textContent||'';if(!/Owner Operations|Project Owner|Payment/i.test(title))return;
    const grids=[...document.querySelectorAll('.owner55Grid')],grid=grids[grids.length-1];if(!grid)return;
    const b=document.createElement('button');b.id='dbestICICIClaimsBtn';b.className='owner55Action';b.onclick=()=>openICICIPaymentClaims();b.innerHTML='<span>🏦</span><b>ICICI Payment Claims</b><small>Verify UTR/reference for direct company-account payments.</small>';grid.appendChild(b);
  }catch(e){}
}
new MutationObserver(()=>{['paymentReview','ridePaymentScreen','groceryPaymentScreen','marketPaymentScreen'].forEach(wrap);injectOwnerButton()}).observe(document.documentElement,{childList:true,subtree:true});
setInterval(()=>{['paymentReview','ridePaymentScreen','groceryPaymentScreen','marketPaymentScreen'].forEach(wrap);injectOwnerButton()},1800);
window.DBEST_DUAL_PAYMENT_OPTIONS={version:VERSION,decorate,getPublicConfig,openClaims:()=>openICICIPaymentClaims()};
})();