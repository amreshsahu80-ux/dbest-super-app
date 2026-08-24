window.DBEST_RUNTIME_CONFIG = Object.freeze({
  ownerEmail: "amresh.sahu80@gmail.com",
  supabaseUrl: "https://ydedmotbacnllkijzmvp.supabase.co",
  supabasePublishableKey: "sb_publishable_qWqQExdtL5ddWcK_yLCcNA__-ZUBtox",
  mapplsStaticKey: "yukntloynujcqkanhyuzmvnksznhvwvndcdg",
  integrationBranch: "backend-integration"
});

(function(){
  const V='20260824-1145-mappls-live';
  const loadScript=(src,attr)=>{
    const load=()=>{
      if(document.querySelector('script['+attr+']')) return;
      const s=document.createElement('script');s.src=src;s.setAttribute(attr,'1');document.body.appendChild(s);
    };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load,{once:true}); else load();
  };
  loadScript('/ride-otp-completion-fix.js?v='+V,'data-dbest-ride-otp-fix');
  if(/\/vaahak(?:\.html)?\/?$/i.test(location.pathname)){
    loadScript('/vaahak-completed-dashboard-final.js?v='+V,'data-dbest-completed-final');
    loadScript('/vaahak-nearest-dispatch.js?v='+V,'data-dbest-nearest-dispatch');
    loadScript('/vaahak-marketplace-sync-ui.js?v='+V,'data-dbest-marketplace-sync-ui');
  }

  // Final production layers load after all legacy application scripts.
  const loadFinalLayers=()=>{
    const add=(src,attr)=>{if(document.querySelector('script['+attr+']'))return;const s=document.createElement('script');s.src=src;s.setAttribute(attr,'1');document.body.appendChild(s)};
    add('/owner-control-live.js?v='+V,'data-dbest-owner-control-live');
    add('/cab-location-production-v9.js?v='+V,'data-dbest-cab-location-v9');
    add('/mappls-cab-production.js?v='+V,'data-dbest-mappls-cab');
    add('/owner-deeplink-all-sections.js?v='+V,'data-dbest-owner-deeplinks-all');
  };
  if(document.readyState==='complete') loadFinalLayers();
  else window.addEventListener('load',loadFinalLayers,{once:true});
})();
