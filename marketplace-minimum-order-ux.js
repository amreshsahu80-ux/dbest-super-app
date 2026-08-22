(function(){
'use strict';
const VERSION='1.0.0';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function numbers(type){try{const t=typeof marketTotals==='function'?marketTotals(type):{subtotal:0,total:0};const min=Number((typeof commerceConfig!=='undefined'&&commerceConfig?.minOrder)||0);return {subtotal:Number(t?.subtotal||0),total:Number(t?.total||0),min,short:Math.max(0,min-Number(t?.subtotal||0))}}catch(e){return {subtotal:0,total:0,min:0,short:0}}}
function decorate(type,focus=false){
  try{
    const form=document.querySelector('.checkoutCard');if(!form)return;
    const v=numbers(type);let note=document.getElementById('dbestMinOrderNotice');
    if(type==='digital'||!v.min||v.subtotal>=v.min){if(note)note.remove();return}
    if(!note){note=document.createElement('div');note.id='dbestMinOrderNotice';note.className='notice';note.style.cssText='margin:10px 0 12px;padding:13px;border:1px solid #f0c36a;background:#fff8e8;color:#704d00;border-radius:14px;line-height:1.45';const summary=form.querySelector('.orderSummary');(summary?.parentElement||form).insertAdjacentElement('beforebegin',note)}
    note.innerHTML=`<b>Minimum order: ₹${Math.round(v.min)}</b><br>Minimum applies to the <b>product value before delivery charges</b>. Current product value is <b>₹${Math.round(v.subtotal)}</b>. Please add <b>₹${Math.round(v.short)}</b> more to place this order.`;
    const btn=form.querySelector('button.btn[type="submit"],button.btn:not([type])');if(btn){btn.type='button';btn.textContent=`← Add ₹${Math.round(v.short)} more to cart`;btn.onclick=()=>{try{marketCartScreen(type)}catch(e){history.back()}}}
    if(focus){note.scrollIntoView({behavior:'smooth',block:'center'});note.animate?.([{transform:'scale(1)'},{transform:'scale(1.015)'},{transform:'scale(1)'}],{duration:450})}
  }catch(e){console.warn('Minimum order UX',e)}
}
const baseCheckout=window.marketCheckout;
if(typeof baseCheckout==='function')window.marketCheckout=function(type){const r=baseCheckout.apply(this,arguments);setTimeout(()=>decorate(type),120);return r};
const basePlace=window.placeMarketOrder;
if(typeof basePlace==='function')window.placeMarketOrder=async function(e,type){const v=numbers(type);if(type!=='digital'&&v.min&&v.subtotal<v.min){e?.preventDefault?.();decorate(type,true);try{typeof toast==='function'&&toast(`Minimum product value is ₹${Math.round(v.min)}. Add ₹${Math.round(v.short)} more.`)}catch(_){}return false}return basePlace.apply(this,arguments)};
window.DBEST_MARKETPLACE_MIN_ORDER_UX={version:VERSION,decorate};
})();