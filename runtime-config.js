window.DBEST_RUNTIME_CONFIG = Object.freeze({
  supabaseUrl: "https://ydedmotbacnllkijzmvp.supabase.co",
  supabasePublishableKey: "sb_publishable_qWqQExdtL5ddWcK_yLCcNA__-ZUBtox",
  mapplsStaticKey: "yukntloynujcqkanhyuzmvnksznhvwvndcdg",
  integrationBranch: "backend-integration"
});

(function(){
  const V='20260829-0705-vendor-catalog-tools';

  const installLogoClarity=()=>{
    if(document.getElementById('dbestLogoClarityStyle')) return;
    const s=document.createElement('style');
    s.id='dbestLogoClarityStyle';
    s.textContent=`
      img[src*="dbest-logo.png"],.dbestTopLogo,.dbestFinalLogo{image-rendering:auto!important;object-fit:contain!important;opacity:1!important;filter:contrast(1.08) saturate(1.08) drop-shadow(0 3px 7px rgba(21,72,165,.16))!important;transform:none!important}
      .brand{background:#fff!important;border:1px solid #e1e8f3!important;border-radius:16px!important;padding:3px 9px!important;box-shadow:0 5px 14px rgba(22,51,99,.08)!important;overflow:visible!important}
      .dbestTopLogo{width:225px!important;height:70px!important;max-width:none!important;display:block!important;object-position:left center!important}
      .dbestFinalLogoBox{min-height:66px!important;min-width:220px!important;padding:3px 10px!important;border:1px solid #d7e0ef!important;border-radius:14px!important;background:#fff!important;box-shadow:0 6px 16px rgba(16,44,94,.12)!important;overflow:visible!important}
      .dbestFinalLogo{width:210px!important;height:58px!important;max-height:58px!important;display:block!important;object-position:left center!important}
      @media(max-width:700px){.brand{padding:2px 7px!important;border-radius:13px!important}.dbestTopLogo{width:168px!important;height:54px!important}.dbestFinalLogoBox{min-width:160px!important;min-height:54px!important;padding:2px 7px!important}.dbestFinalLogo{width:154px!important;height:48px!important;max-height:48px!important}}
      @media print{.dbestFinalLogoBox{box-shadow:none!important;border:1px solid #d7e0ef!important}.dbestFinalLogo{filter:contrast(1.08) saturate(1.08)!important}}
    `;
    document.head.appendChild(s);
  };
  installLogoClarity();

  const loadScript=(src,attr)=>{
    const load=()=>{if(document.querySelector('script['+attr+']')) return;const s=document.createElement('script');s.src=src;s.setAttribute(attr,'1');document.body.appendChild(s)};
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',load,{once:true}); else load();
  };
  const loadScriptAsync=(src,attr)=>new Promise((resolve,reject)=>{
    const existing=document.querySelector('script['+attr+']');
    if(existing){if(existing.dataset.loaded==='1') return resolve();existing.addEventListener('load',()=>resolve(),{once:true});existing.addEventListener('error',reject,{once:true});setTimeout(resolve,1200);return}
    const s=document.createElement('script');s.src=src;s.setAttribute(attr,'1');s.onload=()=>{s.dataset.loaded='1';resolve()};s.onerror=reject;document.body.appendChild(s);
  });

  loadScript('/cab-rental-legacy-bridge.js?v='+V,'data-dbest-rental-legacy-bridge');
  loadScript('/cab-booking-flow-fix.js?v='+V,'data-dbest-cab-booking-flow-fix');

  if(/\/vaahak(?:\.html)?\/?$/i.test(location.pathname)){
    loadScript('/vaahak-registration-photo.js?v='+V,'data-dbest-vaahak-registration-photo');
    loadScript('/vaahak-completed-dashboard-final.js?v='+V,'data-dbest-completed-final');
    loadScript('/vaahak-nearest-dispatch.js?v='+V,'data-dbest-nearest-dispatch');
    loadScript('/vaahak-marketplace-sync-ui.js?v='+V,'data-dbest-marketplace-sync-ui');
    loadScript('/vaahak-agreement-dashboard-entry.js?v='+V,'data-dbest-vaahak-agreement-dashboard-entry');
    loadScript('/vaahak-visual-profile-ui.js?v='+V,'data-dbest-vaahak-visual-profile');
  }

  if(/\/vendor(?:\.html)?\/?$/i.test(location.pathname)){
    loadScript('/vendor-clean-catalog-tools.js?v='+V,'data-dbest-vendor-clean-catalog-tools');
  }

  const lockFinalCab=()=>{const finalCab=window.DBEST_CAB_MAPPLS_RENTAL;if(finalCab&&typeof finalCab.open==='function'){window.openRidePlatform=finalCab.open;window.DBEST_ACTIVE_CAB_VERSION='MAPPLS_RENTAL_V2';return true}return false};

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

    try{await loadScriptAsync('/cab-location-production-v9.js?v='+V,'data-dbest-cab-location-v9');await loadScriptAsync('/mappls-cab-production.js?v='+V,'data-dbest-mappls-cab');await loadScriptAsync('/cab-mappls-rental-v2.js?v='+V,'data-dbest-cab-mappls-rental-v2');await loadScriptAsync('/cab-booking-step-fix.js?v='+V,'data-dbest-cab-booking-step-fix')}catch(e){console.warn('DBest final cab layer load warning',e)}

    lockFinalCab();let attempts=0;const guard=setInterval(()=>{attempts++;lockFinalCab();if(attempts>=30) clearInterval(guard)},500);
  };

  if(document.readyState==='complete') loadFinalLayers();else window.addEventListener('load',loadFinalLayers,{once:true});
})();