(function(){
'use strict';
const VERSION='1.1.0';
const VPA='7004630311@icici';
const QR_PAYEE='MSSARWASHRESTHSERVICESPRIVATELIMITED';
const DISPLAY_PAYEE='Sarwashresth Services OPC Pvt. Ltd.';
const MERCHANT_REF='EZYS7004630311';
const MCC='1520';
const HANDOFF='dbest_external_handoff_until';

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]))}
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
function hideBlockingUi(){
  const spinner=document.getElementById('dbestSpinnerLayer');
  if(spinner){spinner.style.display='none';spinner.style.pointerEvents='none';}
  document.querySelectorAll('.dbestSpinnerLayer').forEach(x=>{x.style.display='none';x.style.pointerEvents='none';});
}
function markHandoff(){try{sessionStorage.setItem(HANDOFF,String(Date.now()+10*60*1000))}catch(e){} hideBlockingUi();}
function launch(amount,note,dbestRef){markHandoff();window.location.assign(buildUri(amount,note,dbestRef))}
function registrationAmount(page=document.querySelector('.registrationPage')){
  if(!page)return 0;
  const x=page.querySelector('input[name="paidAmount"]');
  const n=amountNumber(x?.value);if(n)return n;
  const t=String(page.textContent||'');
  const m=t.match(/(?:Membership Fee|Pay)\s*₹\s*([0-9,]+)/i);return m?amountNumber(m[1].replace(/,/g,'')):0;
}
function registrationHref(page){
  const a=registrationAmount(page);
  if(!(a>0))return '';
  return buildUri(a,'DBest Membership','MEM-'+String(a));
}
function styleAsPayLink(a){
  a.style.textDecoration='none';
  a.style.cursor='pointer';
  a.style.boxSizing='border-box';
  if(a.classList.contains('dbestUpiBtn')){a.style.display='flex';a.style.alignItems='center';a.style.justifyContent='center';}
}
function replaceButtonWithAnchor(btn,href){
  const a=document.createElement('a');
  [...btn.attributes].forEach(at=>{if(!['type','onclick'].includes(at.name.toLowerCase()))a.setAttribute(at.name,at.value)});
  a.className=btn.className;
  a.id=btn.id;
  a.innerHTML=btn.innerHTML;
  a.href=href;
  a.setAttribute('role','button');
  a.dataset.dbestMerchantUpi='1';
  styleAsPayLink(a);
  a.addEventListener('click',markHandoff,{passive:true});
  btn.replaceWith(a);
  return a;
}
function wireRegistration(){
  const page=document.querySelector('.registrationPage');
  if(!page)return;
  hideBlockingUi();
  const href=registrationHref(page);
  if(!href)return;
  page.querySelectorAll('#dbestRegistrationUPILaunch,.dbestUpiBtn').forEach(el=>{
    if(el.tagName==='A'){
      el.href=href;el.removeAttribute('onclick');el.dataset.dbestMerchantUpi='1';styleAsPayLink(el);
      if(el.dataset.dbestHandoffBound!=='1'){el.dataset.dbestHandoffBound='1';el.addEventListener('click',markHandoff,{passive:true});}
    }else replaceButtonWithAnchor(el,href);
  });
  page.querySelectorAll('*').forEach(el=>{
    if(el.children.length===0){const s=String(el.textContent||'');if(s.includes('sarwashresthservicesopcprivatelimited.ibz@icici'))el.textContent=s.replaceAll('sarwashresthservicesopcprivatelimited.ibz@icici',VPA);}
  });
}
function txById(id){try{return (typeof txs!=='undefined'&&Array.isArray(txs)?txs:[]).find(x=>String(x.id||'')===String(id||''))||null}catch(e){return null}}
function safeId(id){return String(id||'').replace(/[^A-Za-z0-9_-]/g,'_')}

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
    <div class="notice" style="margin:10px 0">This payment link mirrors the ICICI merchant QR. After successful payment, return here and enter the UTR / UPI reference for verification.</div>
    <form class="form" onsubmit="submitICICIDirectClaim(event,'${esc(tx.id)}')">
      <div class="f"><label>UTR / UPI Reference Number</label><input name="utr" minlength="6" maxlength="60" autocomplete="off" required placeholder="Enter payment reference"></div>
      <div class="f"><label>Note (optional)</label><input name="note" maxlength="500" placeholder="Paid via ICICI Merchant UPI"></div>
      <div class="f full"><button class="btn">Submit Payment for Verification</button></div>
    </form>
  </div>`;
  host.querySelector('.dbestICICIMerchantPay')?.addEventListener('click',markHandoff,{passive:true});
};

let scheduled=false;
function scheduleWire(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;wireRegistration();});}
const observer=new MutationObserver(scheduleWire);
observer.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('focusin',e=>{if(e.target?.closest?.('.registrationPage'))scheduleWire()},true);
window.addEventListener('pageshow',scheduleWire);
setTimeout(wireRegistration,20);
setTimeout(wireRegistration,250);

window.DBEST_ICICI_MERCHANT_QR={version:VERSION,vpa:VPA,payee:QR_PAYEE,merchantReference:MERCHANT_REF,mcc:MCC,buildUri,launch,wireRegistration};
})();