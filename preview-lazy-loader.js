(function(){
  const BUILD='20260831-1812-preview-speed-v3';
  const groups={
    showcase:['finance-insurance-showcase.js','showcase-live-admin.js','visual-first-partner-tiles.js'],
    owner:['owner-clean-controls.js','owner-report-center.js','owner-core-fix.js','owner-report-launcher-fix.js','owner-partner-onboarding-fix.js','owner-report-visibility-v2.js','owner-master-excel-download-fix.js','owner-partner-section-visuals-link.js','super-admin-command-center.js'],
    marketplace:['marketplace-live-catalog-authority.js','marketplace-minimum-order-ux.js','marketplace-live-order-submit-final.js','marketplace-cart-quantity-v1.js','marketplace-customer-stage-wording-fix.js','customer-marketplace-my-orders.js','marketplace-completion-green.js','marketplace-delivery-rules.js','marketplace-delivery-order-display.js'],
    hyperlocal:['top-live-location-bridge.js','clean-member-flow.js','plain-language-ui.js','service-partner-hyperlocal.js','hyperlocal-backend-live.js','home-jobs-section-finalizer.js'],
    vendor:['vendor-existing-live-upgrade.js','vendor-direct-catalog-finalizer.js','vendor-delivery-location.js','vendor-mobile-image-upload-fix.js'],
    vaahak:['vaahak-portal-bridge.js','vaahak-live-bridge.js','vaahak-legacy-login-bridge.js','vaahak-entry-fix.js','vaahak-floating-button-hide.js','vaahak-standalone-route.js','partner-pin-reset-bridge.js','partner-self-pin-bridge.js','vaahak-owner-live-unify.js','vaahak-security-patch.js','vaahak-live-dashboard-stable.js','vaahak-pin-focus-guard.js','vaahak-ride-interaction-final.js','marketplace-vaahak-live-v2.js','nearest-vaahak-dispatch.js','vaahak-live-rate-bridge.js','vaahak-owner-approval-final.js']
  };
  const loaded=new Set();
  function loadOne(file){return new Promise(resolve=>{const s=document.createElement('script');s.src='./'+file+'?v='+BUILD;s.async=true;s.onload=s.onerror=resolve;document.body.appendChild(s)})}
  async function loadGroup(name){if(!groups[name]||loaded.has(name))return;loaded.add(name);for(const file of groups[name]){await loadOne(file);await new Promise(r=>setTimeout(r,80))}window.dispatchEvent(new CustomEvent('dbest:optional-ready',{detail:{group:name}}))}
  function optimizeMedia(){
    document.querySelectorAll('video.tileVideo').forEach(v=>{try{v.pause()}catch(e){}v.removeAttribute('autoplay');v.preload='none';if(v.src){v.removeAttribute('src');try{v.load()}catch(e){}}});
    document.querySelectorAll('img').forEach(img=>{if(img.classList.contains('dbestTopLogo')){img.loading='eager';img.decoding='async';try{img.fetchPriority='high'}catch(e){}}else{img.loading='lazy';img.decoding='async';try{img.fetchPriority='low'}catch(e){}}});
  }
  optimizeMedia();
  window.DBEST_LOAD_OPTIONAL=loadGroup;
  window.DBEST_PREVIEW_PERF={build:BUILD,mode:'event-lazy',cabEnhancementsLoaded:false,backgroundAutoload:false};
  document.addEventListener('click',function(e){
    const t=e.target.closest&&e.target.closest('button,.tile,a');if(!t)return;
    if(t.closest('.service-store'))setTimeout(()=>loadGroup('marketplace'),250);
    else if(t.closest('.service-insurance')||t.closest('.service-travel')||t.closest('.service-flights'))setTimeout(()=>loadGroup('showcase'),250);
    else if(t.closest('.service-jobs')||t.closest('.service-repair'))setTimeout(()=>loadGroup('hyperlocal'),250);
    const txt=(t.textContent||'').toLowerCase();
    if(txt.includes('owner')||txt.includes('super admin'))setTimeout(()=>loadGroup('owner'),250);
    if(txt.includes('vendor'))setTimeout(()=>loadGroup('vendor'),250);
    if(txt.includes('vaahak'))setTimeout(()=>loadGroup('vaahak'),250);
  },true);
})();