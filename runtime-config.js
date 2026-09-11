window.DBEST_RUNTIME_CONFIG = Object.freeze({
  supabaseUrl: "https://ydedmotbacnllkijzmvp.supabase.co",
  supabasePublishableKey: "sb_publishable_qWqQExdtL5ddWcK_yLCcNA__-ZUBtox",
  mapplsStaticKey: "yukntloynujcqkanhyuzmvnksznhvwvndcdg",
  googleMapsApiKey: "",
  integrationBranch: "backend-integration"
});

(function(){
  const V='20260911-owner-review-files-v1';

  const applyRuntimeSecrets=()=>{
    const sec=window.DBEST_RUNTIME_SECRETS||{};
    const googleMapsApiKey=String(sec.googleMapsApiKey||'').trim();
    window.DBEST_RUNTIME_CONFIG=Object.freeze(Object.assign({},window.DBEST_RUNTIME_CONFIG||{}, {googleMapsApiKey}));
  };
  const loadRuntimeSecrets=()=>new Promise(resolve=>{
    let finished=false;
    const finish=()=>{if(finished)return;finished=true;try{applyRuntimeSecrets()}catch(_){}resolve(window.DBEST_RUNTIME_CONFIG)};
    const existing=document.querySelector('script[data-dbest-runtime-secrets]');
    if(existing){if(existing.dataset.loaded==='1')return finish();existing.addEventListener('load',finish,{once:true});existing.addEventListener('error',finish,{once:true});setTimeout(finish,1200);return}
    const s=document.createElement('script');s.src='/api/runtime-config?v='+encodeURIComponent(V);s.async=true;s.setAttribute('data-dbest-runtime-secrets','1');s.onload=()=>{s.dataset.loaded='1';finish()};s.onerror=finish;(document.head||document.documentElement).appendChild(s);setTimeout(finish,1600)
  });
  const googleConfigured=()=>String(window.DBEST_RUNTIME_CONFIG?.googleMapsApiKey||'').trim().length>0;

  const installLogoClarity=()=>{
    if(document.getElementById('dbestLogoClarityStyle')) return;
    const s=document.createElement('style');s.id='dbestLogoClarityStyle';s.textContent=`
      img[src*="dbest-logo.png"],.dbestTopLogo,.dbestFinalLogo{image-rendering:auto!important;object-fit:contain!important;opacity:1!important;filter:contrast(1.08) saturate(1.08) drop-shadow(0 3px 7px rgba(21,72,165,.16))!important;transform:none!important}
      .brand{background:#fff!important;border:1px solid #e1e8f3!important;border-radius:16px!important;padding:3px 9px!important;box-shadow:0 5px 14px rgba(22,51,99,.08)!important;overflow:visible!important}
      .dbestTopLogo{width:225px!important;height:70px!important;max-width:none!important;display:block!important;object-position:left center!important}
      .dbestFinalLogoBox{min-height:66px!important;min-width:220px!important;padding:3px 10px!important;border:1px solid #d7e0ef!important;border-radius:14px!important;background:#fff!important;box-shadow:0 6px 16px rgba(16,44,94,.12)!important;overflow:visible!important}
      .dbestFinalLogo{width:210px!important;height:58px!important;max-height:58px!important;display:block!important;object-position:left center!important}
      @media(max-width:700px){.brand{padding:2px 7px!important;border-radius:13px!important}.dbestTopLogo{width:168px!important;height:54px!important}.dbestFinalLogoBox{min-width:160px!important;min-height:54px!important;padding:2px 7px!important}.dbestFinalLogo{width:154px!important;height:48px!important;max-height:48px!important}}
      @media print{.dbestFinalLogoBox{box-shadow:none!important;border:1px solid #d7e0ef!important}.dbestFinalLogo{filter:contrast(1.08) saturate(1.08)!important}}
    `;document.head.appendChild(s)
  };
  installLogoClarity();

  const loadScript=(src,attr)=>{
    const load=()=>{if(document.querySelector('script['+attr+']'))return;const s=document.createElement('script');s.src=src;s.async=true;s.setAttribute(attr,'1');(document.body||document.documentElement).appendChild(s)};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load()
  };
  const loadScriptAsync=(src,attr)=>new Promise((resolve,reject)=>{
    const existing=document.querySelector('script['+attr+']');
    if(existing){if(existing.dataset.loaded==='1')return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}
    const s=document.createElement('script');s.src=src;s.async=true;s.setAttribute(attr,'1');s.onload=()=>{s.dataset.loaded='1';resolve()};s.onerror=reject;(document.body||document.documentElement).appendChild(s)
  });

  if(/\/vaahak(?:\.html)?\/?$/i.test(location.pathname)){
    loadScript('/vaahak-registration-photo.js?v='+V,'data-dbest-vaahak-registration-photo');
    loadScript('/vaahak-completed-dashboard-final.js?v='+V,'data-dbest-completed-final');
    loadScript('/vaahak-nearest-dispatch.js?v='+V,'data-dbest-nearest-dispatch');
    loadScript('/vaahak-marketplace-sync-ui.js?v='+V,'data-dbest-marketplace-sync-ui');
    loadScript('/vaahak-agreement-dashboard-entry.js?v='+V,'data-dbest-vaahak-agreement-dashboard-entry');
    loadScript('/vaahak-visual-profile-ui.js?v='+V,'data-dbest-vaahak-visual-profile');
  }
  if(/\/vendor(?:\.html)?\/?$/i.test(location.pathname))loadScript('/vendor-clean-catalog-tools.js?v='+V,'data-dbest-vendor-clean-catalog-tools');
  if(/\/owner-live-onboarding\.html\/?$/i.test(location.pathname))loadScript('/owner-review-files-v1.js?v='+V,'data-dbest-owner-review-files-v1');

  const loadFinalLayers=async()=>{
    installLogoClarity();
    loadScript('/owner-control-live.js?v='+V,'data-dbest-owner-control-live');
    loadScript('/owner-payout-percentage-matrix.js?v='+V,'data-dbest-owner-payout-percentage-matrix');
    loadScript('/payout-subsection-labels.js?v='+V,'data-dbest-payout-subsection-labels');
    loadScript('/payout-engine-production-hardening.js?v='+V,'data-dbest-payout-engine-hardening');
    loadScript('/owner-payout-entry-visible.js?v='+V,'data-dbest-owner-payout-entry-visible');
    loadScript('/owner-deeplink-all-sections.js?v='+V,'data-dbest-owner-deeplinks-all');
    loadScript('/transaction-capture-universal.js?v='+V,'data-dbest-transaction-universal');
    loadScript('/transaction-final-cleanup.js?v='+V,'data-dbest-transaction-final-cleanup');
    loadScript('/owner-section-visibility-control.js?v='+V,'data-dbest-owner-section-visibility');
    loadScript('/external-success-claims.js?v='+V,'data-dbest-external-success-claims');
    loadScript('/member-id-card-production-final.js?v='+V,'data-dbest-member-id-card-final');
    loadScript('/vendor-agreement-email-otp.js?v='+V,'data-dbest-vendor-agreement-email-otp');
    loadScript('/vaahak-agreement-email-otp.js?v='+V,'data-dbest-vaahak-agreement-email-otp');
    loadScript('/partner-kyc-owner-signing.js?v='+V,'data-dbest-partner-kyc-owner-signing');
    loadScript('/partner-kyc-self-service.js?v='+V,'data-dbest-partner-kyc-self-service');
    loadScript('/owner-partner-kyc-center.js?v='+V,'data-dbest-owner-partner-kyc-center');
    loadScript('/partner-kyc-owner-display-v2.js?v='+V,'data-dbest-partner-kyc-owner-display-v2');
    loadScript('/partner-kyc-registration-upload-v2.js?v='+V,'data-dbest-partner-kyc-registration-upload-v2');
    loadScript('/service-secure-doc-status-fix.js?v='+V,'data-dbest-service-secure-doc-status');
    loadScript('/vendor-multi-catalog-submit.js?v='+V,'data-dbest-vendor-multi-catalog');
    loadScript('/vendor-growth-ui.js?v='+V,'data-dbest-vendor-growth-ui');
    loadScript('/vendor-growth-scope-fix.js?v='+V,'data-dbest-vendor-growth-scope-fix');
    loadScript('/vendor-catalog-ux-fix.js?v='+V,'data-dbest-vendor-catalog-ux-fix');
    loadScript('/vendor-image-storage-v2.js?v='+V,'data-dbest-vendor-image-storage-v2');
    loadScript('/vendor-promotion-ux-fix.js?v='+V,'data-dbest-vendor-promotion-ux-fix');
    loadScript('/vendor-promotion-store-scope-fix.js?v='+V,'data-dbest-vendor-promotion-store-scope-fix');
    loadScript('/marketplace-master-cart.js?v='+V,'data-dbest-marketplace-master-cart');
    loadScript('/marketplace-master-ui-fix.js?v='+V,'data-dbest-marketplace-master-ui-fix');
    loadScript('/customer-active-vaahak-visual.js?v='+V,'data-dbest-customer-vaahak-visual');
    loadScript('/ride-live-ui-finalizer.js?v='+V,'data-dbest-ride-live-ui-finalizer-v2');
    loadScript('/home-jobs-hyperlocal.js?v='+V,'data-dbest-home-jobs-hyperlocal');
    loadScript('/service-partner-free-account.js?v='+V,'data-dbest-service-partner-free-account');
    loadScript('/service-partner-standalone-route.js?v='+V,'data-dbest-service-partner-standalone-route');
    loadScript('/service-partner-job-execution.js?v='+V,'data-dbest-service-partner-job-execution');
    loadScript('/platform-concise-ui.js?v='+V,'data-dbest-platform-concise-ui');

    if(googleConfigured()&&/\/vendor(?:\.html)?\/?$/i.test(location.pathname)){
      try{await loadScriptAsync('/vendor-google-location-v1.js?v='+V,'data-dbest-vendor-google-location-v1')}catch(e){console.warn('DBest vendor Google location warning',e)}
    }
    if(googleConfigured()&&/\/vaahak(?:\.html)?\/?$/i.test(location.pathname)){
      try{await loadScriptAsync('/vaahak-google-live-map-v1.js?v='+V,'data-dbest-vaahak-google-map-v1')}catch(e){console.warn('DBest Vaahak Google map warning',e)}
    }
  };

  let finalStarted=false;
  const startFinalLayers=()=>{if(finalStarted)return;finalStarted=true;loadFinalLayers().catch(e=>console.warn('DBest final layer warning',e))};
  const scheduleFinalLayers=()=>{
    if('requestIdleCallback' in window)requestIdleCallback(startFinalLayers,{timeout:1000});
    else setTimeout(startFinalLayers,550)
  };

  const runtimeReady=loadRuntimeSecrets();
  window.DBEST_RUNTIME_READY=runtimeReady;
  runtimeReady.finally(()=>{
    if(document.readyState==='complete')scheduleFinalLayers();
    else window.addEventListener('load',scheduleFinalLayers,{once:true})
  });
  window.addEventListener('dbest:need-runtime-layers',startFinalLayers);
})();