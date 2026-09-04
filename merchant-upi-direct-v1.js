(function(){
'use strict';
const VERSION='1.3.0';
const VPA='7004630311@icici';
const LONG_ALIAS='sarwashresthservicesopcprivatelimited.ibz@icici';
const DISPLAY_PAYEE='MS SARWASHRESTH SERVICES PRIVATE LIMITED';

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function amountNumber(v){const n=Number(v||0);return Number.isFinite(n)&&n>0?n:0}
function enc(v){return encodeURIComponent(String(v??'')).replace(/%20/g,'%20')}
function merchantUri(amount,note){
  const parts=['pa='+enc(VPA),'pn='+enc(DISPLAY_PAYEE)];
  const a=amountNumber(amount);if(a>0)parts.push('am='+enc(a.toFixed(2)));
  parts.push('cu=INR');
  if(note)parts.push('tn='+enc(String(note).slice(0,60)));
  return 'upi://pay?'+parts.join('&');
}
function hideSpinner(){const x=document.getElementById('dbestSpinnerLayer');if(x){x.style.display='none';x.style.pointerEvents='none';}}
function markHandoff(){try{sessionStorage.setItem('dbest_external_handoff_until',String(Date.now()+10*60*1000))}catch(e){}hideSpinner()}
function launch(amount,note){markHandoff();window.location.assign(merchantUri(amount,note))}
function txById(id){try{return (typeof txs!=='undefined'&&Array.isArray(txs)?txs:[]).find(x=>String(x.id||'')===String(id||''))||null}catch(e){return null}}
function safeId(id){return String(id||'').replace(/[^A-Za-z0-9_-]/g,'_')}
function amountFor(x){return amountNumber(x?.amount||x?.meta?.amount||x?.order?.total||x?.meta?.order?.total)}

function forceMerchantConfig(){
  try{if(typeof paymentSettings!=='undefined'&&paymentSettings){
    const changed=String(paymentSettings.upiId||'')!==VPA||String(paymentSettings.payeeName||'')!==DISPLAY_PAYEE||String(paymentSettings.mobile||'')!=='';
    paymentSettings.upiId=VPA;paymentSettings.payeeName=DISPLAY_PAYEE;paymentSettings.mobile='';
    paymentSettings.instructions='Pay through standard UPI to the DBest UPI ID. After payment, enter the UTR / UPI reference for verification.';
    if(changed)localStorage.setItem('d2_payment_settings',JSON.stringify(paymentSettings));
  }}catch(e){}
}
window.dbestStartMembershipUPI=function(tier,amount,name){
  const amt=amountNumber(amount)||amountNumber(document.querySelector('.registrationPage input[name="paidAmount"]')?.value);
  if(!(amt>0))return alert('Membership amount could not be loaded. Please reopen the registration screen.');
  if(window.DBEST_ICICI_MERCHANT_QR?.launch)return window.DBEST_ICICI_MERCHANT_QR.launch(amt,'DBest Membership');
  return launch(amt,'DBest Membership');
};
window.DBEST_DIRECT_UPI={
  version:VERSION,upiId:VPA,buildUri:(amount,note)=>merchantUri(amount,note),
  pay:function(txId){const x=txById(txId);if(!x)return false;const a=amountFor(x);if(!(a>0))return false;
    try{sessionStorage.setItem('dbest_pending_upi_tx',JSON.stringify({txId:x.id,amount:a,at:Date.now()}))}catch(e){}
    if(window.DBEST_ICICI_MERCHANT_QR?.launch){window.DBEST_ICICI_MERCHANT_QR.launch(a,'DBest '+String(x.sub||x.section||'Payment'));return true;}
    launch(a,'DBest '+String(x.sub||x.section||'Payment'));return true;},
  copy:function(){navigator.clipboard?.writeText(VPA)}
};
function hidePayU(root=document){root.querySelectorAll('.dbestDualPayCard').forEach(card=>{card.querySelectorAll('button').forEach(b=>{const s=String(b.getAttribute('onclick')||'')+' '+String(b.textContent||'');if(/openPayUPaymentChoice|PayU/i.test(s))b.style.display='none';if(/openICICIDirectPayment/i.test(s)){b.textContent='📲 Pay via UPI';b.style.display='block';b.style.width='100%';}});});}
window.openICICIDirectPayment=function(txId){
  const tx=txById(txId),host=document.getElementById('dbestPayChoiceBody_'+safeId(txId));if(!tx||!host)return;
  const amount=amountFor(tx);const href=merchantUri(amount,'DBest '+String(tx.section||'Payment'));
  host.innerHTML=`<div class="payCard" style="border:1px solid #dbe6f8">
    <span class="payuBadge">📲 UPI • Direct to DBest</span><h3 style="margin:10px 0 4px">Pay ₹${Number(amount||0).toLocaleString('en-IN')}</h3>
    <div class="txDetailGrid"><div class="txDetailCell"><small>Payee</small><b>${esc(DISPLAY_PAYEE)}</b></div><div class="txDetailCell"><small>UPI ID</small><b>${esc(VPA)}</b></div><div class="txDetailCell"><small>DBest Reference</small><b>${esc(tx.id)}</b></div></div>
    <div style="margin:12px 0"><a class="btn" style="display:block;text-align:center;text-decoration:none" href="${esc(href)}">📲 Open UPI App & Pay</a></div>
    <div class="notice" style="margin:10px 0">This uses a standard UPI-ID payment. After payment, return here and enter the UTR / UPI reference for verification.</div>
    <form class="form" onsubmit="submitICICIDirectClaim(event,'${esc(tx.id)}')"><div class="f"><label>UTR / UPI Reference Number</label><input name="utr" minlength="6" maxlength="60" required placeholder="Enter payment reference"></div><div class="f full"><button class="btn">Submit Payment for Verification</button></div></form>
  </div>`;
};
function patchAlias(root=document){root.querySelectorAll('.registrationPage,.paymentPage,.dbestInternalUpiBox,.dbestDualPayCard').forEach(box=>{box.querySelectorAll('*').forEach(el=>{if(el.children.length===0&&String(el.textContent||'').includes(LONG_ALIAS))el.textContent=String(el.textContent).replaceAll(LONG_ALIAS,VPA);});});}
let scheduled=false;function run(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;forceMerchantConfig();hidePayU();patchAlias();try{window.DBEST_ICICI_MERCHANT_QR?.wireRegistration?.()}catch(e){}});}
new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});setTimeout(run,20);window.addEventListener('pageshow',run);
window.DBEST_COMPANY_UPI={version:VERSION,upiId:VPA,payeeName:DISPLAY_PAYEE,merchantUri,launch};
})();