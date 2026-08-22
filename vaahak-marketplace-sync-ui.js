(function(){
'use strict';
const VERSION='1.1.0';
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=cfg.supabasePublishableKey||'',SYNC=BASE+'/functions/v1/marketplace-vaahak-sync',MKT=BASE+'/functions/v1/marketplace-live',TK='dbest_vaahak_live_token';
const assignedSynced=new Set(),arrived=new Set();
function token(){try{return localStorage.getItem(TK)||''}catch(e){return''}}
async function call(url,action,body={}){const h={apikey:KEY,'Content-Type':'application/json','x-vaahak-token':token()};if(String(KEY).startsWith('eyJ'))h.Authorization='Bearer '+KEY;const r=await fetch(url,{method:'POST',cache:'no-store',headers:h,body:JSON.stringify({action,...body})});const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.error||'request_failed');e.data=d;throw e}return d}
function isMarketplaceDelivery(j){return j&&j.kind==='delivery'&&j.order_meta&&j.order_meta.marketplaceOrderId}
async function syncStep(jobId,step){try{return await call(SYNC,'sync',{jobId,step})}catch(e){console.warn('Marketplace Vaahak sync',step,e);return null}}
async function markAssigned(j){if(!isMarketplaceDelivery(j)||assignedSynced.has(j.id)||!j.assigned_partner_id)return;assignedSynced.add(j.id);await syncStep(j.id,'assigned')}
async function markArrived(jobId,btn){if(btn){btn.disabled=true;btn.textContent='Updating…'}try{let d=await syncStep(jobId,'arrived');if(!d)d=await call(MKT,'vaahak_pickup_arrived',{jobId});arrived.add(jobId);if(btn){btn.textContent='✓ Reached Vendor';btn.classList.add('good')}try{typeof note==='function'&&note('Vendor arrival confirmed. The customer and vendor can now see this milestone.')}catch(e){}}catch(e){if(btn){btn.disabled=false;btn.textContent='📍 Reached Vendor — Confirm Arrival'}try{typeof note==='function'&&note('Could not confirm vendor arrival: '+e.message,false)}catch(_){}}}
function decorate(j){if(!isMarketplaceDelivery(j)||j.status!=='Accepted'||!j.assigned_partner_id)return;markAssigned(j);const host=document.getElementById('jobs');if(!host||host.querySelector('[data-dbest-vendor-arrived]'))return;const start=[...host.querySelectorAll('button')].find(b=>/Start Delivery/i.test(String(b.textContent||'')));if(!start)return;const b=document.createElement('button');b.type='button';b.className='btn soft';b.dataset.dbestVendorArrived=j.id;b.style.width='100%';b.style.marginTop='10px';b.textContent=arrived.has(j.id)?'✓ Reached Vendor':'📍 Reached Vendor — Confirm Arrival';if(arrived.has(j.id))b.disabled=true;start.parentNode.insertBefore(b,start);b.onclick=()=>markArrived(j.id,b);const hint=document.createElement('div');hint.className='gps';hint.style.marginTop='7px';hint.textContent='Confirm arrival at the vendor before collecting the package. Start Delivery means the product has been picked up and you are leaving for the customer.';b.insertAdjacentElement('afterend',hint)}
const oldRender=window.renderJob;
if(typeof oldRender==='function')window.renderJob=function(j){const r=oldRender.apply(this,arguments);setTimeout(()=>decorate(j),20);return r};
const oldStart=window.startDelivery;
if(typeof oldStart==='function')window.startDelivery=async function(id){const r=await oldStart.apply(this,arguments);setTimeout(()=>syncStep(id,'picked_up'),150);return r};
const oldPay=window.confirmPayment;
if(typeof oldPay==='function')window.confirmPayment=async function(id,method){const r=await oldPay.apply(this,arguments);setTimeout(()=>syncStep(id,'payment'),150);return r};
const oldComplete=window.completeJob;
if(typeof oldComplete==='function')window.completeJob=async function(id){const r=await oldComplete.apply(this,arguments);setTimeout(()=>syncStep(id,'complete'),180);return r};
window.DBEST_VAAHAK_MARKETPLACE_SYNC={version:VERSION,arrived:markArrived,sync:syncStep};
})();