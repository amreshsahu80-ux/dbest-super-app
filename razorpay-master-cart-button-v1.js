(()=>{
'use strict';
const VERSION='1.0-master-cart-direct-checkout';
function findButton(el){const b=el?.closest?.('button');if(!b)return null;const oc=String(b.getAttribute('onclick')||'');if(/DBEST_MASTER_MARKET\.checkout\s*\(\s*\)/.test(oc))return b;return null}
function openRazorpayCheckout(){
  const api=window.DBEST_MASTER_RAZORPAY;
  if(api&&typeof api.checkout==='function')return api.checkout();
  const m=window.DBEST_MASTER_MARKET;
  if(m&&typeof m.checkout==='function'&&m.__razorpayMasterVersion)return m.checkout();
  try{typeof toast==='function'?toast('Secure checkout is still loading. Please tap Checkout again in a moment.'):alert('Secure checkout is still loading. Please retry.')}catch(_){ }
}
document.addEventListener('click',e=>{const b=findButton(e.target);if(!b)return;e.preventDefault();e.stopImmediatePropagation();openRazorpayCheckout()},true);
function patch(){document.querySelectorAll('button[onclick*="DBEST_MASTER_MARKET.checkout"]').forEach(b=>{b.dataset.dbestMasterDirect='1';b.setAttribute('aria-label','Open secure Razorpay checkout')})}
new MutationObserver(patch).observe(document.documentElement,{childList:true,subtree:true});setInterval(patch,900);patch();
window.DBEST_MASTER_CART_BUTTON={version:VERSION,open:openRazorpayCheckout,patch};
})();