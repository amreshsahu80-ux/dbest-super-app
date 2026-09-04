(function(){
'use strict';
const VERSION='1.0.1';
const FALLBACK_VPA='sarwashresthservicesopcprivatelimited.ibz@icici';
const PAYEE='Sarwashresth Services OPC Pvt. Ltd.';
const cfg=window.DBEST_RUNTIME_CONFIG||{};
const BASE=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const KEY=String(cfg.supabasePublishableKey||'');
const ENDPOINT=BASE?BASE+'/functions/v1/direct-payment-live':'';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let cache=null,cacheAt=0;
async function getConfig(){
  if(cache&&Date.now()-cacheAt<60000)return cache;
  if(!ENDPOINT||!KEY){cache={upiId:FALLBACK_VPA,payeeName:PAYEE};return cache;}
  try{
    const r=await fetch(ENDPOINT,{method:'POST',cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify({action:'get_public'})});
    const d=await r.json().catch(()=>({}));
    cache={...(d.config||{}),upiId:String(d.config?.upiId||FALLBACK_VPA),payeeName:String(d.config?.payeeName||PAYEE)};
  }catch(e){cache={upiId:FALLBACK_VPA,payeeName:PAYEE};}
  cacheAt=Date.now();return cache;
}
function upiUrl(c,amount,ref,note){
  const p=new URLSearchParams();
  p.set('pa',String(c.upiId||FALLBACK_VPA));
  p.set('pn',String(c.payeeName||PAYEE));
  const a=Number(amount||0);if(a>0)p.set('am',a.toFixed(2));
  p.set('cu','INR');
  if(ref)p.set('tr',String(ref).slice(0,35));
  if(note)p.set('tn',String(note).slice(0,60));
  return 'upi://pay?'+p.toString();
}
async function launch(amount,ref,note){
  const c=await getConfig();
  location.href=upiUrl(c,amount,ref,note);
}
function txById(id){try{return (Array.isArray(txs)?txs:[]).find(x=>String(x.id||'')===String(id||''))||null}catch(e){return null}}
function safeId(id){return String(id||'').replace(/[^A-Za-z0-9_-]/g,'_')}
function hidePayU(root=document){
  root.querySelectorAll('.dbestDualPayCard').forEach(card=>{
    card.querySelectorAll('button').forEach(b=>{
      const click=String(b.getAttribute('onclick')||''),txt=String(b.textContent||'');
      if(/openPayUPaymentChoice|PayU/i.test(click+' '+txt))b.style.display='none';
      if(/openICICIDirectPayment/i.test(click)){b.textContent='📲 Pay via UPI';b.style.display='block';b.style.width='100%';}
    });
    card.querySelectorAll('div').forEach(d=>{if(getComputedStyle(d).display==='grid'&&d.querySelector('button[onclick*="openICICIDirectPayment"]'))d.style.gridTemplateColumns='1fr';});
    const h=card.querySelector('h3');if(h)h.textContent='Pay DBest via UPI';
    card.querySelectorAll('small').forEach(s=>{if(/PayU/i.test(s.textContent||''))s.style.display='none';});
  });
}
window.openICICIDirectPayment=async function(txId){
  const tx=txById(txId),host=document.getElementById('dbestPayChoiceBody_'+safeId(txId));
  if(!tx||!host)return;
  host.innerHTML='<div class="notice">Loading DBest Merchant UPI…</div>';
  const c=await getConfig();
  const href=upiUrl(c,tx.amount,tx.id,'DBest '+String(tx.section||'Payment'));
  host.innerHTML=`<div class="payCard" style="border:1px solid #dbe6f8">
    <span class="payuBadge">📲 ICICI Merchant UPI • Direct to DBest</span>
    <h3 style="margin:10px 0 4px">Pay ₹${Number(tx.amount||0).toLocaleString('en-IN')}</h3>
    <div class="txDetailGrid">
      <div class="txDetailCell"><small>Payee</small><b>${esc(c.payeeName||PAYEE)}</b></div>
      <div class="txDetailCell"><small>Merchant UPI ID</small><b>${esc(c.upiId||FALLBACK_VPA)}</b></div>
      <div class="txDetailCell"><small>DBest Reference</small><b>${esc(tx.id)}</b></div>
    </div>
    <div style="margin:12px 0"><a class="btn" style="display:block;text-align:center;text-decoration:none" href="${esc(href)}">📲 Open UPI App & Pay</a></div>
    <div class="notice" style="margin:10px 0">Pay the exact amount. After successful payment, return here and enter the UTR / UPI reference. DBest will credit/confirm the payment only after verification.</div>
    <form class="form" onsubmit="submitICICIDirectClaim(event,'${esc(tx.id)}')">
      <div class="f"><label>UTR / UPI Reference Number</label><input name="utr" minlength="6" maxlength="60" autocomplete="off" required placeholder="Enter payment reference"></div>
      <div class="f"><label>Note (optional)</label><input name="note" maxlength="500" placeholder="Paid via UPI"></div>
      <div class="f full"><button class="btn">Submit Payment for Verification</button></div>
    </form>
  </div>`;
};
function registrationAmount(){const i=document.querySelector('.registrationPage input[name="paidAmount"]');return Number(i?.value||0)}
async function enhanceRegistration(){
  const page=document.querySelector('.registrationPage');if(!page)return;
  const form=page.querySelector('.registrationForm');if(!form||document.getElementById('dbestRegistrationMerchantUPI'))return;
  const c=await getConfig();
  const amount=registrationAmount();
  const box=document.createElement('div');box.id='dbestRegistrationMerchantUPI';box.className='notice';box.style.margin='0 0 14px';
  box.innerHTML=`<b>📲 Pay Membership Fee via DBest Merchant UPI</b><br><small>${esc(c.payeeName||PAYEE)}</small><br><b>${esc(c.upiId||FALLBACK_VPA)}</b><div style="margin-top:10px"><button type="button" class="btn" id="dbestRegistrationUPILaunch">Pay ${amount>0?'₹'+amount.toLocaleString('en-IN'):'via UPI'}</button></div><small style="display:block;margin-top:8px">After payment, enter the UTR/reference in the registration form and upload payment proof for verification.</small>`;
  const firstNotice=form.querySelector('.notice');if(firstNotice)firstNotice.insertAdjacentElement('afterend',box);else form.prepend(box);
  document.getElementById('dbestRegistrationUPILaunch').onclick=()=>launch(registrationAmount(),'DBEST-MEMBERSHIP-'+Date.now().toString().slice(-8),'DBest Membership');
}
function patchRegistrationOldVpa(){
  const page=document.querySelector('.registrationPage');if(!page)return;
  const old='7004630311@icici';
  page.querySelectorAll('*').forEach(el=>{
    if(el.children.length===0&&String(el.textContent||'').includes(old))el.textContent=String(el.textContent).replaceAll(old,FALLBACK_VPA);
  });
}
function run(){hidePayU();enhanceRegistration();patchRegistrationOldVpa();}
new MutationObserver(()=>run()).observe(document.documentElement,{childList:true,subtree:true});
setInterval(run,1800);
setTimeout(run,50);
window.DBEST_COMPANY_UPI={version:VERSION,getConfig,launch,upiUrl,fallbackVpa:FALLBACK_VPA};
})();