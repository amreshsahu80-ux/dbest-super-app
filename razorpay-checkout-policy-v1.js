(()=>{
'use strict';
const VERSION='1.1-razorpay-checkout-direct';
let payu={checked:false,configured:false};

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
  if(!form)return;
  const choice=form.querySelector('.paymentChoice');if(!choice)return;
  if(choice.dataset.dbestGatewayPolicy===VERSION)return;
  choice.dataset.dbestGatewayPolicy=VERSION;
  choice.innerHTML=paymentChoices();
  const submit=form.querySelector('button[type="submit"],button.btn');
  if(submit&&/Place Order|Checkout|Pay|Continue/i.test(submit.textContent||''))submit.textContent='Pay Securely with Razorpay →';
  const parent=choice.closest('.sf')||choice.parentElement;
  if(parent&&!parent.querySelector('.dbestGatewayNote')){
    const n=document.createElement('div');n.className='dbestGatewayNote';n.style.cssText='font-size:11px;color:var(--m);margin-top:7px;line-height:1.45';n.textContent='Razorpay is active now. PayU remains built in and will activate after merchant credentials are added.';parent.appendChild(n);
  }
}
function patchForms(){
  document.querySelectorAll('form[onsubmit*="placeMarketOrder"],form[onsubmit*="placeGroceryOrder"]').forEach(patchOne);
}
function txIds(){try{return new Set((Array.isArray(txs)?txs:[]).map(x=>String(x.id||'')))}catch{return new Set()}}
function newestNewTx(before){
  try{
    const rows=(Array.isArray(txs)?txs:[]).filter(x=>x&&x.id&&!before.has(String(x.id)));
    return rows.length?rows[rows.length-1]:null;
  }catch{return null}
}
function launchRazorpay(tx){
  if(!tx?.id){say('Payment transaction could not be prepared. Please retry once.');return false;}
  try{
    tx.paymentMethod='Razorpay';tx.paymentMode='Razorpay';tx.paymentStage='Razorpay Ready';
    tx.meta={...(tx.meta||{}),paymentMethod:'Razorpay',paymentStage:'Razorpay Ready'};
    if(tx.order){tx.order.paymentMethod='Razorpay';tx.meta.order=tx.order;}
    if(typeof save==='function')save();
  }catch{}
  if(typeof window.startRazorpay==='function')return window.startRazorpay(tx.id);
  if(window.__DBEST_RAZORPAY__?.payTransaction)return window.__DBEST_RAZORPAY__.payTransaction(tx.id);
  if(typeof window.dbestPolicyRazorpay==='function')return window.dbestPolicyRazorpay(tx.id);
  say('Razorpay checkout is still loading. Please tap again in a moment.');return false;
}
function wrapSubmit(name){
  const fn=window[name];if(typeof fn!=='function'||fn.__dbestRazorpayCheckoutPolicy)return;
  const w=function(){
    const e=arguments[0],form=e?.target,selected=form?.querySelector('input[name="payment"]:checked');
    const method=String(selected?.value||'razorpay').toLowerCase();
    if(method==='payu'&&!payu.configured){e?.preventDefault?.();say('PayU setup is pending. Please use Razorpay.');return false;}
    if(method!=='razorpay')return fn.apply(this,arguments);
    e?.preventDefault?.();
    const before=txIds(),original=selected?.value;
    if(selected)selected.value='payu';
    let out;
    try{out=fn.apply(this,arguments)}catch(err){if(selected)selected.value=original||'razorpay';say(String(err?.message||err||'Unable to prepare payment'));return false}
    const finish=()=>{
      if(selected)selected.value=original||'razorpay';
      const tx=newestNewTx(before);
      if(!tx){say('Order was not prepared for payment. Please retry once.');return false;}
      return launchRazorpay(tx);
    };
    if(out&&typeof out.then==='function')return Promise.resolve(out).then(finish,err=>{if(selected)selected.value=original||'razorpay';say(String(err?.message||err||'Unable to prepare payment'));return false});
    return finish();
  };
  w.__dbestRazorpayCheckoutPolicy=true;w.__dbestOriginal=fn;window[name]=w;
}
function install(){
  try{if(typeof commerceConfig!=='undefined'&&commerceConfig)commerceConfig.payu=true}catch{}
  try{if(typeof groceryConfig!=='undefined'&&groceryConfig)groceryConfig.payu=true}catch{}
  wrapSubmit('placeMarketOrder');wrapSubmit('placeGroceryOrder');patchForms();
}
install();readPayU();
new MutationObserver(()=>{install();patchForms()}).observe(document.documentElement,{childList:true,subtree:true});
setInterval(install,700);
window.DBEST_RAZORPAY_CHECKOUT_POLICY={version:VERSION,patchForms,readPayU};
})();
