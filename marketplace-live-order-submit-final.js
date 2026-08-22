(function(){
'use strict';
const VERSION='1.0.0',BUILD='20260823-0430-live-order-submit';
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=cfg.supabasePublishableKey||'';
const API=BASE+'/functions/v1/marketplace-live';
let submitting=false;
const digits=s=>String(s||'').replace(/\D/g,'');
function memberToken(){try{return window.DBEST_MEMBER_LIVE?.getToken?.()||''}catch(e){return''}}
function persist(){try{typeof save==='function'&&save()}catch(e){}}
function say(m){try{typeof toast==='function'?toast(m):alert(m)}catch(e){alert(m)}}
async function api(action,body={}){
  const h={'apikey':KEY,'Content-Type':'application/json'};
  if(String(KEY).startsWith('eyJ'))h.Authorization='Bearer '+KEY;
  const mt=memberToken();if(mt)h['x-dbest-member-token']=mt;
  const r=await fetch(API,{method:'POST',cache:'no-store',headers:h,body:JSON.stringify({action,...body})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(d.error||'marketplace_live_error');e.data=d;e.status=r.status;throw e}
  return d;
}
function txById(id){try{return (txs||[]).find(t=>String(t.id)===String(id))||null}catch(e){return null}}
function orderOf(x){return x?.order||x?.meta?.order||{}}
function localVendor(id){try{return typeof marketVendor==='function'?marketVendor(id):null}catch(e){return null}}
function groupItems(items){const g={};for(const i of (items||[])){const k=String(i.vendorId||'');if(!k)continue;(g[k]||(g[k]=[])).push(i)}return g}
function currentUser(){try{return (typeof me==='function'&&me())||{}}catch(e){return{}}}
async function createLiveOrders(txId){
  const x=txById(txId);if(!x)throw new Error('local_transaction_missing');
  x.meta=x.meta||{};
  if(Array.isArray(x.meta.liveMarketplaceOrders)&&x.meta.liveMarketplaceOrders.some(r=>r.orderId))return x.meta.liveMarketplaceOrders;
  const o=orderOf(x),type=String(o.type||x.meta.marketType||'grocery');if(type==='digital')return[];
  const groups=groupItems(o.items||[]),entries=Object.entries(groups);if(!entries.length)throw new Error('vendor_items_missing');
  const u=currentUser();
  const customerName=String(o.customerName||o.name||u.name||'Customer').trim();
  const customerMobile=digits(o.customerMobile||o.mobile||u.mobile||'');
  const customerEmail=String(o.customerEmail||o.deliveryEmail||u.email||'').trim().toLowerCase();
  const address=String(o.address||o.liveLocation?.label||'').trim();
  if(customerMobile.length<10)throw new Error('customer_mobile_missing');
  if(address.length<4)throw new Error('delivery_address_missing');
  const totalSub=Number(o.subtotal||entries.flatMap(e=>e[1]).reduce((a,i)=>a+Number(i.price||0)*Number(i.qty||0),0))||1;
  const totalTax=Number(o.tax||0),totalDelivery=Number(o.delivery||0),prepaid=String(o.paymentMethod||'').toLowerCase()==='payu';
  x.meta.liveMarketplaceOrders=[];x.status='Creating live Marketplace order…';persist();
  for(const [vendorId,items] of entries){
    const v=localVendor(vendorId),sub=items.reduce((a,i)=>a+Number(i.price||0)*Number(i.qty||0),0),tax=Math.round(totalTax*(sub/totalSub)*100)/100,del=Math.round(totalDelivery/entries.length*100)/100,collect=Math.round((sub+tax+del)*100)/100;
    try{
      const d=await api('create_order',{
        parentTxId:String(x.id),vendorId:String(vendorId),marketType:type,
        customerName,customerMobile,customerEmail,
        deliveryAddress:address,
        dropLat:o.liveLocation?.lat,dropLng:o.liveLocation?.lng,
        items:items.map(i=>({id:String(i.id||''),name:String(i.name||'Item'),qty:Number(i.qty||1),price:Number(i.price||0)})),
        orderValue:sub+tax+del,collectAmount:collect,
        paymentMethod:prepaid?'PayU':'Pay after Delivery',prepaid
      });
      x.meta.liveMarketplaceOrders.push({vendorId:String(vendorId),vendorName:v?.name||String(vendorId),orderId:d.orderId,trackingToken:d.trackingToken||'',vendorNotified:!!d.vendorNotified,emailError:d.emailError||null});
    }catch(e){
      x.meta.liveMarketplaceOrders.push({vendorId:String(vendorId),vendorName:v?.name||String(vendorId),error:e.message,status:e.status||0});
    }
  }
  const failures=x.meta.liveMarketplaceOrders.filter(r=>!r.orderId);
  if(failures.length){x.status='Marketplace live order failed / Retry required';persist();const e=new Error(failures.map(r=>r.vendorName+': '+r.error).join(' • '));e.failures=failures;throw e}
  x.status=x.meta.liveMarketplaceOrders.every(r=>r.vendorNotified)?'Vendor Notified / Awaiting Confirmation':'Order Placed / Vendor Email Pending';
  persist();
  return x.meta.liveMarketplaceOrders;
}

// Explicitly replace the legacy immediate Vaahak-dispatch hook. Marketplace delivery jobs
// are created only after the Vendor marks the live order Ready for Pickup.
const dispatchHook=function(txId){createLiveOrders(txId).catch(e=>console.error('Live Marketplace order creation failed',e));return[]};
try{createVaahakJobsForOrder=dispatchHook}catch(e){}
window.createVaahakJobsForOrder=dispatchHook;

window.placeMarketOrder=async function(e,type){
  e?.preventDefault?.();
  if(submitting)return false;
  try{
    const t=marketTotals(type),min=Number(commerceConfig?.minOrder||0);
    if(type!=='digital'&&min&&Number(t.subtotal||0)<min){window.DBEST_MARKETPLACE_MIN_ORDER_UX?.decorate?.(type,true);say(`Minimum product value is ₹${Math.round(min)}.`);return false}
    const cart=marketCart(type);if(!cart?.length){say('Your cart is empty.');return false}
    const f=new FormData(e.target),payment=String(f.get('payment')||'payu');
    const customerName=String(f.get('name')||'').trim(),customerMobile=digits(f.get('mobile')),customerEmail=String(currentUser().email||f.get('deliveryEmail')||'').trim().toLowerCase();
    if(type!=='digital'&&customerMobile.length<10){say('Enter a valid customer mobile number.');return false}
    let prescription=null;
    if(typeof cartNeedsPrescription==='function'&&cartNeedsPrescription(type)){const file=e.target.elements.prescription?.files?.[0];if(file&&typeof fileRecord==='function')prescription=await fileRecord(file)}
    const items=cart.map(r=>{const p=marketProduct(r.id);return {id:r.id,name:p?.name||r.id,qty:Number(r.qty||1),price:Number(p?.price||0),vendorId:p?.vendorId||'',rx:!!p?.rx}});
    let address=String(f.get('address')||'').trim();if(typeof commerceNeedsLocation==='function'&&commerceNeedsLocation(type)&&!address&&commerceLocation?.label)address=commerceLocation.label;
    submitting=true;
    const x=addTx(session.id,`Marketplace - ${marketTitle(type)}`,`${marketTitle(type)} Order`,t.total,payment==='payu'?'Order Created / Payment Pending':(prescription?'Order Confirmed / Prescription Verification':'Creating Live Order'),'',{
      source:'DBest Multi-Vendor Marketplace',flow:'marketplace',marketType:type,paymentStage:payment==='payu'?'Pending PayU':'Pay after Delivery',
      order:{type,items,subtotal:t.subtotal,delivery:t.delivery,tax:t.tax,total:t.total,address,pin:String(f.get('pin')||''),slot:String(f.get('slot')||''),deliveryEmail:String(f.get('deliveryEmail')||''),paymentMethod:payment,stage:1,liveLocation:commerceLocation?.lat?{...commerceLocation}:null,prescription,customerName,customerMobile,customerEmail}
    });
    x.order=x.meta.order;x.paymentStage=x.meta.paymentStage;persist();
    if(payment==='payu'){submitting=false;return marketPaymentScreen(x.id,type)}
    if(type!=='digital'){
      say('Creating live order and notifying Vendor…');
      const rows=await createLiveOrders(x.id);
      commerceCarts[type]=[];persist();
      const mailed=rows.every(r=>r.vendorNotified);
      say(mailed?'Order placed. Vendor notified by email.':'Order placed. Vendor Portal notified; email delivery is pending.');
      marketOrderStatus(x.id);submitting=false;return true;
    }
    commerceCarts[type]=[];persist();marketOrderStatus(x.id);submitting=false;return true;
  }catch(err){
    console.error('Marketplace live checkout',err);submitting=false;
    say('Order was not submitted. '+String(err.message||err));
    return false;
  }
};
window.DBEST_MARKETPLACE_LIVE_SUBMIT={version:VERSION,createLiveOrders};
})();
