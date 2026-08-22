(function(){
  function closeShowcase(){
    document.getElementById('dbestShowcaseEditModal')?.remove();
    document.getElementById('dbestShowcaseOwnerModal')?.remove();
  }
  function install(){
    if(window.__dbestOwnerNavFixV2)return;

    // IMPORTANT: do not override the app's native saveLink(). The native
    // implementation owns the deeplink state and persistence logic.

    document.addEventListener('click',function(e){
      const b=e.target.closest?.('button,[onclick]');
      if(!b)return;
      const onclick=String(b.getAttribute?.('onclick')||'');
      const text=String(b.textContent||'').trim().toLowerCase();

      // Any navigation away from the Insurance/MF visual manager must remove
      // its full-screen overlay so the Owner console cannot become blocked.
      if(document.getElementById('dbestShowcaseOwnerModal')){
        const isShowcaseInternal=!!b.closest?.('#dbestShowcaseOwnerModal,#dbestShowcaseEditModal');
        if(!isShowcaseInternal || /back|owner\(|owner[A-Z]/.test(onclick) || text.startsWith('← back')) closeShowcase();
      }
    },true);

    // Browser back / Android back should never leave an invisible overlay.
    window.addEventListener('popstate',closeShowcase);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeShowcase()});

    window.DBEST_CLOSE_SHOWCASE_MANAGER=closeShowcase;
    window.__dbestOwnerNavFixV2=true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();