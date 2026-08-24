window.DBEST_RUNTIME_CONFIG = Object.freeze({
  ownerEmail: "amresh.sahu80@gmail.com",
  supabaseUrl: "https://ydedmotbacnllkijzmvp.supabase.co",
  supabasePublishableKey: "sb_publishable_qWqQExdtL5ddWcK_yLCcNA__-ZUBtox",
  integrationBranch: "backend-integration"
});

(function(){
  const V='20260824-0858-cab-pin-v9';
  const loadScript=(src,attr)=>{
    const load=()=>{
      if(document.querySelector('script['+attr+']')) return;
      const s=document.createElement('script');
      s.src=src;
      s.setAttribute(attr,'1');
      document.body.appendChild(s);
    };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load,{once:true}); else load();
  };
  loadScript('./ride-otp-completion-fix.js?v='+V,'data-dbest-ride-otp-fix');
  if(/\/vaahak(?:\.html)?\/?$/i.test(location.pathname)){
    loadScript('./vaahak-completed-dashboard-final.js?v='+V,'data-dbest-completed-final');
    loadScript('./vaahak-nearest-dispatch.js?v='+V,'data-dbest-nearest-dispatch');
    loadScript('./vaahak-marketplace-sync-ui.js?v='+V,'data-dbest-marketplace-sync-ui');
  }

  // Production cab location layer must load after all legacy ride scripts so
  // its exact map-pin pickup/drop flow remains the final openRidePlatform handler.
  const loadCabV9=()=>{
    if(document.querySelector('script[data-dbest-cab-location-v9]')) return;
    const s=document.createElement('script');
    s.src='./cab-location-production-v9.js?v='+V;
    s.setAttribute('data-dbest-cab-location-v9','1');
    document.body.appendChild(s);
  };
  if(document.readyState==='complete') loadCabV9();
  else window.addEventListener('load',loadCabV9,{once:true});
})();
