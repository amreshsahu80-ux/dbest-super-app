(function(){
'use strict';
const VERSION='20260930-user-runtime-authority-v3-stable';
if(window.DBEST_USER_RUNTIME_AUTHORITY?.version===VERSION)return;
if(/^\/owner\/?$/i.test(location.pathname))return;

let busy=false,timer=null,lastService='',lastAppliedAt=0;
function currentService(){
  const root=document.querySelector('#m .sectionOverlay .sectionContent');
  if(!root)return'';
  const explicit=root.dataset.dbestServiceId||'';
  if(explicit)return explicit;
  const hero=String(root.querySelector('.sectionHero b')?.textContent||'').toLowerCase();
  if(/insurance|बीमा|বীমা|ବୀମା|బీమా|காப்பீ/.test(hero))return'insurance';
  if(/flight|फ्लाइट|ফ্লাইট|ଫ୍ଲାଇଟ|ఫ్లైట్|விமான/.test(hero))return'flights';
  if(/mutual|म्यूचुअल|মিউচু|ମ୍ୟୁଚୁ|మ్యూచు|மியூச்சு/.test(hero))return'mf';
  return'';
}
async function apply(){
  if(busy)return;
  const now=Date.now();if(now-lastAppliedAt<120)return;lastAppliedAt=now;busy=true;
  try{
    try{window.DBEST_I18N?.apply?.()}catch(_){}
    try{window.DBEST_USER_I18N?.apply?.()}catch(_){}
    const id=currentService()||lastService;
    if(id&&['insurance','flights','mf'].includes(id)){
      lastService=id;
      try{await window.DBEST_USER_SHOWCASE_SAFE?.render?.(id)}catch(_){}
      try{window.DBEST_UNIVERSAL_DEEPLINKS?.apply?.()}catch(_){}
      try{window.DBEST_I18N?.apply?.()}catch(_){}
      try{window.DBEST_USER_I18N?.apply?.()}catch(_){}
    }
  }finally{busy=false}
}
function schedule(delay=24){
  clearTimeout(timer);timer=setTimeout(apply,delay);
}
function wrap(name){
  const fn=window[name];
  if(typeof fn!=='function'||fn.__dbestAuthorityWrapped)return;
  const w=function(){
    const args=[...arguments];
    if(name==='openService'&&args[0])lastService=String(args[0]);
    const out=fn.apply(this,args);
    schedule(24);
    return out;
  };
  w.__dbestAuthorityWrapped=true;window[name]=w;
}
function install(){
  ['sectionScreen','openService','openRidePlatform','showRideOptions','confirmRide','openCommerceHub','openMarketplace','openContentForm','paymentReview','txDetailsView','rideStatusScreen'].forEach(wrap);
  schedule(0);
}
let n=0,iv=setInterval(()=>{n++;install();if(window.openService?.__dbestAuthorityWrapped||n>20)clearInterval(iv)},150);
const host=document.getElementById('m')||document.body;
new MutationObserver(records=>{if(document.querySelector('.classicDash'))return;const id=currentService();if(!['insurance','flights','mf'].includes(id))return;for(const r of records){if(r.addedNodes?.length||r.removedNodes?.length){schedule(90);break}}}).observe(host,{childList:true,subtree:true});
document.addEventListener('change',e=>{if(e.target?.id==='lang'){schedule(0);setTimeout(apply,120)}},true);
window.addEventListener('pageshow',()=>schedule(0));
install();
window.DBEST_USER_RUNTIME_AUTHORITY={version:VERSION,apply,install};
})();