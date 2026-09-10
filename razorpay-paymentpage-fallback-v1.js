(()=>{
'use strict';
const VERSION='1.0-ecommerce-paymentpage-fallback';
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function txById(id){try{return (Array.isArray(txs)?txs:[]).find(x=>String(x.id||x.transaction_id||'')===String(id||''))||null}catch{return null}}
function classify(tx,root){
  try{if(window.DBEST_PAYMENT_POLICY?.classify&&tx)return window.DBEST_PAYMENT_POLICY.classify(tx)}catch{}
  const text=String(root?.textContent||'').toLowerCase();
  if(/grocery|marketplace|ecommerce|e-commerce|restaurant|digital item|medicine|pharmacy|store/.test(text))return'ecommerce';
  return'other';
}
function payuConfigured(){try{return !!window.DBEST_PAYMENT_POLICY?.checkPayU&&!!document.querySelector('[data-dbest-payu-button]:not([disabled])')}catch{return false}}
function patchButton(btn){
  if(!btn||btn.dataset.dbestPaymentPageFallback===VERSION)return;
  const raw=String(btn.getAttribute('onclick')||'');
  const m=raw.match(/startPayU\(['"]([^'"]+)['"]\)/i);if(!m)return;
  const txId=m[1],root=btn.closest('.paymentPage')||btn.closest('.sectionContent')||btn.parentElement,tx=txById(txId),route=classify(tx,root);
  if(route!=='ecommerce')return;
  btn.dataset.dbestPaymentPageFallback=VERSION;
  btn.type='button';btn.removeAttribute('onclick');btn.textContent='Primary • Razorpay →';
  btn.onclick=()=>{if(typeof window.dbestPolicyRazorpay==='function')return window.dbestPolicyRazorpay(txId);if(typeof window.startRazorpay==='function')return window.startRazorpay(txId);if(window.__DBEST_RAZORPAY__?.payTransaction)return window.__DBEST_RAZORPAY__.payTransaction(txId);if(typeof toast==='function')toast('Razorpay is still loading. Please retry in a moment.');};
  const badge=root?.querySelector('.payuBadge');if(badge)badge.textContent='🔒 Razorpay Secure Payment';
  root?.querySelectorAll('p').forEach(p=>{if(/payu/i.test(p.textContent||''))p.textContent=String(p.textContent||'').replace(/PayU/gi,'Razorpay')});
  if(btn.parentElement&&!btn.parentElement.querySelector('.dbestPayuDeferred')){
    const d=document.createElement('button');d.type='button';d.disabled=true;d.className='btn soft dbestPayuDeferred';d.style.cssText='width:100%;margin-top:8px;opacity:.58';d.textContent='Secondary • PayU • Setup required';btn.insertAdjacentElement('afterend',d);
    const n=document.createElement('div');n.className='notice';n.style.marginTop='8px';n.innerHTML='<b>Razorpay is active for testing.</b><br><small>PayU remains built in and will activate after Merchant Key & Salt are added.</small>';d.insertAdjacentElement('afterend',n);
  }
}
function scan(){document.querySelectorAll('button[onclick*="startPayU"]').forEach(patchButton)}
scan();new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});setInterval(scan,700);window.DBEST_RAZORPAY_PAYMENTPAGE_FALLBACK={version:VERSION,scan};
})();
