(function(){
  'use strict';
  const VERSION='1.1.0';

  function isOwner(){
    try{return !!(window.session&&window.session.role==='owner')||!!sessionStorage.getItem('dbest_owner_session_token')}catch(e){return false}
  }

  function openVisuals(){
    if(!isOwner()) return window.ownerLogin?.();
    if(window.DBEST_SHOWCASE_ADMIN?.openManager) return window.DBEST_SHOWCASE_ADMIN.openManager();
    try{window.toast?.('Partner Section Visuals is still loading. Please try again.')}catch(e){}
  }

  function openOperations(){
    if(!isOwner()) return window.ownerLogin?.();
    if(typeof window.ownerOperations==='function') return window.ownerOperations();
    try{window.toast?.('Owner Operations is still loading. Please try again.')}catch(e){}
  }

  function enhanceOwnerConsole(){
    if(!isOwner())return;
    const root=document.querySelector('.sectionContent');
    if(!root)return;
    const text=(root.innerText||'');
    if(!/Project Owner|Complete Project Control Centre|Master Control|Owner Console/i.test(text))return;

    let grid=root.querySelector('.ownerControlGrid');
    if(!grid){
      const groups=root.querySelector('.owner55Groups');
      if(groups){
        let quick=groups.querySelector('[data-owner-quick-access]');
        if(!quick){
          quick=document.createElement('div');
          quick.className='owner55Group';
          quick.dataset.ownerQuickAccess='1';
          quick.innerHTML='<div class="owner55GroupHead"><div><b>Owner Quick Access</b><small>Operations and partner-section visual controls</small></div></div><div class="owner55Grid"></div>';
          groups.prepend(quick);
        }
        grid=quick.querySelector('.owner55Grid');
      }
    }
    if(!grid)return;

    let ops=[...grid.querySelectorAll('button')].find(b=>/Approvals\s*&\s*Operations|Owner Operations|\bOperations\b/i.test(b.innerText||''));
    if(!ops){
      ops=document.createElement('button');
      ops.className=grid.classList.contains('ownerControlGrid')?'ownerControl':'owner55Action';
      grid.prepend(ops);
    }
    ops.type='button';
    ops.dataset.ownerOperationsEntry='1';
    ops.innerHTML='<span>⚙️</span><b>Owner Operations</b><small>Open approvals, integrations, revenue controls, deeplinks and partner-section management.</small>';
    ops.onclick=openOperations;

    let visuals=[...grid.querySelectorAll('button')].find(b=>/Partner Section Visuals/i.test(b.innerText||''));
    if(!visuals){
      visuals=document.createElement('button');
      visuals.className=grid.classList.contains('ownerControlGrid')?'ownerControl':'owner55Action';
      const after=ops.nextSibling;
      if(after)grid.insertBefore(visuals,after);else grid.appendChild(visuals);
    }
    visuals.type='button';
    visuals.dataset.partnerSectionVisuals='1';
    visuals.innerHTML='<span>🖼️</span><b>Partner Section Visuals</b><small>Directly edit headings, descriptions and images for Insurance, Flights/Hotels/Packages and Mutual Funds.</small>';
    visuals.onclick=openVisuals;
  }

  function enhanceOwnerOperations(){
    if(!isOwner())return;
    const root=document.querySelector('.sectionContent.owner55');
    if(!root)return;

    const groups=[...root.querySelectorAll('.owner55Group')];
    let partnerGroup=groups.find(g=>/Insurance|Mutual Funds|Partner Deeplinks|Partner Sections/i.test(g.innerText||''));
    if(!partnerGroup){
      const groupsRoot=root.querySelector('.owner55Groups')||root;
      partnerGroup=document.createElement('div');
      partnerGroup.className='owner55Group';
      partnerGroup.innerHTML='<div class="owner55GroupHead"><div><b>Partner Sections</b><small>Deeplink destinations and Owner-controlled visual content</small></div></div><div class="owner55Grid"></div>';
      groupsRoot.appendChild(partnerGroup);
    }

    const head=partnerGroup.querySelector('.owner55GroupHead');
    if(head){
      const b=head.querySelector('b');
      const s=head.querySelector('small');
      if(b)b.textContent='Partner Sections';
      if(s)s.textContent='Insurance • Flights / Hotels / Packages • Mutual Funds';
    }

    const grid=partnerGroup.querySelector('.owner55Grid')||partnerGroup;
    let btn=[...grid.querySelectorAll('button.owner55Action')].find(b=>/Insurance\s*\/\s*MF Cards|Partner Section Visuals|Visuals/i.test(b.innerText||''));
    if(!btn){
      btn=document.createElement('button');
      btn.className='owner55Action';
      grid.appendChild(btn);
    }
    btn.type='button';
    btn.dataset.partnerSectionVisuals='1';
    btn.innerHTML='<span>🖼️</span><b>Partner Section Visuals</b><small>Edit section heading/description; add, edit or delete visual cards; upload images; edit card title/category/description; set display order; and hide/show cards for Insurance, Flights/Hotels/Packages and Mutual Funds.</small>';
    btn.onclick=openVisuals;
  }

  function wrapOwner(){
    const raw=window.owner;
    if(typeof raw!=='function'||raw.__ownerQuickAccessWrapped)return;
    const wrapped=function(){
      const out=raw.apply(this,arguments);
      setTimeout(enhanceOwnerConsole,25);
      setTimeout(enhanceOwnerConsole,140);
      return out;
    };
    wrapped.__ownerQuickAccessWrapped=true;
    window.owner=wrapped;
  }

  function wrapOperations(){
    const raw=window.ownerOperations;
    if(typeof raw!=='function'||raw.__partnerVisualsEntryWrapped)return;
    const wrapped=function(){
      const out=raw.apply(this,arguments);
      setTimeout(enhanceOwnerOperations,35);
      setTimeout(enhanceOwnerOperations,180);
      return out;
    };
    wrapped.__partnerVisualsEntryWrapped=true;
    window.ownerOperations=wrapped;
  }

  function install(){wrapOwner();wrapOperations()}

  window.ownerPartnerSectionVisuals=openVisuals;
  window.ownerOperationsDirect=openOperations;
  install();
  setTimeout(install,50);
  setTimeout(install,250);
  setTimeout(()=>{install();enhanceOwnerConsole();enhanceOwnerOperations()},700);
  window.DBEST_PARTNER_VISUALS_ENTRY={version:VERSION,open:openVisuals,openOperations,refresh:()=>{enhanceOwnerConsole();enhanceOwnerOperations()}};
})();
