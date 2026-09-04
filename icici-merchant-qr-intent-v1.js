(function(){
'use strict';
const VERSION='1.0.0';
const VPA='7004630311@icici';
const QR_PAYEE='MSSARWASHRESTHSERVICESPRIVATELIMITED';
const DISPLAY_PAYEE='Sarwashresth Services OPC Pvt. Ltd.';
const MERCHANT_REF='EZYS7004630311';
const MCC='1520';

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function amountNumber(v){const n=Number(v||0);return Number.isFinite(n)&&n>0?n:0}
function buildUri(amount,note,dbestRef){
  const q=new URLSearchParams();
  q.set('pa',VPA);
  q.set('pn',QR_PAYEE);
  q.set('tr',MERCHANT_REF);
  q.set('cu','INR');
  q.set('mc',MCC);
  const a=amountNumber(amount);if(a>0)q.set('am',a.toFixed(2));
  const tn=[String(note||'DBest Payment'),dbestRef?('DBest Ref '+String(dbestRef)):''].filter(Boolean).join(' | ').slice(0,80);
  if(tn)q.set('tn',tn);
  return 'upi://pay?'+q.toString();
}
function launch(amount,note,dbestRef){location.href=buildUri(amount,note,dbestRef)}
function registrationAmount(){
  const x=document.querySelector('.registrationPage input[name="paidAmount"]');
  const n=amountNumber(x?.value);if(n)return n;
  const t=String(document.querySelector('.registrationPage')?.textContent||'');
  const m=t.match(/(?:Membership Fee|Pay)\s*₹\s*([0-9,]+)/i);return m?amountNumber(m[1].replace(/,/g,'')):0;
}
function txById(id){try{return (typeof txs!=='undefined'&&Array.isArray(txs)?txs:[]).find(x=>String(x.id||'')===String(id||''))||null}catch(e){return null}}
function safeId(id){return String(id||'').replace(/[^A-Za-z0-9_-]/g,'_')}

// The merchant script periodically rewires its membership handler. Capture the click first,
// so the ICICI QR-compatible URI always wins regardless of legacy handlers or restored screens.
document.addEventListener('click',function(e){
  const b=e.target.closest?.('#dbestRegistrationUPILaunch,.dbestUpiBtn');
  if(!b||!b.closest('.registrationPage'))return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  const a=registrationAmount();
  if(!(a>0)){alert('Membership amount could not be loaded. Please reopen the registration screen.');return;}
  try{sessionStorage.setItem('dbest_external_handoff_until',String(Date.now()+10*60*1000))}catch(err){}
  launch(a,'DBest Membership','MEM-'+Date.now().toString().slice(-10));
},true);

// Replace the internal DBest direct-payment screen with the same ICICI merchant QR semantics.
window.openICICIDirectPayment=function(txId){
  const tx=txById(txId),host=document.getElementById('dbestPayChoiceBody_'+safeId(txId));
  if(!tx||!host)return;
  const amount=amountNumber(tx.amount||tx.meta?.amount||tx.order?.total||tx.meta?.order?.total);
  const href=buildUri(amount,'DBest '+String(tx.section||tx.sub||'Payment'),tx.id);
  host.innerHTML=`<div class="payCard" style="border:1px solid #dbe6f8">
    <span class="payuBadge">📲 ICICI Merchant UPI • Direct to DBest</span>
    <h3 style="margin:10px 0 4px">Pay ₹${Number(amount||0).toLocaleString('en-IN')}</h3>
    <div class="txDetailGrid">
      <div class="txDetailCell"><small>Payee</small><b>${esc(DISPLAY_PAYEE)}</b></div>
      <div class="txDetailCell"><small>Merchant UPI ID</small><b>${esc(VPA)}</b></div>
      <div class="txDetailCell"><small>DBest Reference</small><b>${esc(tx.id)}</b></div>
    </div>
    <div style="margin:12px 0"><a class="btn dbestICICIMerchantPay" style="display:block;text-align:center;text-decoration:none" href="${esc(href)}">📲 Open UPI App & Pay</a></div>
    <div class="notice" style="margin:10px 0">This payment link mirrors your ICICI merchant QR. After successful payment, return here and enter the UTR / UPI reference for verification.</div>
    <form class="form" onsubmit="submitICICIDirectClaim(event,'${esc(tx.id)}')">
      <div class="f"><label>UTR / UPI Reference Number</label><input name="utr" minlength="6" maxlength="60" autocomplete="off" required placeholder="Enter payment reference"></div>
      <div class="f"><label>Note (optional)</label><input name="note" maxlength="500" placeholder="Paid via ICICI Merchant UPI"></div>
      <div class="f full"><button class="btn">Submit Payment for Verification</button></div>
    </form>
  </div>`;
};

// Keep the visible registration/company payment identity aligned with the QR.
function patchVisible(){
  document.querySelectorAll('.registrationPage,.paymentPage,.dbestDualPayCard').forEach(root=>{
    root.querySelectorAll('*').forEach(el=>{
      if(el.children.length===0){
        const s=String(el.textContent||'');
        if(s.includes('sarwashresthservicesopcprivatelimited.ibz@icici'))el.textContent=s.replaceAll('sarwashresthservicesopcprivatelimited.ibz@icici',VPA);
      }
    });
  });
}
new MutationObserver(patchVisible).observe(document.documentElement,{childList:true,subtree:true});
setTimeout(patchVisible,40);

window.DBEST_ICICI_MERCHANT_QR={version:VERSION,vpa:VPA,payee:QR_PAYEE,merchantReference:MERCHANT_REF,mcc:MCC,buildUri,launch};
})();