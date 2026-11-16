/* Isolated QA Marketplace UI safeguard. Never alters pricing, cart state or payment. */
(function(){
  'use strict';
  var pending=false, timer=0;
  function scope(){return /grocery|restaurant|medicine|cart|checkout/i.test((document.querySelector('.sectionTopBar,.sectionHeader,.sectionContent')||{}).textContent||'') || !!document.querySelector('.shopPage,.productGrid,.cartList');}
  function clean(){
    if(!scope())return;
    document.querySelectorAll('.productCard').forEach(function(card){
      Array.from(card.childNodes).forEach(function(node){if(node.nodeType===3&&/^\s*\d+\s*(plate|plates|piece|pieces)\s*$/i.test(node.textContent||''))node.remove()});
      var buttons=Array.from(card.querySelectorAll('button')).filter(function(b){return /add\s*to\s*cart/i.test(b.textContent||'')});
      buttons.slice(1).forEach(function(b){b.style.setProperty('display','none','important');b.hidden=true;b.setAttribute('aria-hidden','true');b.tabIndex=-1});
    });
    document.querySelectorAll('.cartItem').forEach(function(item){
      var controls=Array.from(item.querySelectorAll('.qtyControl'));
      var groups=Array.from(item.querySelectorAll('.qtyControl')).concat(Array.from(item.querySelectorAll('button')).filter(function(b){return /^[+−-]$/.test((b.textContent||'').trim())&&!b.closest('.qtyControl')}).map(function(b){return b.parentElement}).filter(Boolean));var unique=Array.from(new Set(groups));unique.slice(1).forEach(function(c){c.style.setProperty('display','none','important');c.hidden=true;c.setAttribute('aria-hidden','true')});
    });
    var inCart=!!document.querySelector('.cartList')&&!document.querySelector('.productGrid');
    if(inCart)document.querySelectorAll('button').forEach(function(b){
      if(/view cart/i.test(b.textContent||'')&&b.closest('.cartPill,.stickyCartBar,.cartFloatingBar,[class*="cartBar"],[class*="CartBar"]')){var bar=b.closest('.stickyCartBar,.cartFloatingBar,[class*="cartBar"],[class*="CartBar"]');if(bar){bar.hidden=true;bar.style.setProperty('display','none','important')}}
    });
  }
  var scheduled=false;
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(function(){scheduled=false;clean()})}
  var style=document.createElement('style');style.textContent='.dbestMarketplaceBusy{display:inline-block;width:16px;height:16px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:dbestMarketSpin .7s linear infinite;vertical-align:middle;margin-right:7px}@keyframes dbestMarketSpin{to{transform:rotate(360deg)}}';document.head.appendChild(style);
  var obs=new MutationObserver(schedule);obs.observe(document.documentElement,{childList:true,subtree:true});
  // Use one delegated cart action instead of relying on inline onclick in the Android WebView.
  document.addEventListener('click',function(e){
    var btn=e.target.closest('.productCard .addCartBtn');
    if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(btn.dataset.dbestAdding==='1')return;
    var type=btn.dataset.marketType;
    var id=btn.dataset.marketId;
    if(!type||!id||typeof marketAdd!=='function'){if(typeof toast==='function')toast('Please refresh the Marketplace and retry');return}
    marketAdd(type,id,btn);
  },true);
  document.addEventListener('submit',function(e){
    var form=e.target;if(!scope()||!form.matches('.checkoutCard'))return;
    if(form.dataset.dbestSubmitting==='1'){e.preventDefault();e.stopImmediatePropagation();return}
    form.dataset.dbestSubmitting='1';var b=form.querySelector('[type="submit"],[data-dbest-submit]');if(b){b.disabled=true;b.dataset.dbestOriginal=b.textContent;b.innerHTML='<span class="dbestMarketplaceBusy" aria-hidden="true"></span>Processing order…';b.setAttribute('aria-busy','true')}
    setTimeout(function(){if(form.isConnected){form.dataset.dbestSubmitting='0';if(b){b.disabled=false;b.textContent=b.dataset.dbestOriginal||'Place Order';b.removeAttribute('aria-busy')}}},15000);
  },true);
  schedule();
})();
