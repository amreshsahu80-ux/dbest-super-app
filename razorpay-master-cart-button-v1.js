(()=>{
'use strict';
const VERSION='1.1-master-cart-hard-direct';
const ORIGINAL=/DBEST_MASTER_MARKET\.checkout\s*\(\s*\)/;
function isCartButton(b){
  if(!b||b.tagName!=='BUTTON')return false;
  if(b.dataset.dbestMasterDirect==='1')return true;
  const oc=String(b.getAttribute('onclick')||'');
  return ORIGINAL.test(oc)&&/^\s*Checkout\s*$/i.test(String(b.textContent||''));
}
function ready(){return !!(window.DBEST_MASTER_RAZORPAY&&typeof window.DBEST_MASTER_RAZORPAY.checkout==='function')}
function notice(msg){try{typeof toast==='function'?toast(msg):alert(msg)}catch(_){}}
function open(e){
  e?.preventDefault?.();
  e?.stopImmediatePropagation?.();
  if(ready()){
    window.DBEST_MASTER_RAZORPAY.checkout();
    return false;
  }
  notice('Secure Razorpay checkout is loading…');
  let n=0;
  const t=setInterval(()=>{
    n++;
    if(ready()){
      clearInterval(t);
      window.DBEST_MASTER_RAZORPAY.checkout();
    }else if(n>=20){
      clearInterval(t);
      notice('Secure checkout did not load. Please refresh once.');
    }
  },100);
  return false;
}
function patch(){
  document.querySelectorAll('button').forEach(b=>{
    const oc=String(b.getAttribute('onclick')||'');
    if(!(ORIGINAL.test(oc)&&/^\s*Checkout\s*$/i.test(String(b.textContent||''))))return;
    b.dataset.dbestMasterDirect='1';
    b.setAttribute('aria-label','Open secure Razorpay checkout');
    b.setAttribute('onclick','return DBEST_MASTER_CART_BUTTON.open(event)');
    b.onclick=function(e){return open(e)};
  });
}
function capture(e){
  const b=e.target?.closest?.('button[data-dbest-master-direct="1"]');
  if(!b)return;
  open(e);
}
window.addEventListener('click',capture,true);
window.addEventListener('touchend',capture,true);
new MutationObserver(patch).observe(document.documentElement,{childList:true,subtree:true});
[0,50,150,350,700,1200,2200,4000].forEach(ms=>setTimeout(patch,ms));
setInterval(patch,700);
window.DBEST_MASTER_CART_BUTTON={version:VERSION,open,patch};
})();