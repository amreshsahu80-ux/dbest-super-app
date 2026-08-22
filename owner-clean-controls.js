(function(){
  function isOwner(){try{return window.session&&session.role==='owner'}catch(e){return false}}
  function cleanOverlays(){
    if(!document.getElementById('dbestShowcaseOwnerModal')) document.body.style.overflow='';
  }
  function addVisualControl(){
    if(!isOwner())return;
    const root=document.querySelector('.sectionContent.owner55');
    if(!root||document.getElementById('dbestOwnerVisualControl'))return;
    const groups=[...root.querySelectorAll('.owner55Group')];
    const platform=groups.find(g=>/Platform & Experience/i.test(g.innerText||''))||groups[0];
    const grid=platform?.querySelector('.owner55Grid'); if(!grid)return;
    const b=document.createElement('button');
    b.id='dbestOwnerVisualControl'; b.className='owner55Action';
    b.innerHTML='<span>🖼</span><b>Insurance & MF Visuals</b><small>Only card images, names, descriptions, order and visibility. No payout rules here.</small>';
    b.onclick=()=>window.DBEST_SHOWCASE_ADMIN?.openManager?.();
    grid.appendChild(b);
  }
  function routeOwnerControl(e){
    if(!isOwner())return;
    const b=e.target.closest?.('button'); if(!b)return;
    const t=(b.innerText||'').trim().toLowerCase();
    if(t.includes('tile media studio')||t==='tile media'||t.startsWith('tile media\n')){
      if(typeof window.ownerTileMediaStudio==='function'){e.preventDefault();e.stopImmediatePropagation();cleanOverlays();window.ownerTileMediaStudio();}
      return;
    }
    if(t.includes('deeplink integrations')||t.includes('deeplink integration studio')||t==='deeplinks'||t.includes('external deeplinks')){
      if(typeof window.ownerDeeplinkStudio==='function'){e.preventDefault();e.stopImmediatePropagation();cleanOverlays();window.ownerDeeplinkStudio();}
      return;
    }
    if(t.includes('payout studio')||t==='payouts'||t.startsWith('payout rules')){
      if(typeof window.ownerPayoutStudio==='function'){e.preventDefault();e.stopImmediatePropagation();cleanOverlays();window.ownerPayoutStudio();}
      return;
    }
    if(t.includes('insurance & mf visuals')){
      e.preventDefault();e.stopImmediatePropagation();cleanOverlays();window.DBEST_SHOWCASE_ADMIN?.openManager?.();
    }
  }
  document.addEventListener('click',routeOwnerControl,true);
  const observer=new MutationObserver(()=>{cleanOverlays();addVisualControl();});
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(addVisualControl,250);
  window.DBEST_OWNER_CLEAN_CONTROLS={refresh:addVisualControl};
})();