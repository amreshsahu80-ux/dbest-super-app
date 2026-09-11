(function(){
'use strict';
const VERSION='1.2-legacy-cart-final-authority';
function rz(){return window.DBEST_MASTER_RAZORPAY&&typeof window.DBEST_MASTER_RAZORPAY.checkout==='function'?window.DBEST_MASTER_RAZORPAY:null}
function finalCheckout(){return window.DBEST_FINAL_MARKET_CHECKOUT&&typeof window.DBEST_FINAL_MARKET_CHECKOUT.checkout==='function'?window.DBEST_FINAL_MARKET_CHECKOUT:null}
function wireForm(){
  const form=document.querySelector('.checkoutCard');
  if(!form||!/Primary\s*•\s*Razorpay/i.test(String(form.textContent||'')))return false;
  if(form.dataset.dbestDirectRazorpay==='1')return true;
  form.dataset.dbestDirectRazorpay='1';
  form.removeAttribute('onsubmit');
  form.addEventListener('submit',function(e){e.preventDefault();e.stopImmediatePropagation();const r=rz();if(r&&typeof r.submit==='function')return r.submit(e);},true);
  return true;
}
function go(){
  const f=finalCheckout();
  if(f){
    f.checkout();
    setTimeout(wireForm,0);setTimeout(wireForm,80);setTimeout(wireForm,250);
    return false;
  }
  if(window.DBEST_MASTER_MARKET&&typeof window.DBEST_MASTER_MARKET.secureCheckout==='function'){
    window.DBEST_MASTER_MARKET.secureCheckout();
    setTimeout(wireForm,0);setTimeout(wireForm,80);setTimeout(wireForm,250);
    return false;
  }
  const r=rz();
  if(!r){try{typeof toast==='function'&&toast('Secure checkout is loading. Please tap again in a moment.')}catch(_){}return false}
  const old=window.requireMember;
  try{if(window.DBEST_MEMBER_LIVE?.getToken?.()&&typeof old==='function')window.requireMember=()=>true;r.checkout()}finally{if(window.DBEST_MEMBER_LIVE?.getToken?.()&&typeof old==='function')window.requireMember=old}
  setTimeout(wireForm,0);setTimeout(wireForm,80);setTimeout(wireForm,250);
  return false;
}
function isMasterCartCheckout(b){
  if(!b)return false;
  const text=String(b.textContent||'').trim();
  const oc=String(b.getAttribute('onclick')||'');
  return /^Checkout$/i.test(text)&&/DBEST_MASTER_MARKET\.checkout\(\)/.test(oc);
}
function install(){
  const f=window.marketCheckout;
  if(typeof f==='function'&&!f.__dbestRazorpayHandoff){
    const w=function(){return go()};
    w.__dbestRazorpayHandoff=true;
    w.__legacy=f;
    window.marketCheckout=w;
  }
  const buttons=[...document.querySelectorAll('button')];
  const proceed=buttons.find(b=>/Proceed\s+to\s+Checkout/i.test(String(b.textContent||'')));
  const master=buttons.find(isMasterCartCheckout);
  if(proceed){
    const bar=document.getElementById('dbestMarketplaceCartBar');if(bar)bar.remove();
    proceed.dataset.dbestRazorpayProceed='1';
    proceed.setAttribute('onclick','return DBEST_LEGACY_CART_RAZORPAY.go()');
  }
  if(master)master.dataset.dbestMasterRazorpayCheckout='1';
  wireForm();
}
document.addEventListener('click',function(e){
  const b=e.target&&e.target.closest?e.target.closest('button'):null;
  if(!b)return;
  const legacy=/Proceed\s+to\s+Checkout/i.test(String(b.textContent||''));
  const master=isMasterCartCheckout(b)||b.dataset.dbestMasterRazorpayCheckout==='1';
  if(!legacy&&!master)return;
  e.preventDefault();e.stopImmediatePropagation();
  go();
},true);
let n=0;const t=setInterval(()=>{install();if(++n>240)clearInterval(t)},250);
new MutationObserver(()=>{clearTimeout(window.__dbestLegacyCartRzTimer);window.__dbestLegacyCartRzTimer=setTimeout(install,40)}).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.DBEST_LEGACY_CART_RAZORPAY={version:VERSION,install,go,wireForm};
})();
