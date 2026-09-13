(function(){
'use strict';
const ALLOWED=new Set(['grocery','restaurant','medicine']);
let installing=false;
function say(m){try{typeof toast==='function'?toast(m):alert(m)}catch(_){alert(m)}}
function tok(){try{return window.DBEST_MEMBER_LIVE?.getToken?.()||localStorage.getItem('dbest_member_live_token')||''}catch(_){return''}}
function rows(type){try{return (marketCart(type)||[]).filter(r=>Number(r.qty)>0)}catch(_){return[]}}
function total(type){try{return Number(marketTotals(type)?.total||0)}catch(_){return 0}}
function inferType(){
  const explicit=String(document.querySelector('.sectionContent.shopPage')?.innerText||document.body?.innerText||'').toLowerCase();
  if(/restaurants?\s*&?\s*food/.test(explicit))return'restaurant';
  if(/medicine|pharmacy/.test(explicit))return'medicine';
  if(/\bgrocery\b/.test(explicit))return'grocery';
  if(/\bdigital\b/.test(explicit))return'digital';
  const types=['grocery','restaurant','medicine','digital'];
  const active=types.filter(t=>rows(t).length);
  if(active.length===1)return active[0];
  const m=explicit.match(/(?:order total|total)\s*₹\s*([0-9,]+(?:\.\d{1,2})?)/i),shown=m?Number(m[1].replace(/,/g,'')):NaN;
  if(Number.isFinite(shown)){
    const hit=active.filter(t=>Math.abs(total(t)-shown)<0.01);
    if(hit.length===1)return hit[0];
  }
  return active[0]||'restaurant';
}
function loc(){try{return commerceLocation&&typeof commerceLocation==='object'?commerceLocation:{}}catch(_){return{}}}
async function post(body){
  const token=tok();if(!token)throw new Error('Secure member session is required. Please login again.');
  const r=await fetch('/api/marketplace/pay-at-delivery-order',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','x-dbest-member-token':token},body:JSON.stringify(body)});
  const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(d.detail||d.error||'Could not save pay-at-delivery order.');return d;
}
async function secureConfirm(e){
  e?.preventDefault?.();e?.stopPropagation?.();
  const form=e?.target instanceof HTMLFormElement?e.target:e?.currentTarget;
  const type=inferType();
  if(!ALLOWED.has(type)){say('Pay Online at Delivery is available only for Grocery, Restaurant/Food and Medicines/Pharmacy. Please use Pay Now for this category.');return false;}
  const cart=rows(type);if(!cart.length){say('Cart is empty.');return false;}
  const f=new FormData(form),address=String(f.get('address')||'').trim(),pin=String(f.get('pin')||'').trim(),slot=String(f.get('slot')||'As Soon As Possible').trim();
  if(address.length<4||pin.length<4){say('Complete delivery address and PIN code.');return false;}
  const t=marketTotals(type),items=cart.map(r=>{const p=marketProduct(r.id);return{id:r.id,qty:Number(r.qty)||1,name:p?.name||r.id,price:Number(p?.price||0),vendorId:p?.vendorId||''}});
  const btn=form?.querySelector('button.btn');const old=btn?.textContent||'Confirm Order';if(btn){btn.disabled=true;btn.textContent='Confirming securely…'}
  try{
    const d=await post({marketType:type,items,address,pin,slot,liveLocation:loc(),deliveryFee:Number(t.delivery||0),taxAmount:Number(t.tax||0)});
    const order=d.order||{},amount=Number(order.total_amount||t.total||0),x=addTx(session.id,`Marketplace - ${marketTitle(type)}`,`${marketTitle(type)} Order`,amount,'Order Confirmed / Payment Due at Delivery','',{source:'DBest Multi-Vendor Marketplace',flow:'marketplace',marketType:type,paymentStage:'Payment Due at Delivery',masterOrderId:order.id||'',centralOrderPersisted:true,order:{type,items,subtotal:Number(t.subtotal||0),delivery:Number(t.delivery||0),tax:Number(t.tax||0),total:amount,address,pin,slot,paymentMethod:'pay_at_delivery_online',paymentStatus:'pending',stage:1,masterOrderId:order.id||'',liveLocation:loc()}});
    x.order=x.meta.order;x.paymentStage='Payment Due at Delivery';x.meta.masterOrderId=order.id||'';x.meta.marketplaceMasterOrderId=order.id||'';x.meta.paymentStatus='pending';x.paymentMethod='Online Payment at Delivery';
    try{commerceCarts[type]=[]}catch(_){}try{save()}catch(_){}
    if(typeof window.DBEST_PAY_AT_DELIVERY?.success==='function')window.DBEST_PAY_AT_DELIVERY.success(x.id,amount);else say('Order confirmed. Payment is due online at delivery.');
  }catch(err){console.error('[DBest PAD hardening]',err);say(String(err?.message||'Order could not be confirmed. Please try again.'))}
  finally{if(btn){btn.disabled=false;btn.textContent=old}}
  return false;
}
function patch(){
  if(installing)return;const api=window.DBEST_PAY_AT_DELIVERY;if(!api||api.__dbestHardened)return;installing=true;
  try{
    const oldForm=api.form;
    api.form=function(e){const type=inferType();sessionStorage.setItem('dbest_pad_market_type',type);if(!ALLOWED.has(type)){e?.preventDefault?.();say('Pay Online at Delivery is available only for Grocery, Restaurant/Food and Medicines/Pharmacy. Please use Pay Now.');return false;}return oldForm.apply(this,arguments)};
    api.confirm=secureConfirm;api.__dbestHardened=true;
  }finally{installing=false}
}
function guardUi(){
  patch();const type=inferType();if(ALLOWED.has(type))return;
  document.querySelectorAll('button').forEach(b=>{if(/Pay Online at Delivery/i.test(String(b.textContent||''))){b.style.display='none';b.disabled=true}});
}
[100,300,700,1400,3000].forEach(ms=>setTimeout(guardUi,ms));
new MutationObserver(()=>setTimeout(guardUi,20)).observe(document.documentElement,{childList:true,subtree:true});
window.DBEST_PAD_HARDENING={version:'1.0.0',allowed:[...ALLOWED],inferType,secureConfirm};
})();