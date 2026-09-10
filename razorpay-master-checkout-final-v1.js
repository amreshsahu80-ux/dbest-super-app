(()=>{
'use strict';
const VERSION='1.0-final-checkout-authority';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const M=v=>'₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2});
function rows(){try{const types=['grocery','restaurant','medicine'],out=[];for(const t of types)for(const r of (commerceCarts?.[t]||[])){const p=marketProduct(r.id);if(p&&Number(r.qty)>0)out.push({t,r,p})}return out}catch(_){return[]}}
function count(){return rows().reduce((a,x)=>a+(Number(x.r.qty)||0),0)}
function subtotal(){return Math.round(rows().reduce((a,x)=>a+(Number(x.p.price)||0)*(Number(x.r.qty)||0),0)*100)/100}
function located(){try{return Number.isFinite(Number(commerceLocation?.lat))&&Number.isFinite(Number(commerceLocation?.lng))}catch(_){return false}}
function user(){try{return (typeof me==='function'&&me())||{}}catch(_){return{}}}
function checkout(){
  const all=rows();
  if(!all.length){try{window.DBEST_MASTER_MARKET?.cart?.()}catch(_){};return false}
  const u=user(),stores=new Set(all.map(x=>x.p.vendorId)).size;
  const gpsText=located()?`Location set • ±${Math.round(Number(commerceLocation?.accuracy)||0)} m`:'Location not set.';
  try{
    sectionScreen(`${sectionTopBar('📦 Checkout',`${count()} item${count()===1?'':'s'} • ${stores} store${stores===1?'':'s'}`,'DBEST_MASTER_MARKET.cart()')}<div class="sectionContent shopPage"><form class="checkoutCard" id="dbestFinalRazorpayForm"><div class="marketCheckoutLocation"><b>📍 Delivery Location</b><small id="masterGps" style="display:block;margin-top:4px;color:var(--m)">${gpsText}</small><button type="button" class="mini" style="margin-top:8px" onclick="DBEST_MASTER_MARKET.gps()">Use / Refresh Location</button></div><div class="serviceFormGrid"><div class="sf"><label>Name</label><input name="name" value="${E(u.name||'')}" required></div><div class="sf"><label>Mobile</label><input name="mobile" value="${E(u.mobile||'')}" required></div><div class="sf full"><label>Email</label><input name="email" type="email" value="${E(u.email||'')}"></div><div class="sf full"><label>Delivery Address / Landmark</label><textarea name="address" required>${E(commerceLocation?.label&&commerceLocation.label!=='Live GPS location'?commerceLocation.label:'')}</textarea></div><div class="sf"><label>PIN Code</label><input name="pin" required></div><div class="sf"><label>Delivery Time</label><select name="slot"><option>As Soon As Possible</option><option>8 AM – 11 AM</option><option>11 AM – 2 PM</option><option>4 PM – 7 PM</option></select></div><div class="sf full"><label>Payment Method</label><label class="payChoice" style="display:block"><input type="radio" checked disabled><b>Primary • Razorpay</b><small style="display:block;color:var(--m);margin-top:3px">Secure online payment • Test Mode</small></label><label class="payChoice" style="display:block;opacity:.55;margin-top:8px"><input type="radio" disabled><b>Secondary • PayU • Setup required</b></label></div><div class="sf full"><div class="orderSummary"><div class="orderLine"><span>Items</span><b>${M(subtotal())}</b></div><div class="orderLine"><span>Delivery</span><b>Calculated by distance</b></div><div class="orderLine"><span>Final payment</span><b>Calculated securely before Razorpay opens</b></div></div></div><div class="sf full"><div id="dbestMasterPayState" style="margin-bottom:10px;padding:10px 12px;border-radius:10px;background:#eef6ff;border:1px solid #cfe0ff;color:#244a7c;font-size:12px;font-weight:700">Razorpay checkout ready • final total will be calculated by the server</div><button type="submit" class="btn" style="width:100%">Continue to Razorpay</button></div></div></form></div>`);
    const form=document.getElementById('dbestFinalRazorpayForm');
    if(form)form.addEventListener('submit',e=>{
      e.preventDefault();e.stopImmediatePropagation();
      const submit=window.DBEST_MASTER_RAZORPAY?.submit||window.DBEST_MASTER_MARKET?.submit;
      if(typeof submit==='function')return submit.call(window.DBEST_MASTER_RAZORPAY||window.DBEST_MASTER_MARKET,e);
      const s=document.getElementById('dbestMasterPayState');if(s){s.textContent='Secure Razorpay submit handler is not loaded.';s.style.color='#9b2c2c'}
      return false;
    },true);
  }catch(err){console.error('[DBEST final checkout]',err);try{toast('Checkout error: '+String(err?.message||err))}catch(_){}}
  return false;
}
function install(){
  if(window.DBEST_MASTER_RAZORPAY)window.DBEST_MASTER_RAZORPAY.checkout=checkout;
  if(window.DBEST_MASTER_MARKET){window.DBEST_MASTER_MARKET.checkout=checkout;window.DBEST_MASTER_MARKET.secureCheckout=checkout;}
  window.DBEST_FINAL_MARKET_CHECKOUT={version:VERSION,checkout};
}
install();[50,150,400,900,1800].forEach(ms=>setTimeout(install,ms));
})();