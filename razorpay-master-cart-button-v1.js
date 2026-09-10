(()=>{
'use strict';
const VERSION='1.2-master-cart-secure-session-direct';
const ORIGINAL=/DBEST_MASTER_MARKET\.checkout\s*\(\s*\)/;
function secureToken(){try{return String(window.DBEST_MEMBER_LIVE?.getToken?.()||'')}catch(_){return''}}
function ready(){return !!(window.DBEST_MASTER_RAZORPAY&&typeof window.DBEST_MASTER_RAZORPAY.checkout==='function')}
function notice(msg){try{typeof toast==='function'?toast(msg):alert(msg)}catch(_){}}
function invoke(){
  if(!ready())return false;
  const hasSecure=!!secureToken();
  const old=window.requireMember;
  try{
    if(hasSecure&&typeof old==='function')window.requireMember=()=>true;
    return window.DBEST_MASTER_RAZORPAY.checkout();
  }catch(err){
    console.error('[DBEST Master Checkout]',err);
    notice('Checkout error: '+String(err?.message||err));
    return false;
  }finally{
    if(hasSecure&&typeof old==='function')window.requireMember=old;
  }
}
function open(e){
  e?.preventDefault?.();
  e?.stopImmediatePropagation?.();
  if(ready()){
    invoke();
    return false;
  }
  notice('Secure Razorpay checkout is loading…');
  let n=0;
  const t=setInterval(()=>{
    n++;
    if(ready()){
      clearInterval(t);
      invoke();
    }else if(n>=30){
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