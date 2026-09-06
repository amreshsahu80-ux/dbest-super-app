(function(){
'use strict';
const STYLE_ID='dbest-cab-colored-map-layout-fix-v1';
const AUTH_VERSION='1.1.0';
let selectedWait=null,replacing=false;
function css(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
  .cab6Page .leaflet-tile-pane{filter:saturate(1.35) contrast(1.03)!important}
  .cab6MapFrame{position:relative;z-index:1!important}
  .cab6Confirm{position:relative;z-index:5!important;margin:14px 7px 0!important}
  .cab6VehicleHero{margin-top:0!important;min-height:70px;align-items:center!important}
  .cab6VehicleHero>div:last-child{min-width:0;position:relative;z-index:2}
  .cab6VehicleHero b{display:block!important;line-height:1.2!important}
  @media(max-width:420px){.cab6Confirm{margin:12px 7px 0!important}.cab6VehicleHero{gap:10px!important}}
  `;
  document.head.appendChild(s);
}
function patchLeaflet(){
  const L=window.L;
  if(!L||L.__dbestColorTilesPatched||typeof L.tileLayer!=='function')return;
  const original=L.tileLayer;
  L.tileLayer=function(url,opts){
    let nextUrl=url,nextOpts=Object.assign({},opts||{});
    if(typeof url==='string'&&(/tile\.openstreetmap\.org/i.test(url)||/basemaps\.cartocdn\.com/i.test(url))){
      nextUrl='https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      nextOpts=Object.assign({},nextOpts,{subdomains:'abcd',maxZoom:20,attribution:'© OpenStreetMap © CARTO'});
    }
    return original.call(this,nextUrl,nextOpts);
  };
  L.__dbestColorTilesPatched=true;
}
function watchLeafletScript(){
  document.addEventListener('load',e=>{
    const t=e.target;
    if(t&&t.tagName==='SCRIPT'&&(t.id==='cab13LeafletJs'||/leaflet/i.test(String(t.src||''))))patchLeaflet();
  },true);
  const mo=new MutationObserver(muts=>{
    for(const m of muts){for(const n of m.addedNodes||[]){if(n&&n.tagName==='SCRIPT'&&(n.id==='cab13LeafletJs'||/leaflet/i.test(String(n.src||''))))n.addEventListener('load',patchLeaflet,{once:true});}}
  });
  mo.observe(document.documentElement,{childList:true,subtree:true});
}
function selected(){
  const u=window.DBEST_CAB_SELECTED_UI;
  return u&&typeof u.open==='function'?u:null;
}
function waitForSelected(){
  const ready=selected();
  if(ready)return Promise.resolve(ready);
  if(selectedWait)return selectedWait;
  selectedWait=new Promise(resolve=>{
    let tries=0;
    const tick=()=>{
      const u=selected();
      if(u)return resolve(u);
      if(++tries<35)return setTimeout(tick,80);
      resolve(null);
    };
    tick();
  }).then(u=>{
    if(u)return u;
    return new Promise(resolve=>{
      const done=()=>resolve(selected());
      const existing=Array.from(document.scripts||[]).find(x=>/cab-selected-ui-v3\.js/i.test(String(x.src||'')));
      if(existing){setTimeout(done,350);return;}
      const s=document.createElement('script');
      s.src='/cab-selected-ui-v3.js?v=20260905-selected-realmap-v6&authority='+Date.now();
      s.async=false;s.onload=done;s.onerror=()=>resolve(null);
      (document.body||document.documentElement).appendChild(s);
    });
  }).finally(()=>{selectedWait=null});
  return selectedWait;
}
function notifyUnavailable(){
  try{typeof toast==='function'?toast('Cab booking is loading. Please tap Cab once more.'):alert('Cab booking is loading. Please tap Cab once more.')}catch(e){}
}
function openSelected(){
  return waitForSelected().then(u=>{
    if(!u||typeof u.open!=='function'){notifyUnavailable();return;}
    u.open();
  }).catch(()=>notifyUnavailable());
}
const proxy={
  version:'UNIFIED_SELECTED_CAB_'+AUTH_VERSION,
  open:openSelected,
  vehicles(){const u=selected();return u&&typeof u.vehicles==='function'?u.vehicles():openSelected();},
  confirmRide(id){const u=selected(),fn=u&&(u.confirmRide||u.confirm);return typeof fn==='function'?fn.call(u,id):openSelected();},
  confirm(id){return this.confirmRide(id);}
};
function lockGlobal(name,getter){
  try{
    Object.defineProperty(window,name,{configurable:true,enumerable:true,get:getter,set(){}});
    return true;
  }catch(e){return false;}
}
function lockCabEntries(){
  lockGlobal('openRidePlatform',()=>openSelected);
  lockGlobal('DBEST_CAB_GOOGLE',()=>proxy);
  lockGlobal('DBEST_CAB_MAPPLS_RENTAL',()=>proxy);
  window.DBEST_CAB_UNIFIED_ENTRY={version:AUTH_VERSION,open:openSelected,proxy};
}
function legacyCabVisible(){
  return !!(document.querySelector('.dbcg')||document.querySelector('.cabx')||document.getElementById('mcMap')||document.querySelector('.ridePage .rideSearchCard'));
}
function replaceLegacyCab(){
  if(replacing||document.querySelector('.cab6Page')||!legacyCabVisible())return;
  replacing=true;
  openSelected().finally(()=>setTimeout(()=>{replacing=false},450));
}
function watchLegacyCab(){
  const mo=new MutationObserver(()=>replaceLegacyCab());
  if(document.body)mo.observe(document.body,{childList:true,subtree:true});
  else document.addEventListener('DOMContentLoaded',()=>mo.observe(document.body,{childList:true,subtree:true}),{once:true});
  setTimeout(replaceLegacyCab,0);
}
function init(){css();patchLeaflet();watchLeafletScript();lockCabEntries();watchLegacyCab();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.DBEST_CAB_MAP_LAYOUT_FIX={version:AUTH_VERSION,refresh:()=>{css();patchLeaflet();lockCabEntries();replaceLegacyCab()}};
})();