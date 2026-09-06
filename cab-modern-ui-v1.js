(function(){
'use strict';
const VERSION='20260906-selected-v13-initial-map-v2';
let map=null,marker=null,leafletWait=null,mountBusy=false;
const $=id=>document.getElementById(id);
function addStyle(){
  if($('dbest-cab-initial-map-style'))return;
  const s=document.createElement('style');
  s.id='dbest-cab-initial-map-style';
  s.textContent=`
    .cab6Page .leaflet-tile-pane{filter:none!important}
    .cab6Page .leaflet-container{background:#e9eef6!important}
    .cab13SearchMapFrame{position:relative;height:230px;margin:0 0 12px;border-radius:25px;overflow:hidden;background:#e9eef6;border:1px solid #dfe4ef;box-shadow:0 16px 34px rgba(24,42,92,.16)}
    .cab13SearchMap{position:absolute;inset:0;width:100%;height:100%}
    .cab13SearchMapLabel{position:absolute;z-index:500;left:12px;bottom:12px;max-width:calc(100% - 24px);padding:7px 10px;border-radius:999px;background:rgba(20,31,69,.82);color:#fff;font-size:9px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;backdrop-filter:blur(8px);pointer-events:none}
    .cab13SearchMapFallback{height:100%;display:grid;place-items:center;text-align:center;padding:18px;color:#43516e;background:linear-gradient(145deg,#edf3ff,#dfe9f7)}
    @media(max-width:420px){.cab13SearchMapFrame{height:205px;border-radius:21px;margin-bottom:10px}}
  `;
  document.head.appendChild(s);
}
function addCss(href,id){
  if($(id))return;
  const l=document.createElement('link');l.id=id;l.rel='stylesheet';l.href=href;document.head.appendChild(l);
}
function loadJs(src,id,timeout=5200){
  return new Promise((resolve,reject)=>{
    if(window.L)return resolve(window.L);
    let old=$(id);
    if(old){
      const done=()=>window.L?resolve(window.L):reject(new Error('Leaflet unavailable'));
      old.addEventListener('load',done,{once:true});old.addEventListener('error',()=>reject(new Error('Leaflet unavailable')),{once:true});setTimeout(done,timeout);return;
    }
    const s=document.createElement('script');s.id=id;s.src=src;s.async=true;
    const t=setTimeout(()=>reject(new Error('Leaflet timeout')),timeout);
    s.onload=()=>{clearTimeout(t);window.L?resolve(window.L):reject(new Error('Leaflet unavailable'))};
    s.onerror=()=>{clearTimeout(t);reject(new Error('Leaflet unavailable'))};
    document.head.appendChild(s);
  });
}
async function ensureLeaflet(){
  if(window.L)return window.L;
  if(leafletWait)return leafletWait;
  addCss('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css','dbest-cab-leaflet-css-v2');
  leafletWait=(async()=>{
    try{return await loadJs('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js','dbest-cab-leaflet-js-v2',5200)}
    catch(e){return await loadJs('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','dbest-cab-leaflet-js-v2-fallback',5200)}
  })().catch(e=>{leafletWait=null;throw e});
  return leafletWait;
}
function removeMap(){
  try{map&&map.remove&&map.remove()}catch(e){}
  map=null;marker=null;
}
function setLabel(text){const el=$('cab13SearchMapLabel');if(el)el.textContent=text||'Live pickup map';}
function pin(lat,lng,label){
  if(!map||!window.L||!Number.isFinite(lat)||!Number.isFinite(lng))return;
  const pos=[lat,lng];
  if(marker)marker.setLatLng(pos);
  else marker=L.circleMarker(pos,{radius:8,weight:4,color:'#fff',fillColor:'#1cc8e8',fillOpacity:1}).addTo(map);
  map.setView(pos,15,{animate:true});
  setLabel(label||'Your current pickup area');
  setTimeout(()=>map&&map.invalidateSize&&map.invalidateSize(),80);
}
function locate(noisy){
  if(!navigator.geolocation){if(noisy)setLabel('Location unavailable • map ready for manual pickup');return;}
  navigator.geolocation.getCurrentPosition(p=>{
    pin(Number(p.coords.latitude),Number(p.coords.longitude),'Your current pickup area');
  },()=>{if(noisy)setLabel('Location permission not available • choose pickup manually')},{enableHighAccuracy:true,timeout:9000,maximumAge:30000});
}
async function initMap(){
  const el=$('cab13SearchMap');if(!el||el.dataset.ready==='1')return;
  try{
    const L=await ensureLeaflet();
    if(!$('cab13SearchMap'))return;
    removeMap();
    map=L.map(el,{zoomControl:true,attributionControl:true,preferCanvas:false}).setView([22.5937,78.9629],5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
    el.dataset.ready='1';
    setTimeout(()=>map&&map.invalidateSize&&map.invalidateSize(),100);
    locate(false);
  }catch(e){
    if(el)el.innerHTML='<div class="cab13SearchMapFallback"><div><b>Map is reconnecting…</b><br><small>You can still enter pickup and destination.</small></div></div>';
  }
}
function bindGpsButton(){
  const b=$('cab6Gps');if(!b||b.dataset.dbestMapBind==='1')return;
  b.dataset.dbestMapBind='1';
  b.addEventListener('click',()=>setTimeout(()=>locate(true),50),{passive:true});
}
function mount(){
  const search=document.querySelector('.cab6Page .cab6Search');
  if(!search){
    if(!document.body.contains($('cab13SearchMapFrame')))removeMap();
    return;
  }
  if(mountBusy)return;
  mountBusy=true;
  addStyle();
  let frame=$('cab13SearchMapFrame');
  if(!frame){
    frame=document.createElement('div');
    frame.id='cab13SearchMapFrame';frame.className='cab13SearchMapFrame';
    frame.innerHTML='<div id="cab13SearchMap" class="cab13SearchMap"></div><div id="cab13SearchMapLabel" class="cab13SearchMapLabel">Finding your pickup area…</div>';
    search.parentNode.insertBefore(frame,search);
  }
  bindGpsButton();
  initMap().finally(()=>{mountBusy=false});
}
function watch(){
  const mo=new MutationObserver(()=>mount());
  const start=()=>{mo.observe(document.body,{childList:true,subtree:true});mount()};
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(mount,80)});
  window.addEventListener('pageshow',()=>setTimeout(mount,80));
}
function init(){addStyle();watch()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.DBEST_CAB_MODERN_UI={version:VERSION,refresh:mount,locate:()=>locate(true)};
})();