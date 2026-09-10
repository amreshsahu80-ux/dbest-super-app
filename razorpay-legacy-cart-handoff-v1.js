(function(){
'use strict';
const VERSION='1.0-legacy-cart-to-master-razorpay';
function rz(){return window.DBEST_MASTER_RAZORPAY&&typeof window.DBEST_MASTER_RAZORPAY.checkout==='function'?window.DBEST_MASTER_RAZORPAY:null}
function wireForm(){
  const form=document.querySelector('.checkoutCard');
  if(!form||!/Primary\s*•\s*Razorpay/i.test(String(form.textContent||'')))return false;
  if(form.dataset.dbestDirectRazorpay==='1')return true;
  form.dataset.dbestDirectRazorpay='1';
  form.removeAttribute('onsubmit');
  form.addEventListener('submit',function(e){e.preventDefault();e.stopImmediatePropagation();const r=rz();if(r&&typeof r.submit==='function')return r.submit(e);},true);
  return true;
}
function go(type){
  const r=rz();
  if(!r){try{typeof toast==='function'&&toast('Secure checkout is loading. Please tap again in a moment.')}catch(_){}return false}
  r.checkout();
  setTimeout(wireForm,0);setTimeout(wireForm,80);setTimeout(wireForm,250);
  return false;
}
function install(){
  const f=window.marketCheckout;
  if(typeof f==='function'&&!f.__dbestRazorpayHandoff){
    const w=function(type){return go(type)};
    w.__dbestRazorpayHandoff=true;
    w.__legacy=f;
    window.marketCheckout=w;
  }
  const proceed=[...document.querySelectorAll('button')].find(b=>/Proceed\s+to\s+Checkout/i.test(String(b.textContent||'')));
  if(proceed){
    const bar=document.getElementById('dbestMarketplaceCartBar');if(bar)bar.remove();
    proceed.dataset.dbestRazorpayProceed='1';
  }
  wireForm();
}
document.addEventListener('click',function(e){
  const b=e.target&&e.target.closest?e.target.closest('button'):null;
  if(!b||!/Proceed\s+to\s+Checkout/i.test(String(b.textContent||'')))return;
  e.preventDefault();e.stopImmediatePropagation();
  const m=String((b.getAttribute('onclick')||'').match(/marketCheckout\('([^']+)'\)/)?.[1]||'');
  go(m);
},true);
let n=0;const t=setInterval(()=>{install();if(++n>240)clearInterval(t)},250);
new MutationObserver(()=>{clearTimeout(window.__dbestLegacyCartRzTimer);window.__dbestLegacyCartRzTimer=setTimeout(install,40)}).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.DBEST_LEGACY_CART_RAZORPAY={version:VERSION,install,go,wireForm};
})();
