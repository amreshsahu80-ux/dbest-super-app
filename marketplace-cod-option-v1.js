(function(){
'use strict';
const VERSION='1.0.0';
function ready(){return !!(window.DBEST_MASTER_MARKET&&typeof window.sectionScreen==='function'&&typeof window.sectionTopBar==='function')}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function total(){try{const carts=window.commerceCarts||{},types=['grocery','restaurant','medicine'];let n=0;for(const t of types)for(const r of (Array.isArray(carts[t])?carts[t]:[])){const p=typeof marketProduct==='function'?marketProduct(r.id):null;if(p)n+=(+p.price||0)*(+r.qty||0)}return Math.round(n*100)/100}catch(_){return 0}}
function money(v){return '₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}
function decorateCod(){setTimeout(()=>{try{const root=[...document.querySelectorAll('.sectionContent')].pop();if(!root)return;root.innerHTML=root.innerHTML.replace(/Pay on Delivery/g,'Cash on Delivery (COD)').replace(/Place Order/g,'Place COD Order');const note=document.createElement('div');note.className='notice';note.style.cssText='margin:10px 0;border:1px solid #f0cf8c;background:#fff9e9;border-radius:12px;padding:10px';note.innerHTML='<b>Cash on Delivery</b><br><small>No wallet earning is credited at order placement. Eligible payout is released only after the order is delivered and cash collection is confirmed.</small>';const form=root.querySelector('form');if(form)form.prepend(note)}catch(_){}} ,60)}
function paymentChoice(e){try{e?.preventDefault?.();e?.stopPropagation?.()}catch(_){}
 const api=window.DBEST_MASTER_MARKET,amount=total();
 sectionScreen(`${sectionTopBar('💳 Payment Method','Choose how you want to pay','DBEST_MASTER_MARKET.cart()')}<div class="sectionContent shopPage"><div class="orderSummary"><div class="orderLine"><span>Cart value</span><b>${money(amount)}</b></div></div><div style="display:grid;gap:12px;margin-top:14px"><button class="btn" style="width:100%;padding:16px" onclick="DBEST_MARKETPLACE_PAYMENT_CHOICE.online(event)">💳 Pay Online with Razorpay</button><button class="btn soft" style="width:100%;padding:16px" onclick="DBEST_MARKETPLACE_PAYMENT_CHOICE.cod(event)">💵 Cash on Delivery (COD)</button></div><div class="notice" style="margin-top:14px"><b>COD payout safety</b><br><small>COD orders remain pending until delivery and cash collection are confirmed. No member payout is credited merely because a COD order was placed.</small></div></div>`);
 return false}
let originalSecure=null,originalCheckout=null;
function install(){if(!ready())return false;const api=window.DBEST_MASTER_MARKET;if(api.__codChoiceInstalled)return true;originalSecure=api.secureCheckout;originalCheckout=api.checkout;if(typeof originalSecure!=='function'||typeof originalCheckout!=='function')return false;api.secureCheckout=paymentChoice;api.__codChoiceInstalled=true;return true}
function online(e){try{e?.preventDefault?.();e?.stopPropagation?.()}catch(_){}if(typeof originalSecure==='function')return originalSecure.call(window.DBEST_MASTER_MARKET,e);return false}
function cod(e){try{e?.preventDefault?.();e?.stopPropagation?.()}catch(_){}if(typeof originalCheckout==='function'){const r=originalCheckout.call(window.DBEST_MASTER_MARKET);decorateCod();return r}return false}
window.DBEST_MARKETPLACE_PAYMENT_CHOICE={version:VERSION,paymentChoice,online,cod,install};
let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>40)clearInterval(timer)},250);setTimeout(install,0);document.addEventListener('visibilitychange',()=>{if(!document.hidden)install()});
})();