(function(){
  'use strict';
  const VERSION='1.0.0';

  function isOwner(){
    try{return !!(window.session&&window.session.role==='owner')||!!sessionStorage.getItem('dbest_owner_session_token')}catch(e){return false}
  }

  function openVisuals(){
    if(!isOwner()) return window.ownerLogin?.();
    if(window.DBEST_SHOWCASE_ADMIN?.openManager) return window.DBEST_SHOWCASE_ADMIN.openManager();
    try{window.toast?.('Partner Section Visuals is still loading. Please try again.')}catch(e){}
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

  function install(){
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

  window.ownerPartnerSectionVisuals=openVisuals;
  install();
  setTimeout(install,50);
  setTimeout(install,250);
  setTimeout(()=>{install();enhanceOwnerOperations()},700);
  window.DBEST_PARTNER_VISUALS_ENTRY={version:VERSION,open:openVisuals,refresh:enhanceOwnerOperations};
})();
