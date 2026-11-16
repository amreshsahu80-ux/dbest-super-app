/* Isolated QA Marketplace UI safeguard. Never alters pricing, cart state or payment. */
(function(){
  'use strict';
  var pending=false, timer=0;
  function scope(){return /grocery|restaurant|medicine|cart|checkout/i.test((document.querySelector('.sectionTopBar,.sectionHeader,.sectionContent')||{}).textContent||'') || !!document.querySelector('.shopPage,.productGrid,.cartList');}
  function clean(){
    if(!scope())return;
    document.querySelectorAll('.productCard').forEach(function(card){
      Array.from(card.childNodes).forEach(function(node){if(node.nodeType===3&&/\bplate\b/i.test(node.textContent||''))node.remove()});Array.from(card.children).forEach(function(el){if(!el.matches('.productImage,.productBody'))el.style.setProperty('display','none','important')});
      // Remove stray unit labels injected after a card (outside productBody).
      var next=card.nextSibling,guard=0;
      while(next&&guard++<6){
        var candidate=next,raw=(candidate.textContent||'').trim();
        if(candidate.nodeType===3&&!raw){next=candidate.nextSibling;continue}
        if(/^1\s*plates?$/i.test(raw) && (candidate.nodeType===3 || (candidate.nodeType===1 && !candidate.querySelector('button,img,.productCard')))){
          next=candidate.nextSibling;candidate.remove();continue;
        }
        break;
      }
      // Extra unit text may be injected INSIDE productBody after Add to Cart.
      // Keep the legitimate unit/category small above the button.
      var body=card.querySelector('.productBody'),add=body&&body.querySelector('button.addCartBtn');
      if(body&&add){
        var tail=add.nextSibling,limit=0;
        while(tail&&limit++<12){
          var node=tail,raw=(node.textContent||'').trim();
          tail=node.nextSibling;
          if(node.nodeType===3&&!raw)continue;
          if(/^1\s*plates?$/i.test(raw)&&
             (node.nodeType===3||(node.nodeType===1&&!node.querySelector('button,input,img')))){
            node.remove();continue;
          }
          break;
        }
      }
      var buttons=Array.from(card.querySelectorAll('button')).filter(function(b){return /add\s*to\s*cart/i.test(b.textContent||'')});
      buttons.slice(1).forEach(function(b){b.style.setProperty('display','none','important');b.hidden=true;b.setAttribute('aria-hidden','true');b.tabIndex=-1});
    });
    // Restrict orphan-label removal to product grids, never the legitimate unit metadata.
    document.querySelectorAll('.productGrid').forEach(function(grid){
      grid.querySelectorAll('*').forEach(function(el){
        if(el.matches('.productCard,.productBody,.productImage,button,small'))return;
        if(el.closest('.productCard'))return;
        if(el.children.length || !/^1\\s*plates?$/i.test((el.textContent||'').trim()))return;
        el.remove();
      });
      Array.from(grid.childNodes).forEach(function(node){
        if(node.nodeType===3 && /^1\\s*plates?$/i.test((node.textContent||'').trim()))node.remove();
      });
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
  // Product ID is bound to each card; use a single delegated action.
  document.addEventListener('click',function(e){
    var btn=e.target.closest('button.addCartBtn[data-market-id]');
    if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(btn.dataset.dbestAdding==='1')return;
    var id=btn.getAttribute('data-market-id'),type=btn.getAttribute('data-market-type');
    if(!id||!type)return;
    btn.dataset.dbestAdding='1';btn.disabled=true;btn.setAttribute('aria-busy','true');
    btn.innerHTML='<span class="dbestMarketplaceBusy" aria-hidden="true"></span>Adding…';
    try{
      var product=commerceConfig.products.find(function(p){return String(p.id)===String(id)&&p.type===type});
      if(!product||Number(product.stock)<=0)throw Error('Product unavailable');
      var cart=(commerceCarts[type]||[]).filter(function(r){return marketProduct(r.id)&&Number(r.qty)>0});
      var row=cart.find(function(r){return String(r.id)===String(id)});
      if(row){if(Number(row.qty)>=Number(product.stock))throw Error('Stock limit reached');row.qty=Number(row.qty)+1}
      else cart.push({id:product.id,qty:1});
      commerceCarts[type]=cart;
      localStorage.setItem('d2_commerce_carts',JSON.stringify(commerceCarts));
      if(typeof save==='function')save();
      if(typeof toast==='function')toast(product.name+' added to cart');
      setTimeout(function(){if(typeof openMarketplace==='function')openMarketplace(type)},650);
    }catch(err){
      console.error('DBest marketplace cart',err);
      if(typeof toast==='function')toast(err.message||'Could not add item');
      btn.disabled=false;btn.dataset.dbestAdding='0';btn.removeAttribute('aria-busy');btn.textContent='+ Add to Cart';
    }
  },true);
  document.addEventListener('submit',function(e){
    var form=e.target;if(!scope()||!form.matches('.checkoutCard'))return;
    if(form.dataset.dbestSubmitting==='1'){e.preventDefault();e.stopImmediatePropagation();return}
    form.dataset.dbestSubmitting='1';var b=form.querySelector('[type="submit"],[data-dbest-submit]');if(b){b.disabled=true;b.dataset.dbestOriginal=b.textContent;b.innerHTML='<span class="dbestMarketplaceBusy" aria-hidden="true"></span>Processing order…';b.setAttribute('aria-busy','true')}
    setTimeout(function(){if(form.isConnected){form.dataset.dbestSubmitting='0';if(b){b.disabled=false;b.textContent=b.dataset.dbestOriginal||'Place Order';b.removeAttribute('aria-busy')}}},15000);
  },true);
  schedule();
})();
