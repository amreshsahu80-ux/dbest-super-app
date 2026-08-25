window.DBEST_RUNTIME_CONFIG = Object.freeze({
  supabaseUrl: "https://ydedmotbacnllkijzmvp.supabase.co",
  supabasePublishableKey: "sb_publishable_qWqQExdtL5ddWcK_yLCcNA__-ZUBtox",
  mapplsStaticKey: "yukntloynujcqkanhyuzmvnksznhvwvndcdg",
  integrationBranch: "backend-integration"
});

(function(){
  const V='20260825-1212-member-photo-fix';

  const loadScript=(src,attr)=>{
    const load=()=>{
      if(document.querySelector('script['+attr+']')) return;
      const s=document.createElement('script');s.src=src;s.setAttribute(attr,'1');document.body.appendChild(s);
    };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load,{once:true}); else load();
  };

  const loadScriptAsync=(src,attr)=>new Promise((resolve,reject)=>{
    const existing=document.querySelector('script['+attr+']');
    if(existing){
      if(existing.dataset.loaded==='1') return resolve();
      existing.addEventListener('load',()=>resolve(),{once:true});
      existing.addEventListener('error',reject,{once:true});
      setTimeout(resolve,1200);
      return;
    }
    const s=document.createElement('script');
    s.src=src;
    s.setAttribute(attr,'1');
    s.onload=()=>{s.dataset.loaded='1';resolve()};
    s.onerror=reject;
    document.body.appendChild(s);
  });

  loadScript('/ride-otp-completion-fix.js?v='+V,'data-dbest-ride-otp-fix');
  loadScript('/cab-rental-legacy-bridge.js?v='+V,'data-dbest-rental-legacy-bridge');
  loadScript('/cab-booking-flow-fix.js?v='+V,'data-dbest-cab-booking-flow-fix');

  if(/\/vaahak(?:\.html)?\/?$/i.test(location.pathname)){
    loadScript('/vaahak-completed-dashboard-final.js?v='+V,'data-dbest-completed-final');
    loadScript('/vaahak-nearest-dispatch.js?v='+V,'data-dbest-nearest-dispatch');
    loadScript('/vaahak-marketplace-sync-ui.js?v='+V,'data-dbest-marketplace-sync-ui');
  }

  const lockFinalCab=()=>{
    const finalCab=window.DBEST_CAB_MAPPLS_RENTAL;
    if(finalCab && typeof finalCab.open==='function'){
      window.openRidePlatform=finalCab.open;
      window.DBEST_ACTIVE_CAB_VERSION='MAPPLS_RENTAL_V2';
      return true;
    }
    return false;
  };

  const loadFinalLayers=async()=>{
    loadScript('/owner-control-live.js?v='+V,'data-dbest-owner-control-live');
    loadScript('/owner-deeplink-all-sections.js?v='+V,'data-dbest-owner-deeplinks-all');
    loadScript('/transaction-capture-universal.js?v='+V,'data-dbest-transaction-universal');
    loadScript('/owner-section-visibility-control.js?v='+V,'data-dbest-owner-section-visibility');
    loadScript('/external-success-claims.js?v='+V,'data-dbest-external-success-claims');
    loadScript('/member-id-card-enhanced.js?v='+V,'data-dbest-member-id-card-enhanced');

    try{
      await loadScriptAsync('/cab-location-production-v9.js?v='+V,'data-dbest-cab-location-v9');
      await loadScriptAsync('/mappls-cab-production.js?v='+V,'data-dbest-mappls-cab');
      await loadScriptAsync('/cab-mappls-rental-v2.js?v='+V,'data-dbest-mappls-rental-v2');
      await loadScriptAsync('/cab-booking-step-fix.js?v='+V,'data-dbest-cab-booking-step-fix');
    }catch(e){
      console.warn('DBest final cab layer load warning',e);
    }

    lockFinalCab();
    let attempts=0;
    const guard=setInterval(()=>{
      attempts++;
      lockFinalCab();
      if(attempts>=30) clearInterval(guard);
    },500);
  };

  if(document.readyState==='complete') loadFinalLayers();
  else window.addEventListener('load',loadFinalLayers,{once:true});
})();