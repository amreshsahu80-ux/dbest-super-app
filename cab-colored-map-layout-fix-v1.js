(function(){
'use strict';
const STYLE_ID='dbest-cab-colored-map-layout-fix-v1';
const AUTH_VERSION='1.2.0';
let selectedWait=null,replacing=false,googleWait=null,mapFallbackBusy=false;
function css(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
  .cab6Page .leaflet-tile-pane{filter:saturate(1.35) contrast(1.03)!important}
  .cab6MapFrame{position:relative;z-index:1!important}
  .cab6Map{min-height:300px!important;background:#e8eef6!important}
  .cab6Confirm{position:relative;z-index:5!important;margin:14px 7px 0!important}
  .cab6VehicleHero{margin-top:0!important;min-height:70px;align-items:center!important}
  .cab6VehicleHero>div:last-child{min-width:0;position:relative;z-index:2}
  .cab6VehicleHero b{display:block!important;line-height:1.2!important}
  .cabGoogleFallback{width:100%!important;height:100%!important;min-height:300px!important}
  @media(max-width:420px){.cab6Confirm{margin:12px 7px 0!important}.cab6VehicleHero{gap:10px!important}.cab6Map,.cabGoogleFallback{min-height:280px!important}}
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
function mapReady(el){
  return !!(el&&el.querySelector('.leaflet-pane,.leaflet-map-pane,.gm-style'));
}
function routeLabels(){
  let p='',d='';
  const pill=document.querySelector('.cab6RoutePill');
  if(pill){
    const parts=String(pill.textContent||'').split('→').map(x=>x.trim()).filter(Boolean);
    p=parts[0]||'';d=parts[1]||'';
    if(/hours?\s*\/|hours?\b|\bkm\b/i.test(d)&&!/,|road|street|nagar|pur|jharkhand|india/i.test(d))d='';
  }
  if(!p){
    const rows=Array.from(document.querySelectorAll('.cab6RouteRow'));
    if(rows[0])p=String(rows[0].querySelector('b')?.textContent||'').trim();
    if(rows[1]&&!/package/i.test(String(rows[1].querySelector('small')?.textContent||'')))d=String(rows[1].querySelector('b')?.textContent||'').trim();
  }
  return{p,d};
}
function loadGoogle(){
  if(window.google?.maps?.Map)return Promise.resolve(window.google.maps);
  if(googleWait)return googleWait;
  const key=String((window.DBEST_RUNTIME_CONFIG||{}).googleMapsApiKey||'').trim();
  if(!key)return Promise.reject(new Error('google key unavailable'));
  googleWait=new Promise((resolve,reject)=>{
    let s=document.getElementById('dbestCabGoogleMapFallbackJs');
    const done=()=>window.google?.maps?.Map?resolve(window.google.maps):reject(new Error('google map unavailable'));
    if(s){s.addEventListener('load',done,{once:true});s.addEventListener('error',()=>reject(new Error('google map unavailable')),{once:true});setTimeout(done,6500);return;}
    s=document.createElement('script');
    s.id='dbestCabGoogleMapFallbackJs';
    s.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&v=weekly';
    s.async=true;s.defer=true;s.onload=done;s.onerror=()=>reject(new Error('google map unavailable'));
    document.head.appendChild(s);
    setTimeout(()=>{if(!window.google?.maps?.Map)reject(new Error('google map timeout'))},7000);
  }).finally(()=>{googleWait=null});
  return googleWait;
}
function googleGeocode(text){
  return new Promise(resolve=>{
    if(!text||!window.google?.maps?.Geocoder)return resolve(null);
    try{new google.maps.Geocoder().geocode({address:text,componentRestrictions:{country:'IN'}},(rows,status)=>{
      const r=rows&&rows[0],loc=r?.geometry?.location;
      resolve(status==='OK'&&loc?{lat:loc.lat(),lng:loc.lng(),label:r.formatted_address||text}:null);
    })}catch(e){resolve(null)}
  });
}
async function textGeocode(text){
  const g=await googleGeocode(text);if(g)return g;
  try{
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),3500);
    const u='https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=in&limit=1&q='+encodeURIComponent(text);
    const r=await fetch(u,{signal:ctl.signal,headers:{'Accept-Language':'en'}});clearTimeout(timer);
    const a=await r.json(),x=a&&a[0],lat=Number(x?.lat),lng=Number(x?.lon);
    return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng,label:x.display_name||text}:null;
  }catch(e){return null}
}
async function osrmPath(a,b){
  if(!a||!b)return[];
  try{
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),4200);
    const u=`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
    const r=await fetch(u,{signal:ctl.signal,cache:'no-store'});clearTimeout(timer);
    const j=await r.json(),c=j?.routes?.[0]?.geometry?.coordinates||[];
    return c.map(x=>({lat:Number(x[1]),lng:Number(x[0])})).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng));
  }catch(e){return[]}
}
async function ensureMapVisible(){
  const el=document.getElementById('cab13Map');
  if(!el||mapReady(el)||mapFallbackBusy||el.dataset.dbestGoogleFallback==='1')return;
  const labels=routeLabels();
  if(!labels.p)return;
  mapFallbackBusy=true;
  try{
    await loadGoogle();
    if(!document.getElementById('cab13Map')||mapReady(el))return;
    const p=await textGeocode(labels.p),d=labels.d?await textGeocode(labels.d):null;
    if(!p)return;
    el.innerHTML='';el.classList.add('cabGoogleFallback');el.dataset.dbestGoogleFallback='1';
    const map=new google.maps.Map(el,{center:{lat:p.lat,lng:p.lng},zoom:d?12:15,streetViewControl:false,mapTypeControl:false,fullscreenControl:false,gestureHandling:'greedy'});
    new google.maps.Marker({map,position:{lat:p.lat,lng:p.lng},label:'P'});
    if(d){
      new google.maps.Marker({map,position:{lat:d.lat,lng:d.lng},label:'D'});
      const path=await osrmPath(p,d);
      if(path.length>1){
        new google.maps.Polyline({map,path,strokeColor:'#00bde8',strokeOpacity:1,strokeWeight:7});
        const bounds=new google.maps.LatLngBounds();path.forEach(x=>bounds.extend(x));map.fitBounds(bounds,42);
      }else{
        const bounds=new google.maps.LatLngBounds();bounds.extend(p);bounds.extend(d);map.fitBounds(bounds,42);
      }
    }
  }catch(e){console.warn('DBest Cab visual map fallback',e)}finally{mapFallbackBusy=false}
}
function watchSelectedMap(){
  const schedule=()=>{
    if(!document.getElementById('cab13Map'))return;
    setTimeout(ensureMapVisible,1600);
    setTimeout(ensureMapVisible,3600);
    setTimeout(ensureMapVisible,6200);
  };
  const mo=new MutationObserver(schedule);
  if(document.body)mo.observe(document.body,{childList:true,subtree:true});
  else document.addEventListener('DOMContentLoaded',()=>mo.observe(document.body,{childList:true,subtree:true}),{once:true});
  schedule();
}
function init(){css();patchLeaflet();watchLeafletScript();lockCabEntries();watchLegacyCab();watchSelectedMap();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.DBEST_CAB_MAP_LAYOUT_FIX={version:AUTH_VERSION,refresh:()=>{css();patchLeaflet();lockCabEntries();replaceLegacyCab();ensureMapVisible()}};
})();