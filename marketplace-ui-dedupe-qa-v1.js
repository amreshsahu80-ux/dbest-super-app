/* Isolated QA Marketplace UI safeguard. Never alters pricing, cart state or payment. */
(function(){
  'use strict';
  var pending=false, timer=0;
  function scope(){return /grocery|restaurant|medicine|cart|checkout/i.test((document.querySelector('.sectionTopBar,.sectionHeader,.sectionContent')||{}).textContent||'') || !!document.querySelector('.shopPage,.productGrid,.cartList');}
  function clean(){
    if(!scope())return;
    document.querySelectorAll('.productCard').forEach(function(card){
      var buttons=Array.from(card.querySelectorAll('button')).filter(function(b){return /add\s*to\s*cart/i.test(b.textContent||'')});
      buttons.slice(1).forEach(function(b){b.hidden=true;b.setAttribute('aria-hidden','true');b.tabIndex=-1});
    });
    document.querySelectorAll('.cartItem').forEach(function(item){
      var controls=Array.from(item.querySelectorAll('.qtyControl'));
      controls.slice(1).forEach(function(c){c.hidden=true;c.setAttribute('aria-hidden','true')});
    });
    var inCart=!!document.querySelector('.cartList');
    if(inCart)document.querySelectorAll('button').forEach(function(b){
      if(/view cart/i.test(b.textContent||'')&&b.closest('.cartPill,.stickyCartBar,.cartFloatingBar,[class*="cartBar"],[class*="CartBar"]')){b.closest('.stickyCartBar,.cartFloatingBar,[class*="cartBar"],[class*="CartBar"]')?.setAttribute('hidden','');}
    });
  }
  var scheduled=false;
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(function(){scheduled=false;clean()})}
  var obs=new MutationObserver(schedule);obs.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b||!scope())return;
    if(/add\s*to\s*cart/i.test(b.textContent||'')){if(b.dataset.dbestBusy==='1'){e.preventDefault();e.stopImmediatePropagation();return}b.dataset.dbestBusy='1';setTimeout(function(){b.dataset.dbestBusy='0'},700)}
  },true);
  document.addEventListener('submit',function(e){
    var form=e.target;if(!scope()||!form.matches('.checkoutCard'))return;
    if(form.dataset.dbestSubmitting==='1'){e.preventDefault();e.stopImmediatePropagation();return}
    form.dataset.dbestSubmitting='1';var b=form.querySelector('[type="submit"],[data-dbest-submit]');if(b){b.disabled=true;b.dataset.dbestOriginal=b.textContent;b.textContent='⏳ Processing order…'}
    setTimeout(function(){if(form.isConnected){form.dataset.dbestSubmitting='0';if(b){b.disabled=false;b.textContent=b.dataset.dbestOriginal||'Place Order'}}},15000);
  },true);
  schedule();
})();
