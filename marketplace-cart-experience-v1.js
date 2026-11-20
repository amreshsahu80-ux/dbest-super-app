(function(){
'use strict';
const style=document.createElement('style');style.textContent=`
.marketHubGrid{gap:12px!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;align-items:stretch!important}
.marketHubCard{height:148px!important;min-height:148px!important;max-height:148px!important;position:relative!important;padding:14px!important;justify-content:flex-end!important;overflow:hidden!important;background:linear-gradient(135deg,#ffffff,#edf4ff)!important;color:#19385e!important;border:1px solid #dce6f5!important;box-shadow:0 5px 16px #153c7020!important}
.marketHubCard:nth-child(2){background:linear-gradient(135deg,#fff,#fff0e8)!important}
.marketHubCard:nth-child(3){background:linear-gradient(135deg,#fff,#f3efff)!important}
.marketHubCard:nth-child(4){background:linear-gradient(135deg,#fff,#e9f9f3)!important}
.marketHubCard:nth-child(5){background:linear-gradient(135deg,#fff,#eaf2ff)!important}
.marketHubCard span{position:absolute!important;right:12px!important;top:10px!important;font-size:35px!important;opacity:.9!important}
.marketHubCard b{font-size:17px!important;margin:0!important;max-width:75%!important}
.marketHubCard small{font-size:11px!important;line-height:1.25!important;color:#64748b!important;opacity:1!important;max-width:100%!important;-webkit-line-clamp:2!important}

.marketHubCard{min-height:166px!important;padding:18px 15px!important;border-radius:22px!important;text-align:left!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:flex-start!important;gap:7px!important;box-shadow:0 9px 24px rgba(18,42,85,.12)!important;transition:transform .16s ease,box-shadow .16s ease!important}
.marketHubCard:active{transform:scale(.98)!important}
.marketHubCard span{font-size:32px!important;line-height:1.1!important;margin-bottom:3px!important}
.marketHubCard b{font-size:19px!important;line-height:1.2!important;letter-spacing:-.3px!important}
.marketHubCard small{font-size:12px!important;line-height:1.4!important;opacity:.92!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
@media(min-width:650px){.marketHubGrid{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
.dbestCartDock{position:fixed!important;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom))!important;z-index:2147483000!important;background:#132c64;color:white;border-radius:16px;box-shadow:0 10px 35px #101d3860;padding:12px 15px;display:flex;align-items:center;justify-content:space-between;gap:12px;max-width:850px;margin:auto}
.dbestCartDock button{background:#fff;color:#153a83;border:0;border-radius:12px;padding:11px 16px;font-weight:800}
.dbestCartDock small{display:block;opacity:.85}.shopPage:has(.productGrid){padding-bottom:100px!important}
.dbestCheckoutItems{border:1px solid #dfe7f4;border-radius:14px;padding:12px;margin:12px 0;background:#f8faff}
.dbestCheckoutRow{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid #dfe7f4}
.dbestCheckoutRow:last-child{border:0}.dbestCheckoutRow b{font-size:13px}.dbestCheckoutRow small{display:block;color:#637188}
.dbestCheckoutRow .qtyControl{flex-shrink:0}.dbestCartBusy{opacity:.72;pointer-events:none}.dbestSpin{display:inline-block;width:14px;height:14px;border:2px solid #7c9fd3;border-top-color:#174b9e;border-radius:50%;animation:dbestSpin .55s linear infinite;vertical-align:middle;margin-right:6px}@keyframes dbestSpin{to{transform:rotate(360deg)}}
`;document.head.appendChild(style);
function getType(){try{return marketState.type||'restaurant'}catch(_){return 'restaurant'}}
function cart(type){try{return marketCart(type)||[]}catch(_){return []}}
function product(id){try{return marketProduct(id)}catch(_){return null}}
function total(type){try{return marketTotals(type)}catch(_){return {total:0,subtotal:0,delivery:0,tax:0}}}
function money(v){return '₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}
function escText(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function dock(){
 const old=document.getElementById('dbestCartDock');
 const onCatalogue=!!document.querySelector('.shopPage .productGrid .productCard') && !document.querySelector('.shopPage .cartList, .shopPage .orderSummary');
 const onCheckout=!!document.querySelector('.checkoutCard');
 if(!onCatalogue||onCheckout){if(old)old.remove();return}
 const type=getType(),rows=cart(type),count=rows.reduce((a,r)=>a+Number(r.qty||0),0);
 if(!count){if(old)old.remove();return}
 let el=old;
 if(!el){el=document.createElement('div');el.id='dbestCartDock';el.className='dbestCartDock';el.setAttribute('role','region');el.setAttribute('aria-label','Shopping cart');document.body.appendChild(el)}
 const html='<div><strong>'+count+' item'+(count===1?'':'s')+' • '+money(total(type).total)+'</strong><small>'+escText(rows.slice(-2).map(r=>{let p=product(r.id);return (p?.name||'Item')+' × '+r.qty}).join(' · '))+'</small></div><button type="button" id="dbestViewCart">View Cart →</button>';
 // Do not rewrite unchanged HTML: that caused a self-triggering MutationObserver loop.
 if(el.dataset.snapshot!==html){el.dataset.snapshot=html;el.innerHTML=html;el.querySelector('button').onclick=()=>window.marketCartScreen(type)}
}
function checkout(){
 const form=document.querySelector('.checkoutCard');if(!form)return;
 let type=getType(),rows=cart(type),holder=form.querySelector('#dbestCheckoutItems');
 if(!holder){holder=document.createElement('div');holder.id='dbestCheckoutItems';holder.className='dbestCheckoutItems';form.insertBefore(holder,form.firstChild)}
 holder.innerHTML='<b>Review items • '+rows.length+' products</b>'+rows.map(r=>{const p=product(r.id);if(!p)return '';return '<div class="dbestCheckoutRow"><div><b>'+escText(p.name)+'</b><small>'+money(p.price)+' each</small></div><div class="qtyControl"><button type="button" data-id="'+escText(r.id)+'" data-delta="-1">−</button><b>'+Number(r.qty)+'</b><button type="button" data-id="'+escText(r.id)+'" data-delta="1" '+(Number(r.qty)>=Number(p.stock||0)?'disabled':'')+'>+</button></div></div>'}).join('');
 holder.querySelectorAll('button[data-id]').forEach(b=>b.onclick=()=>{
   const id=b.dataset.id,delta=Number(b.dataset.delta),p=product(id),row=cart(type).find(x=>String(x.id)===id);
   if(!row||!p)return;
   row.qty=Math.max(0,Math.min(Number(p.stock||0),Number(row.qty||0)+delta));
   commerceCarts[type]=cart(type).filter(x=>x.qty>0);
   save();
   if(!commerceCarts[type].length){marketCartScreen(type);return}
   refreshCheckout();
 });
 refreshTotals(type,form);
}
function refreshTotals(type,form){
 const t=total(type),summary=form.querySelector('.orderSummary'),submit=form.querySelector('button:not([type="button"]).btn');
 if(summary)summary.innerHTML='<div class="orderLine"><span>Subtotal</span><b>'+money(t.subtotal)+'</b></div><div class="orderLine"><span>Delivery (estimate)</span><b>'+money(t.delivery)+'</b></div><div class="orderLine"><span>Tax</span><b>'+money(t.tax)+'</b></div><div class="orderLine total"><span>Total</span><b>'+money(t.total)+'</b></div>';
 if(submit)submit.textContent='Place Order • '+money(t.total);
}
function refreshCheckout(){checkout()}
let queued=false;
function update(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;dock();if(document.querySelector('.checkoutCard')&&!document.getElementById('dbestCheckoutItems'))checkout()})}
function start(){
 // Cart mutations are handled exclusively by the native marketAdd/marketQty
 // functions in index-26.html. Do not intercept product clicks here.
 const originalCheckout=window.marketCheckout;
 if(typeof originalCheckout==='function')window.marketCheckout=function(){const r=originalCheckout.apply(this,arguments);checkout();return r};
 // Product-card additions use marketCardAction rather than marketAdd/marketQty.
 // Listen to those actions as well, so the sticky dock updates immediately.
 document.addEventListener('click',function(e){
   const button=e.target?.closest?.('.productCard button[data-market-action]');
   if(button)requestAnimationFrame(update);
 },true);
 document.addEventListener('dbest:cart-updated',update);
 const originalQty=window.marketQty;
 if(typeof originalQty==='function')window.marketQty=function(){const r=originalQty.apply(this,arguments);update();return r};
 new MutationObserver(records=>{if(records.some(r=>Array.from(r.addedNodes).some(n=>n.nodeType===1&&n.id!=='dbestCartDock'&&!n.closest?.('#dbestCartDock'))))update()}).observe(document.body,{childList:true,subtree:true});
 update();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();