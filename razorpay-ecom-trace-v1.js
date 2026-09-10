(()=>{
'use strict';
const seen=new WeakSet();
function mark(stage){try{fetch('/api/razorpay/config?stage='+encodeURIComponent(stage),{cache:'no-store',keepalive:true}).catch(()=>{})}catch{}}
function route(form){const s=String(form?.getAttribute('onsubmit')||'');if(s.includes('placeGroceryOrder'))return'grocery';if(s.includes('placeMarketOrder'))return'market';return''}
function scan(){document.querySelectorAll('form').forEach(form=>{const r=route(form);if(!r||seen.has(form))return;seen.add(form);mark('ecom_form_seen_'+r);});}
mark('ecom_trace_loaded');
document.addEventListener('click',e=>{const btn=e.target?.closest?.('button');const form=btn?.closest?.('form');const r=route(form);if(!r)return;mark('ecom_click_'+r);},true);
document.addEventListener('submit',e=>{const r=route(e.target);if(r)mark('ecom_submit_'+r);},true);
new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
setInterval(scan,1000);scan();
})();