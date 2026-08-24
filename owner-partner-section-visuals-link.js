(function(){
  'use strict';
  const VERSION='1.2.0';

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

  function ensurePersistentQuickAccess(){
    if(!isOwner()){
      document.getElementById('dbestOwnerQuickAccessBar')?.remove();
      return;
    }
    const root=document.querySelector('.sectionContent');
    if(!root)return;
    let bar=document.getElementById('dbestOwnerQuickAccessBar');
    if(bar&&bar.parentElement!==root)bar.remove(),bar=null;
    if(!bar){
      bar=document.createElement('div');
      bar.id='dbestOwnerQuickAccessBar';
      bar.style.cssText='margin:0 0 16px;padding:14px;border:1px solid #dbe6ff;border-radius:18px;background:linear-gradient(135deg,#f7faff,#eef3ff);box-shadow:0 8px 24px rgba(23,92,255,.08)';
      bar.innerHTML='<div style="font-weight:900;font-size:17px;color:#173a78;margin-bottom:4px">👑 Owner Quick Controls</div><div style="font-size:12px;color:#687386;margin-bottom:11px">Always available after secure Owner login</div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px"><button type="button" data-owner-ops style="border:0;border-radius:14px;padding:13px 10px;background:#175cff;color:white;font-weight:900;min-height:66px"><span style="font-size:20px;display:block">⚙️</span>Owner Operations</button><button type="button" data-owner-visuals style="border:0;border-radius:14px;padding:13px 10px;background:#10264d;color:white;font-weight:900;min-height:66px"><span style="font-size:20px;display:block">🖼️</span>Partner Section Visuals</button></div><div style="font-size:11px;color:#687386;margin-top:9px">Partner Section Visuals controls Insurance, Flights / Hotels / Packages and Mutual Funds.</div>';
      root.prepend(bar);
      bar.querySelector('[data-owner-ops]').onclick=openOperations;
      bar.querySelector('[data-owner-visuals]').onclick=openVisuals;
    }
  }

  function enhanceOwnerConsole(){
    if(!isOwner())return;
    ensurePersistentQuickAccess();
    const root=document.querySelector('.sectionContent');
    if(!root)return;
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
    ensurePersistentQuickAccess();
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
      const b=head.querySelector('b'),s=head.querySelector('small');
      if(b)b.textContent='Partner Sections';
      if(s)s.textContent='Insurance • Flights / Hotels / Packages • Mutual Funds';
    }
    const grid=partnerGroup.querySelector('.owner55Grid')||partnerGroup;
    let btn=[...grid.querySelectorAll('button.owner55Action')].find(b=>/Insurance\s*\/\s*MF Cards|Partner Section Visuals|Visuals/i.test(b.innerText||''));
    if(!btn){btn=document.createElement('button');btn.className='owner55Action';grid.appendChild(btn)}
    btn.type='button';
    btn.dataset.partnerSectionVisuals='1';
    btn.innerHTML='<span>🖼️</span><b>Partner Section Visuals</b><small>Edit section heading/description; add, edit or delete visual cards; upload images; edit card title/category/description; set display order; and hide/show cards for Insurance, Flights/Hotels/Packages and Mutual Funds.</small>';
    btn.onclick=openVisuals;
  }

  function wrapOwner(){
    const raw=window.owner;
    if(typeof raw!=='function'||raw.__ownerQuickAccessWrapped)return;
    const wrapped=function(){const out=raw.apply(this,arguments);setTimeout(enhanceOwnerConsole,25);setTimeout(enhanceOwnerConsole,140);return out};
    wrapped.__ownerQuickAccessWrapped=true;window.owner=wrapped;
  }

  function wrapOperations(){
    const raw=window.ownerOperations;
    if(typeof raw!=='function'||raw.__partnerVisualsEntryWrapped)return;
    const wrapped=function(){const out=raw.apply(this,arguments);setTimeout(enhanceOwnerOperations,35);setTimeout(enhanceOwnerOperations,180);return out};
    wrapped.__partnerVisualsEntryWrapped=true;window.ownerOperations=wrapped;
  }

  function install(){wrapOwner();wrapOperations();ensurePersistentQuickAccess()}
  const observer=new MutationObserver(()=>setTimeout(()=>{install();enhanceOwnerConsole();enhanceOwnerOperations()},0));
  observer.observe(document.documentElement,{childList:true,subtree:true});

  window.ownerPartnerSectionVisuals=openVisuals;
  window.ownerOperationsDirect=openOperations;
  [0,50,250,700,1500].forEach(ms=>setTimeout(()=>{install();enhanceOwnerConsole();enhanceOwnerOperations()},ms));
  window.DBEST_PARTNER_VISUALS_ENTRY={version:VERSION,open:openVisuals,openOperations,refresh:()=>{ensurePersistentQuickAccess();enhanceOwnerConsole();enhanceOwnerOperations()}};
})();
