(function(){
  function notify(msg){try{if(typeof window.toast==='function')window.toast(msg);else alert(msg)}catch(e){alert(msg)}}
  function isOwner(){try{return typeof session!=='undefined'&&session&&session.role==='owner'}catch(e){return false}}
  function cleanOwnerUi(){try{document.getElementById('dbestShowcaseOwnerModal')?.remove();document.getElementById('dbestShowcaseEditModal')?.remove();document.body.style.overflow=''}catch(e){}}
  function ownerBack(){setTimeout(()=>{try{const back=document.querySelector('.sectionOverlay .sectionBack');if(back&&isOwner())back.setAttribute('onclick','owner()')}catch(e){}},20)}
  window.ownerQuickAddVendor=function(){
    cleanOwnerUi();
    if(!isOwner())return typeof window.ownerLogin==='function'?window.ownerLogin():null;
    if(typeof window.vendorRegistrationScreen==='function'){
      window.vendorRegistrationScreen();
      ownerBack();
      return;
    }
    if(typeof window.vendorLoginScreen==='function'){
      window.vendorLoginScreen();
      ownerBack();
      return;
    }
    if(typeof window.ownerMarketplaceControl==='function')return window.ownerMarketplaceControl();
    notify('Vendor registration screen unavailable.');
  };
  window.ownerQuickAddVaahak=function(){
    cleanOwnerUi();
    if(!isOwner())return typeof window.ownerLogin==='function'?window.ownerLogin():null;
    if(typeof window.vaahakRegistrationScreen==='function'){
      window.vaahakRegistrationScreen();
      ownerBack();
      return;
    }
    if(typeof window.openVaahakPortal==='function'){
      window.openVaahakPortal();
      setTimeout(()=>{
        try{
          const register=[...document.querySelectorAll('button')].find(b=>/Register as Vaahak/i.test(b.innerText||''));
          if(register)register.click();
          ownerBack();
        }catch(e){}
      },30);
      return;
    }
    if(typeof window.ownerVaahakControl==='function')return window.ownerVaahakControl();
    notify('Vaahak registration screen unavailable.');
  };
  function repairQuickAddButtons(){
    if(!isOwner())return;
    document.querySelectorAll('#dbestOwnerQuickAddGroup button,.owner55Action').forEach(b=>{
      const t=(b.innerText||'').trim();
      if(/^Add Vendor/i.test(t)){
        b.onclick=window.ownerQuickAddVendor;
        b.setAttribute('data-dbest-owner-add','vendor');
      }
      if(/^Add Vaahak/i.test(t)){
        b.onclick=window.ownerQuickAddVaahak;
        b.setAttribute('data-dbest-owner-add','vaahak');
      }
    });
  }
  document.addEventListener('click',function(e){
    if(!isOwner())return;
    const b=e.target.closest?.('button');if(!b)return;
    const t=(b.innerText||'').trim();
    if(/^Add Vendor/i.test(t)){
      e.preventDefault();e.stopImmediatePropagation();return window.ownerQuickAddVendor();
    }
    if(/^Add Vaahak/i.test(t)){
      e.preventDefault();e.stopImmediatePropagation();return window.ownerQuickAddVaahak();
    }
  },true);
  const obs=new MutationObserver(()=>setTimeout(repairQuickAddButtons,20));
  obs.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(repairQuickAddButtons,100);
  setTimeout(repairQuickAddButtons,500);
  window.DBEST_OWNER_PARTNER_ADD_FIX={version:'1.0.0',refresh:repairQuickAddButtons,addVendor:window.ownerQuickAddVendor,addVaahak:window.ownerQuickAddVaahak};
})();