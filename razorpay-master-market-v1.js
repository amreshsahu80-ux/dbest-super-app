(function(){
'use strict';
const VERSION='1.0-master-market-razorpay';
let busy=false,pending=null,checkoutPromise=null,payuConfigured=false;
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=String(cfg.supabasePublishableKey||''),MASTER_API=BASE+'/functions/v1/marketplace-master-order-live';
const TYPES=['grocery','restaurant','medicine'];
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const M=v=>'₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2});
const D=s=>String(s||'').replace(/\D/g,'');
const N=t=>({grocery:'Grocery',restaurant:'Restaurants & Food',medicine:'Medicines'}[t]||t);
function say(s){try{typeof toast==='function'?toast(s):alert(s)}catch(_){alert(s)}}
function sv(){try{typeof save==='function'&&save()}catch(_){}}
function user(){try{return (typeof me==='function'&&me())||{}}catch(_){return{}}}
function token(){try{return window.DBEST_MEMBER_LIVE?.getToken?.()||''}catch(_){return''}}
function product(id){try{return marketProduct(id)}catch(_){return null}}
function vendor(id){try{return marketVendor(id)}catch(_){return null}}
function cart(t){try{return Array.isArray(commerceCarts[t])?commerceCarts[t]:[]}catch(_){return[]}}
function rows(){const out=[];for(const t of TYPES)for(const r of cart(t)){const p=product(r.id);if(p&&Number(r.qty)>0)out.push({t,r,p,v:vendor(p.vendorId)})}return out}
function count(){return rows().reduce((a,x)=>a+(Number(x.r.qty)||0),0)}
function subtotal(){return Math.round(rows().reduce((a,x)=>a+(Number(x.p.price)||0)*(Number(x.r.qty)||0),0)*100)/100}
function groups(){const g={};for(const x of rows()){const id=String(x.p.vendorId||'');if(!g[id])g[id]={vendorId:id,marketType:x.t,items:[]};g[id].items.push({id:x.r.id,qty:Number(x.r.qty)||1})}return Object.values(g)}
function located(){try{return Number.isFinite(Number(commerceLocation?.lat))&&Number.isFinite(Number(commerceLocation?.lng))}catch(_){return false}}
function txById(id){try{return (Array.isArray(txs)?txs:[]).find(x=>String(x.id)===String(id))||null}catch(_){return null}}
function state(msg,kind='info'){const el=document.getElementById('dbestMasterPayState');if(!el)return;el.textContent=msg;el.style.background=kind==='error'?'#fff1f1':kind==='ok'?'#ecfdf3':'#eef6ff';el.style.borderColor=kind==='error'?'#f0c5c5':kind==='ok'?'#b7ebc8':'#cfe0ff';el.style.color=kind==='error'?'#9b2c2c':kind==='ok'?'#14703c':'#244a7c'}
async function checkPayU(){try{const r=await fetch('/api/payu/config',{cache:'no-store'}),j=await r.json();payuConfigured=!!j.configured}catch(_){payuConfigured=false}}
async function masterApi(action,body={}){const mt=token();if(!mt)throw Error('Please login as a DBest Member first.');const h={apikey:KEY,'Content-Type':'application/json','x-dbest-member-token':mt};if(KEY.startsWith('eyJ'))h.Authorization='Bearer '+KEY;const r=await fetch(MASTER_API,{method:'POST',cache:'no-store',headers:h,body:JSON.stringify({action,...body})}),d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||d.detail||'Order error');return d}
async function jfetch(url,opts={}){const r=await fetch(url,opts),j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||j.message||('HTTP '+r.status));return j}
function loadCheckout(){if(window.Razorpay)return Promise.resolve();if(checkoutPromise)return checkoutPromise;checkoutPromise=new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.async=true;s.onload=ok;s.onerror=()=>no(Error('Unable to load Razorpay Checkout'));document.head.appendChild(s)});return checkoutPromise}
function tracking(){return (crypto.randomUUID?crypto.randomUUID():Date.now()+''+Math.random())+(crypto.randomUUID?crypto.randomUUID():Math.random())}
function formKey(name,mobile,address){const itemKey=rows().map(x=>[x.t,x.r.id,Number(x.r.qty)||0]).sort().map(x=>x.join(':')).join('|');let pos='';try{pos=Number(commerceLocation.lat).toFixed(5)+','+Number(commerceLocation.lng).toFixed(5)}catch(_){ }return [itemKey,pos,name,mobile,address].join('~')}
function checkout(){
  if(typeof requireMember==='function'&&!requireMember())return;
  if(!rows().length)return window.DBEST_MASTER_MARKET?.cart?.();
  const u=user(),stores=new Set(rows().map(x=>x.p.vendorId)).size;
  sectionScreen(`${sectionTopBar('📦 Checkout',`${count()} item${count()===1?'':'s'} • ${stores} store${stores===1?'':'s'}`,'DBEST_MASTER_MARKET.cart()')}<div class="sectionContent shopPage"><form class="checkoutCard" onsubmit="DBEST_MASTER_MARKET.submit(event)"><div class="marketCheckoutLocation"><b>📍 Delivery Location</b><small id="masterGps" style="display:block;margin-top:4px;color:var(--m)">${located()?`Location set • ±${Math.round(Number(commerceLocation.accuracy)||0)} m`:'Location not set.'}</small><button type="button" class="mini" style="margin-top:8px" onclick="DBEST_MASTER_MARKET.gps()">Use / Refresh Location</button></div><div class="serviceFormGrid"><div class="sf"><label>Name</label><input name="name" value="${E(u.name||'')}" required></div><div class="sf"><label>Mobile</label><input name="mobile" value="${E(u.mobile||'')}" required></div><div class="sf full"><label>Email</label><input name="email" type="email" value="${E(u.email||'')}"></div><div class="sf full"><label>Delivery Address / Landmark</label><textarea name="address" required>${E(commerceLocation?.label&&commerceLocation.label!=='Live GPS location'?commerceLocation.label:'')}</textarea></div><div class="sf"><label>PIN Code</label><input name="pin" required></div><div class="sf"><label>Delivery Time</label><select name="slot"><option>As Soon As Possible</option><option>8 AM – 11 AM</option><option>11 AM – 2 PM</option><option>4 PM – 7 PM</option></select></div><div class="sf full"><label>Payment Method</label><label class="payChoice" style="display:block"><input type="radio" name="payment" value="razorpay" checked><b>Primary • Razorpay</b><small style="display:block;color:var(--m);margin-top:3px">Secure online payment • Test Mode</small></label><label class="payChoice" style="display:block;opacity:.55;margin-top:8px"><input type="radio" name="payment" value="payu" disabled><b>Secondary • PayU • ${payuConfigured?'Activation pending':'Setup required'}</b><small style="display:block;color:var(--m);margin-top:3px">Merchant Key & Salt can be activated later.</small></label></div><div class="sf full"><div class="orderSummary"><div class="orderLine"><span>Items</span><b>${M(subtotal())}</b></div><div class="orderLine"><span>Delivery</span><b>Calculated by distance</b></div><div class="orderLine"><span>Final payment</span><b>Calculated securely before Razorpay opens</b></div></div></div><div class="sf full"><div id="dbestMasterPayState" style="margin-bottom:10px;padding:10px 12px;border-radius:10px;background:#eef6ff;border:1px solid #cfe0ff;color:#244a7c;font-size:12px;font-weight:700">Razorpay checkout ready • final total will be calculated by the server</div><button class="btn" style="width:100%">Continue to Razorpay</button></div></div></form></div>`);
}
async function openRazorpay(x,masterOrderId,prefill){
  const order=await jfetch('/api/razorpay/create-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'transaction',dbestRef:x.id,txId:x.id,amount:Number(x.amount||0),section:x.section||'Marketplace - Master Order',sub:x.sub||'Multi-Category Master Order',userId:x.userId||session?.id||'',masterOrderId})});
  if(Number(order.amount)!==Math.round(Number(x.amount||0)*100))throw Error('Server payment total mismatch. Payment stopped.');
  await loadCheckout();
  return new Promise((resolve,reject)=>{let done=false;const finish=(fn,v)=>{if(done)return;done=true;fn(v)};const rz=new Razorpay({key:order.keyId,amount:order.amount,currency:order.currency||'INR',name:'DBest Super Platform',description:'Marketplace Order',order_id:order.orderId,prefill:{name:prefill.name||'',email:prefill.email||'',contact:prefill.mobile||''},handler:async r=>{try{finish(resolve,await jfetch('/api/razorpay/verify-payment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...r,dbestRef:x.id,kind:'transaction'})}))}catch(e){finish(reject,e)}},modal:{ondismiss:()=>finish(reject,Error('Payment cancelled'))}});rz.on('payment.failed',r=>finish(reject,Error(r?.error?.description||'Payment failed')));rz.open()})
}
async function submit(e){
  e?.preventDefault?.();if(busy)return false;
  const form=e?.target;if(!(form instanceof HTMLFormElement))return false;
  if(!form.reportValidity())return false;
  if(!located()){state('Please set the delivery location so the server can calculate the delivery charge.','error');say('Set your delivery location first.');return false}
  if(!rows().length){say('Your cart is empty.');return false}
  const f=new FormData(form),name=String(f.get('name')||'').trim(),mobile=D(f.get('mobile')),email=String(f.get('email')||'').trim(),address=String(f.get('address')||'').trim();
  if(name.length<2||mobile.length<10||address.length<4){state('Complete name, mobile and delivery address.','error');say('Complete name, mobile and address.');return false}
  const key=formKey(name,mobile,address);if(pending&&pending.key!==key)pending=null;
  const btn=form.querySelector('button.btn');busy=true;if(btn){btn.disabled=true;btn.textContent='Calculating final total…'}let x=null;
  try{
    if(!pending){
      state('Calculating the final delivery charge securely…');
      const meta={flow:'marketplace_master',source:'DBest Multi-Category Marketplace',paymentStage:'Razorpay Pending',paymentMethod:'Razorpay',masterCart:{vendorCount:new Set(rows().map(x=>x.p.vendorId)).size,items:rows().map(x=>({type:x.t,id:x.r.id,name:x.p.name,qty:Number(x.r.qty),price:Number(x.p.price),vendorId:x.p.vendorId}))}};
      x=addTx(session.id,'Marketplace - Master Order','Multi-Category Master Order',subtotal(),'Calculating Final Amount / Razorpay Pending','Razorpay',meta);sv();
      const track=tracking(),d=await masterApi('create',{parentTxId:String(x.id),trackingToken:track,customerName:name,customerMobile:mobile,customerEmail:email,deliveryAddress:address,dropLat:Number(commerceLocation.lat),dropLng:Number(commerceLocation.lng),paymentMethod:'Online - Razorpay',taxPercent:Number(commerceConfig?.taxPercent||0),groups:groups()});
      if(!d?.masterOrderId||!d?.pricing||!(Number(d.pricing.total)>0))throw Error('Server could not calculate the final Marketplace total.');
      x.amount=Number(d.pricing.total);x.status='Razorpay Payment Pending';x.paymentStage='Razorpay Pending';x.paymentMethod='Razorpay';x.meta={...(x.meta||{}),paymentStage:'Razorpay Pending',masterOrderId:d.masterOrderId,masterTrackingToken:track,masterPricing:d.pricing,masterChildren:d.children};sv();
      pending={key,txId:x.id,masterOrderId:d.masterOrderId,amount:x.amount,trackingToken:track};
    }else{
      x=txById(pending.txId);if(!x)throw Error('Pending DBest transaction was not found.');
    }
    state(`Final total ${M(x.amount)} • opening Razorpay…`);if(btn)btn.textContent=`Pay ${M(x.amount)} with Razorpay`;
    const v=await openRazorpay(x,pending.masterOrderId,{name,email,mobile});
    if(!v?.verified||!v?.persisted)throw Error('Razorpay payment was not centrally verified.');
    if(!v?.marketplaceOrderActivated)throw Error('Payment verified, but Marketplace order activation is pending. Do not pay again.');
    x.status='Payment Successful / Razorpay Verified';x.paymentStage='Razorpay Verified';x.paymentMethod='Razorpay';x.paymentMode='Razorpay';x.paymentRef=String(v.paymentId||'');x.razorpayOrderId=String(v.orderId||'');x.razorpayPaymentId=String(v.paymentId||'');x.paidAt=new Date().toISOString();x.meta={...(x.meta||{}),paymentStage:'Razorpay Verified',razorpayOrderId:x.razorpayOrderId,razorpayPaymentId:x.razorpayPaymentId,centralTransactionId:v.centralTransactionId||x.id,marketplaceOrderActivated:true};
    for(const t of TYPES)commerceCarts[t]=[];sv();pending=null;state('Razorpay verified • Central Record Saved • Order activated ✓','ok');say('Payment verified and Marketplace order activated.');setTimeout(()=>window.DBEST_MASTER_MARKET?.status?.(x.id),450);return true;
  }catch(err){
    const msg=String(err?.message||err||'Unable to start Razorpay payment');if(x){x.status=/cancel/i.test(msg)?'Razorpay Payment Pending / Customer Cancelled':'Razorpay Payment Pending / Retry Required';x.paymentStage='Razorpay Pending';x.razorpayError=msg;sv()}state(msg,'error');say(msg);return false;
  }finally{busy=false;if(btn){btn.disabled=false;btn.textContent=pending?`Retry ${M(pending.amount)} with Razorpay`:'Continue to Razorpay'}}
}
function install(){const m=window.DBEST_MASTER_MARKET;if(!m||m.__razorpayMasterVersion===VERSION)return false;m.checkout=checkout;m.submit=submit;m.__razorpayMasterVersion=VERSION;return true}
checkPayU();let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>80)clearInterval(timer)},125);setTimeout(install,50);window.addEventListener('load',install,{once:true});
window.DBEST_MASTER_RAZORPAY={version:VERSION,install,checkout,submit};
})();
