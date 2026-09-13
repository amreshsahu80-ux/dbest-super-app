(function(){
'use strict';
const V='20260914-mobile-smooth-v2';
if(window.DBEST_PERFORMANCE_BOOTSTRAP?.version===V)return;

const EARLY=['cab-entry-capture-final-v1.js','ux-performance-bridge.js'];
const CORE=[
  'member-id-collision-fix.js','backend-bridge.js','member-live-login-bridge.js',
  'production-demo-auth-guard.js','onboarding-contact-policy.js',
  'multilingual-ui-v2.js','language-selector-fix.js',
  'clean-member-flow.js','plain-language-ui.js'
];

const GROUPS={
  member:[
    'transaction-ledger-live.js','member-transaction-ledger-visible.js',
    'payout-rules-v1.js','payout-reset-v2.js','payout-engine-v2.js','member-earnings-visible.js',
    'member-wallet-summary-ui-v1.js','wallet-dashboard-scope-v1.js','wallet-button-visibility-v2.js',
    'transaction-table-pagination-v1.js','member-dashboard-table-performance-v1.js','member-dashboard-live-summary-v1.js',
    'transaction-invoice-receipt-v1.js'
  ],
  visual:[
    'finance-insurance-showcase.js','showcase-live-admin.js','visual-first-partner-tiles.js','top-live-location-bridge.js'
  ],
  owner:[
    'owner-auth-bridge.js','owner-portal-route.js','owner-live-network-bridge.js',
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
    'marketplace-secure-session-v1.js','marketplace-vaahak-live-v2.js','marketplace-live-catalog-authority.js',
    'marketplace-minimum-order-ux.js','marketplace-live-order-submit-final.js','marketplace-cart-quantity-v1.js',
    'marketplace-customer-stage-wording-fix.js','customer-marketplace-my-orders.js','marketplace-completion-green.js',
    'marketplace-delivery-rules.js','marketplace-delivery-order-display.js','marketplace-master-cart.js',
    'marketplace-pay-at-delivery-v2.js','marketplace-pay-at-delivery-hardening-v1.js',
    'marketplace-checkout-button-bridge-v1.js','razorpay-master-market-v1.js','razorpay-master-checkout-final-v1.js'
  ],
  service:[
    'service-variable-pricing-v1.js','service-request-live-bridge.js','service-document-upload-bridge.js','service-payment-sync-bridge.js',
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
const groupPromises=new Map();
function srcFor(name){return './'+name+'?v='+encodeURIComponent(V)}
function preloadOne(name){
  try{
    if(CAB_LEGACY_BLOCKED.has(name)||document.querySelector('link[data-dbest-preload="'+name+'"]'))return;
    const l=document.createElement('link');l.rel='preload';l.as='script';l.href=srcFor(name);l.dataset.dbestPreload=name;document.head.appendChild(l)
  }catch(_){ }
}
function preloadGroup(name){(GROUPS[name]||[]).forEach(preloadOne)}
function loadOne(name){
  if(CAB_LEGACY_BLOCKED.has(name))return Promise.resolve();
  if(loaded.has(name))return loaded.get(name);
  const existing=Array.from(document.scripts).find(s=>String(s.src||'').includes('/'+name));
  if(existing){const p=Promise.resolve();loaded.set(name,p);return p}
  const p=new Promise(resolve=>{
    const s=document.createElement('script');
    s.src=srcFor(name);s.async=true;s.dataset.dbestPerfAsset=name;
    s.onload=()=>resolve();
    s.onerror=()=>{console.warn('DBest deferred asset failed:',name);resolve()};
    (document.body||document.documentElement).appendChild(s)
  });
  loaded.set(name,p);return p
}
async function loadSequence(list){for(const name of list)await loadOne(name)}

let corePromise=null;
function startCore(){
  if(!corePromise)corePromise=(async()=>{
    await Promise.all(EARLY.map(loadOne));
    await loadSequence(CORE);
  })().catch(e=>console.warn('DBest core bootstrap warning',e));
  return corePromise
}
function startGroup(name){
  if(!GROUPS[name])return Promise.resolve();
  if(groupPromises.has(name))return groupPromises.get(name);
  const p=(async()=>{await startCore();await loadSequence(GROUPS[name])})()
    .catch(e=>console.warn('DBest feature group warning',name,e));
  groupPromises.set(name,p);return p;
}
function startFeatures(){return Object.keys(GROUPS).reduce((p,n)=>p.then(()=>startGroup(n)),Promise.resolve())}
function inferGroup(el){
  if(!el)return null;
  const node=el.closest?.('.tile,.sub,.card,button,a,[onclick]')||el;
  const cls=String(node.className||'').toLowerCase();
  const txt=String(node.textContent||'').toLowerCase();
  const all=cls+' '+txt;
  if(/my dashboard|dashboard|my wallet|earnings|team|transactions|my profile|invoice|receipt/.test(all))return 'member';
  if(/service-car|\bcab\b|\bride\b|rental|taxi/.test(all))return 'rideOps';
  if(/service-insurance|service-flights|service-travel|insurance|flight|hotel|package|visa/.test(all))return 'visual';
  if(/service-store|marketplace|grocery|shopping|cart|my orders|order|checkout/.test(all))return 'marketplace';
  if(/service-jobs|service-repair|service-govt|home jobs|hyperlocal|repair|local service|pan|itr|driving licence/.test(all))return 'service';
  if(/\bvendor\b|seller|merchant/.test(all))return 'vendor';
  if(/vaahak|delivery partner|driver partner/.test(all))return 'vaahak';
  if(/project owner|super admin|owner console|owner dashboard/.test(all))return 'owner';
  return null;
}
function interactionHint(e){
  const g=inferGroup(e.target);
  if(g){preloadGroup(g);startGroup(g)}
}
document.addEventListener('pointerdown',interactionHint,{capture:true,passive:true});
document.addEventListener('focusin',interactionHint,{capture:true,passive:true});

function scheduleVisualWarmup(){
  const warm=()=>{
    if(document.visibilityState!=='visible')return;
    if(document.querySelector('.classicDash,.sectionContent.fullPageBody'))return;
    preloadGroup('visual');
  };
  setTimeout(()=>{
    if('requestIdleCallback' in window)requestIdleCallback(warm,{timeout:5000});
    else warm();
  },20000);
}
function maybePreloadMember(){
  try{
    const s=JSON.parse(localStorage.getItem('d2_session')||'{}');
    if(!(s&&s.role&&s.role!=='visitor'&&s.id))return;
    const warm=()=>{
      if(document.visibilityState!=='visible')return;
      if(document.querySelector('.classicDash,.sectionContent.fullPageBody'))return;
      preloadGroup('member');
    };
    setTimeout(()=>{
      if('requestIdleCallback' in window)requestIdleCallback(warm,{timeout:6000});
      else warm();
    },8000);
  }catch(_){ }
}
const normalize=()=>{try{document.documentElement.style.webkitTextSizeAdjust='100%';document.documentElement.style.textSizeAdjust='100%';document.body?.classList.add('dbest-uniform-runtime')}catch(_){}};
function boot(){normalize();startCore();maybePreloadMember();scheduleVisualWarmup()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.DBEST_PERFORMANCE_BOOTSTRAP={version:V,startCore,startGroup,startFeatures,groups:Object.keys(GROUPS),legacyCabBlocked:[...CAB_LEGACY_BLOCKED]};
})();