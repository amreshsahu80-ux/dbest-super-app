(function(){
'use strict';
const V='20260907-uniform-performance-v1';
if(window.DBEST_PERFORMANCE_BOOTSTRAP?.version===V)return;

const CORE=[
  'member-id-collision-fix.js','backend-bridge.js','member-live-login-bridge.js',
  'owner-auth-bridge.js','owner-portal-route.js','owner-live-network-bridge.js',
  'ux-performance-bridge.js','production-demo-auth-guard.js','onboarding-contact-policy.js',
  'multilingual-ui-v2.js','language-selector-fix.js','payout-rules-v1.js','payout-reset-v2.js',
  'payout-engine-v2.js','transaction-ledger-live.js','member-transaction-ledger-visible.js',
  'member-earnings-visible.js','platform-footer-legal.js','top-live-location-bridge.js',
  'clean-member-flow.js','plain-language-ui.js','finance-insurance-showcase.js',
  'showcase-live-admin.js','visual-first-partner-tiles.js','cab-entry-capture-final-v1.js',
  'security-inactivity-timeout-v1.js'
];

const GROUPS={
  owner:[
    'owner-clean-controls.js','owner-report-center.js','owner-core-fix.js',
    'owner-report-launcher-fix.js','owner-partner-onboarding-fix.js','owner-report-visibility-v2.js',
    'owner-master-excel-download-fix.js','owner-partner-section-visuals-link.js','super-admin-command-center.js'
  ],
  vaahak:[
    'vaahak-portal-bridge.js','vaahak-live-bridge.js','vaahak-legacy-login-bridge.js','vaahak-entry-fix.js',
    'vaahak-floating-button-hide.js','vaahak-standalone-route.js','partner-pin-reset-bridge.js',
    'partner-self-pin-bridge.js','vaahak-owner-live-unify.js','vaahak-security-patch.js',
    'vaahak-live-dashboard-stable.js','vaahak-pin-focus-guard.js','vaahak-ride-interaction-final.js',
    'nearest-vaahak-dispatch.js','vaahak-live-rate-bridge.js','vaahak-freedom-model.js','vaahak-owner-approval-final.js'
  ],
  marketplace:[
    'marketplace-vaahak-live-v2.js','marketplace-live-catalog-authority.js','marketplace-minimum-order-ux.js',
    'marketplace-live-order-submit-final.js','marketplace-cart-quantity-v1.js','marketplace-customer-stage-wording-fix.js',
    'customer-marketplace-my-orders.js','marketplace-completion-green.js','marketplace-delivery-rules.js',
    'marketplace-delivery-order-display.js'
  ],
  service:[
    'service-request-live-bridge.js','service-document-upload-bridge.js','service-payment-sync-bridge.js',
    'dual-payment-options-live.js','merchant-upi-direct-v1.js','registration-payment-dedupe-v1.js',
    'service-partner-hyperlocal.js','hyperlocal-backend-live.js','home-jobs-section-finalizer.js'
  ],
  vendor:[
    'vendor-existing-live-upgrade.js','vendor-direct-catalog-finalizer.js','vendor-delivery-location.js',
    'vendor-mobile-image-upload-fix.js'
  ],
  rideOps:[
    'ride-otp-completion-fix.js','ride-cancel-customer-bridge.js','member-ride-history-bridge.js',
    'ride-coordinate-persistence-fix.js','ride-contact-call-buttons.js','member-transaction-excel-download.js'
  ]
};

const CAB_LEGACY_BLOCKED=new Set([
  'ui-cab-enhancements.js','ride-exact-location-bridge.js','ride-suggestion-layout-fix.js','ride-ui-cleanup-v4.js',
  'ride-routing-fix-v5.js','cab-experience-final.js','cab-language-layer.js','cab-live-navigation.js',
  'cab-ui-stability-final.js','mappls-cab-production.js','cab-rental-legacy-bridge.js','cab-booking-flow-fix.js',
  'cab-booking-step-fix.js','cab-erickshaw-other-rider.js','cab-mappls-rental-v2.js','cab-modern-ui-v1.js',
  'cab-planned-ui-v2.js'
]);

const loaded=new Map();
function srcFor(name){return './'+name+'?v='+encodeURIComponent(V)}
function loadOne(name){
  if(CAB_LEGACY_BLOCKED.has(name))return Promise.resolve();
  if(loaded.has(name))return loaded.get(name);
  const existing=Array.from(document.scripts).find(s=>String(s.src||'').includes('/'+name));
  if(existing){const p=Promise.resolve();loaded.set(name,p);return p}
  const p=new Promise(resolve=>{
    const s=document.createElement('script');s.src=srcFor(name);s.async=true;s.dataset.dbestPerfAsset=name;
    s.onload=()=>resolve();s.onerror=()=>{console.warn('DBest deferred asset failed:',name);resolve()};
    (document.body||document.documentElement).appendChild(s)
  });
  loaded.set(name,p);return p
}
async function loadSequence(list){for(const name of list)await loadOne(name)}

let corePromise=null,featuresPromise=null;
function startCore(){
  if(!corePromise)corePromise=loadSequence(CORE).catch(e=>console.warn('DBest core bootstrap warning',e));
  return corePromise
}
function startFeatures(){
  if(!featuresPromise)featuresPromise=(async()=>{
    await startCore();
    await Promise.all(Object.values(GROUPS).map(loadSequence));
  })().catch(e=>console.warn('DBest feature bootstrap warning',e));
  return featuresPromise
}
function scheduleFeatures(){
  const run=()=>startFeatures();
  if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:1200});
  else setTimeout(run,650)
}

const normalize=()=>{
  try{
    document.documentElement.style.webkitTextSizeAdjust='100%';
    document.documentElement.style.textSizeAdjust='100%';
    document.body?.classList.add('dbest-uniform-runtime');
  }catch(_){ }
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{normalize();startCore()},{once:true});
else{normalize();startCore()}
if(document.readyState==='complete')scheduleFeatures();else window.addEventListener('load',scheduleFeatures,{once:true});

window.DBEST_PERFORMANCE_BOOTSTRAP={version:V,startCore,startFeatures,groups:Object.keys(GROUPS),legacyCabBlocked:[...CAB_LEGACY_BLOCKED]};
})();