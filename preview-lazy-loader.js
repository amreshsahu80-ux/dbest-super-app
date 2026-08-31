(function(){
  const BUILD='20260831-1800-preview-lazyload-v2';
  const optional=[
    'finance-insurance-showcase.js','showcase-live-admin.js','visual-first-partner-tiles.js',
    'owner-clean-controls.js','owner-report-center.js','owner-core-fix.js','owner-report-launcher-fix.js','owner-partner-onboarding-fix.js','owner-report-visibility-v2.js','owner-master-excel-download-fix.js','owner-partner-section-visuals-link.js','super-admin-command-center.js',
    'marketplace-live-catalog-authority.js','marketplace-minimum-order-ux.js','marketplace-live-order-submit-final.js','marketplace-cart-quantity-v1.js','marketplace-customer-stage-wording-fix.js','customer-marketplace-my-orders.js','marketplace-completion-green.js','marketplace-delivery-rules.js','marketplace-delivery-order-display.js',
    'top-live-location-bridge.js','clean-member-flow.js','plain-language-ui.js','service-partner-hyperlocal.js','hyperlocal-backend-live.js','home-jobs-section-finalizer.js',
    'vendor-existing-live-upgrade.js','vendor-direct-catalog-finalizer.js','vendor-delivery-location.js','vendor-mobile-image-upload-fix.js',
    'vaahak-portal-bridge.js','vaahak-live-bridge.js','vaahak-legacy-login-bridge.js','vaahak-entry-fix.js','vaahak-floating-button-hide.js','vaahak-standalone-route.js','partner-pin-reset-bridge.js','partner-self-pin-bridge.js','vaahak-owner-live-unify.js','vaahak-security-patch.js','vaahak-live-dashboard-stable.js','vaahak-pin-focus-guard.js','vaahak-ride-interaction-final.js','marketplace-vaahak-live-v2.js','nearest-vaahak-dispatch.js','vaahak-live-rate-bridge.js','vaahak-owner-approval-final.js'
  ];
  function loadOne(file){
    return new Promise(resolve=>{
      const s=document.createElement('script');
      s.src='./'+file+'?v='+BUILD;
      s.async=false;
      s.onload=s.onerror=()=>resolve();
      document.body.appendChild(s);
    });
  }
  async function loadOptional(){
    for(const file of optional) await loadOne(file);
    window.DBEST_OPTIONAL_READY=true;
  }
  window.DBEST_PREVIEW_PERF={build:BUILD,mode:'lazy-noncab',cabEnhancementsLoaded:false};
  if('requestIdleCallback' in window) requestIdleCallback(loadOptional,{timeout:1800});
  else setTimeout(loadOptional,900);
})();