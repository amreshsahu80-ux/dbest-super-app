(()=>{
'use strict';
const VERSION='1.2-razorpay-marketplace-capture';
let payu={checked:false,configured:false},busy=false;

function say(msg){try{if(typeof toast==='function')toast(msg);else alert(msg)}catch{}}
async function readPayU(){
  try{const r=await fetch('/api/payu/config',{cache:'no-store'});const j=await r.json();payu={checked:true,configured:!!j.configured};}
  catch{payu={checked:true,configured:false}}
  patchForms();
}
function paymentChoices(){
  return `<label class="payChoice" style="display:block"><input type="radio" name="payment" value="razorpay" checked><b>Primary • Razorpay</b><small style="display:block;color:var(--m);margin-top:3px">Secure online payment</small></label><label class="payChoice" style="display:block;opacity:${payu.configured?'1':'.58'}"><input type="radio" name="payment" value="payu" ${payu.configured?'':'disabled'}><b>Secondary • PayU</b><small style="display:block;color:var(--m);margin-top:3px">${payu.configured?'Alternate payment gateway':'Setup required — Merchant Key & Salt can be added later'}</small></label>`;
}
function patchOne(form){
  if(!form)return;const choice=form.querySelector('.paymentChoice');if(!choice)return;
  if(choice.dataset.dbestGatewayPolicy!==VERSION){choice.dataset.dbestGatewayPolicy=VERSION;choice.innerHTML=paymentChoices();}
  const submit=form.querySelector('button[type="submit"],button.btn');if(submit)submit.textContent='Pay Securely with Razorpay →';
  const parent=choice.closest('.sf')||choice.parentElement;
  if(parent&&!parent.querySelector('.dbestGatewayNote')){const n=document.createElement('div');n.className='dbestGatewayNote';n.style.cssText='font-size:11px;color:var(--m);margin-top:7px;line-height:1.45';n.textContent='Razorpay is active now. PayU remains built in and will activate after merchant credentials are added.';parent.appendChild(n);}
}
function patchForms(){document.querySelectorAll('form[onsubmit*="placeMarketOrder"]').forEach(patchOne);}
function currentUser(){try{return typeof me==='function'?(me()||{}):{}}catch{return{}}}
function digits(v){return String(v||'').replace(/\D/g,'')}
function getType(form){const s=String(form?.getAttribute('onsubmit')||'');const m=s.match(/placeMarketOrder\(event\s*,\s*['\"]([^'\"]+)/);return m?m[1]:''}
async function createMarketplaceTransaction(form,type){
  if(typeof requireMember==='function'&&!requireMember())throw new Error('Active membership is required');
  const t=marketTotals(type),min=Number(commerceConfig?.minOrder||0);if(type!=='digital'&&min&&Number(t.subtotal||0)<min)throw new Error(`Minimum product value is ₹${Math.round(min)}.`);
  const cart=marketCart(type);if(!Array.isArray(cart)||!cart.length)throw new Error('Your cart is empty.');
  const f=new FormData(form),u=currentUser(),customerName=String(f.get('name')||u.name||'').trim(),customerMobile=digits(f.get('mobile')||u.mobile||''),customerEmail=String(u.email||f.get('deliveryEmail')||'').trim().toLowerCase();
  if(type!=='digital'&&customerMobile.length<10)throw new Error('Enter a valid customer mobile number.');
  let prescription=null;if(typeof cartNeedsPrescription==='function'&&cartNeedsPrescription(type)){const file=form.elements?.prescription?.files?.[0];if(file&&typeof fileRecord==='function')prescription=await fileRecord(file)}
  const items=cart.map(r=>{const p=marketProduct(r.id);return {id:r.id,name:p?.name||r.id,qty:Number(r.qty||1),price:Number(p?.price||0),vendorId:p?.vendorId||'',rx:!!p?.rx}});
  let address=String(f.get('address')||'').trim();try{if(typeof commerceNeedsLocation==='function'&&commerceNeedsLocation(type)&&!address&&commerceLocation?.label)address=commerceLocation.label}catch{}
  const loc=(typeof commerceLocation!=='undefined'&&commerceLocation?.lat)?{...commerceLocation}:null;
  const x=addTx(session.id,`Marketplace - ${marketTitle(type)}`,`${marketTitle(type)} Order`,Number(t.total||0),'Order Created / Razorpay Pending','Razorpay',{
    source:'DBest Multi-Vendor Marketplace',flow:'marketplace',marketType:type,paymentStage:'Razorpay Pending',paymentMethod:'Razorpay',
    order:{type,items,subtotal:t.subtotal,delivery:t.delivery,tax:t.tax,total:t.total,address,pin:String(f.get('pin')||''),slot:String(f.get('slot')||''),deliveryEmail:String(f.get('deliveryEmail')||''),paymentMethod:'Razorpay',stage:1,liveLocation:loc,prescription,customerName,customerMobile,customerEmail}
  });
  x.order=x.meta.order;x.paymentStage='Razorpay Pending';x.paymentMethod='Razorpay';x.paymentMode='Razorpay';if(typeof save==='function')save();return x;
}
async function launch(tx,button){
  if(!tx?.id)throw new Error('Payment transaction could not be prepared.');
  if(typeof window.startRazorpay!=='function'&&!window.__DBEST_RAZORPAY__?.payTransaction)throw new Error('Razorpay checkout is still loading. Please retry in a moment.');
  if(button){button.disabled=true;button.textContent='Opening Razorpay…'}
  try{return typeof window.startRazorpay==='function'?await window.startRazorpay(tx.id):await window.__DBEST_RAZORPAY__.payTransaction(tx.id)}
  finally{if(button){button.disabled=false;button.textContent='Pay Securely with Razorpay →'}}
}
async function captureSubmit(e){
  const form=e.target;if(!(form instanceof HTMLFormElement))return;const type=getType(form);if(!type)return;
  const selected=form.querySelector('input[name="payment"]:checked'),method=String(selected?.value||'razorpay').toLowerCase();
  if(method==='payu'){if(!payu.configured){e.preventDefault();e.stopImmediatePropagation();say('PayU setup is pending. Please use Razorpay.');}return;}
  if(method!=='razorpay')return;
  e.preventDefault();e.stopImmediatePropagation();if(busy)return;busy=true;
  const button=form.querySelector('button[type="submit"],button.btn');
  try{const tx=await createMarketplaceTransaction(form,type);await launch(tx,button)}catch(err){say(String(err?.message||err||'Unable to start Razorpay payment'))}finally{busy=false;}
}
function install(){patchForms();}
install();readPayU();document.addEventListener('submit',captureSubmit,true);
new MutationObserver(()=>patchForms()).observe(document.documentElement,{childList:true,subtree:true});
setInterval(patchForms,1000);
window.DBEST_RAZORPAY_CHECKOUT_POLICY={version:VERSION,patchForms,readPayU};
})();
