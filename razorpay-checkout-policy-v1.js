(()=>{
'use strict';
const VERSION='1.0-razorpay-checkout-policy';
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
  if(submit&&/Place Order|Checkout|Pay/i.test(submit.textContent||''))submit.textContent=(/grocery/i.test(String(form.getAttribute('onsubmit')||''))?'Continue to Secure Payment':'Continue to Secure Payment')+' →';
  const parent=choice.closest('.sf')||choice.parentElement;
  if(parent&&!parent.querySelector('.dbestGatewayNote')){
    const n=document.createElement('div');n.className='dbestGatewayNote';n.style.cssText='font-size:11px;color:var(--m);margin-top:7px;line-height:1.45';n.textContent='Razorpay is the active primary gateway. PayU remains built in and will activate automatically after merchant credentials are added.';parent.appendChild(n);
  }
}
function patchForms(){
  document.querySelectorAll('form[onsubmit*="placeMarketOrder"],form[onsubmit*="placeGroceryOrder"]').forEach(patchOne);
}
function wrapSubmit(name){
  const fn=window[name];if(typeof fn!=='function'||fn.__dbestRazorpayCheckoutPolicy)return;
  const w=function(){
    const e=arguments[0],form=e?.target,selected=form?.querySelector('input[name="payment"]:checked');
    const method=String(selected?.value||'razorpay').toLowerCase();
    if(method==='payu'&&!payu.configured){e?.preventDefault?.();say('PayU setup is pending. Please use Razorpay.');return false;}
    if(method!=='razorpay')return fn.apply(this,arguments);
    // Existing commerce code uses its historical "payu" value only as the prepaid-gateway branch.
    // Temporarily map Razorpay into that branch; the actual payment screen is then replaced by the
    // DBest gateway policy router and the server verifies Razorpay before the order proceeds.
    const original=selected?.value;
    if(selected)selected.value='payu';
    let out;
    try{out=fn.apply(this,arguments)}catch(err){if(selected)selected.value=original||'razorpay';throw err}
    const restore=()=>{if(selected)selected.value=original||'razorpay'};
    if(out&&typeof out.finally==='function')return out.finally(restore);
    restore();return out;
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
setInterval(install,900);
window.DBEST_RAZORPAY_CHECKOUT_POLICY={version:VERSION,patchForms,readPayU};
})();
