(function(){
'use strict';
const TARGET='/preview-marketplace-razorpay-checkout.html';
function go(e){
  try{e&&e.preventDefault&&e.preventDefault();e&&e.stopPropagation&&e.stopPropagation()}catch(_){ }
  location.href=TARGET;
  return false;
}
function patch(){
  try{
    if(window.DBEST_MASTER_MARKET){
      window.DBEST_MASTER_MARKET.secureCheckout=go;
      window.DBEST_MASTER_MARKET.checkout=go;
    }
    window.DBEST_PREVIEW_OPEN_RAZORPAY=go;
    if(typeof window.marketCheckout==='function'&&!window.marketCheckout.__dbestStandalone){
      const f=go;f.__dbestStandalone=true;window.marketCheckout=f;
    }
  }catch(_){ }
}
[0,150,400,900,1800,3500,7000].forEach(ms=>setTimeout(patch,ms));
new MutationObserver(()=>{clearTimeout(window.__dbestStandalonePatch);window.__dbestStandalonePatch=setTimeout(patch,50)}).observe(document.documentElement,{childList:true,subtree:true});
window.DBEST_MARKETPLACE_STANDALONE_CHECKOUT={version:'1.0',go,target:TARGET};
})();
