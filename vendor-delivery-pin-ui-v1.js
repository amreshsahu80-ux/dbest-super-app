(function(){
'use strict';
const VERSION='1.0.0';
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=String(cfg.supabasePublishableKey||''),API=BASE+'/functions/v1/marketplace-delivery-pin-live',TK='dbest_vendor_live_token';
const token=()=>{try{return localStorage.getItem(TK)||''}catch(_){return''}};
async function pickupPin(orderId){const t=token();if(!t||!BASE||!KEY)return null;const h={apikey:KEY,'Content-Type':'application/json','x-vendor-token':t};if(KEY.startsWith('eyJ'))h.Authorization='Bearer '+KEY;const r=await fetch(API,{method:'POST',cache:'no-store',headers:h,body:JSON.stringify({action:'vendor_pickup_pin',orderId})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'pickup_pin_unavailable');return d}
function orderId(card){const t=String(card.querySelector('.orderId')?.textContent||'').trim();const m=t.match(/(MKO[0-9A-Za-z_-]+)/);return m?m[1]:''}
async function decorate(card){if(card.dataset.dbestPickupPin==='1')return;const id=orderId(card),vh=card.querySelector('.vaahakInfo');if(!id||!vh||!/Assigned/i.test(vh.textContent||''))return;card.dataset.dbestPickupPin='1';try{const d=await pickupPin(id);if(!d)return;const box=document.createElement('div');box.className='vaahakInfo';box.style.cssText='margin-top:9px;border:1px solid #a9c4ff;background:#eef4ff;color:#173b78;padding:12px;border-radius:13px;font-size:13px';if(d.verified){box.innerHTML='<b>✅ Pickup PIN verified</b><div style="margin-top:4px">Product handover to Vaahak has been authenticated.</div>'}else if(d.available&&d.pickupPin){box.innerHTML='<b>🔐 Pickup PIN: <span style="font-size:22px;letter-spacing:4px">'+String(d.pickupPin).replace(/[^0-9]/g,'')+'</span></b><div style="margin-top:5px">Share this PIN only with the assigned Vaahak after the Vaahak reaches your shop and shows the order.</div>'}else{box.innerHTML='<b>🔐 Pickup PIN</b><div style="margin-top:4px">PIN will appear here after a Vaahak is assigned.</div>'}vh.insertAdjacentElement('afterend',box)}catch(e){delete card.dataset.dbestPickupPin}}
function scan(){document.querySelectorAll('.order').forEach(decorate)}
let tm=null;const kick=()=>{clearTimeout(tm);tm=setTimeout(scan,80)};
[200,600,1200,2500].forEach(x=>setTimeout(scan,x));
new MutationObserver(kick).observe(document.documentElement,{childList:true,subtree:true});
window.DBEST_VENDOR_DELIVERY_PIN_UI={version:VERSION,scan};
})();