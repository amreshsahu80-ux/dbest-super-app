(function(){
'use strict';
const VERSION='1.1.0';
const STYLE_ID='dbest-platform-device-location-hardening-v1';
const LOCATION_CACHE='dbest_platform_location_compat_v1';

function ensureViewport(){
  let m=document.querySelector('meta[name="viewport"]');
  if(!m){m=document.createElement('meta');m.name='viewport';document.head.appendChild(m)}
  m.setAttribute('content','width=device-width,initial-scale=1,viewport-fit=cover');
}

function injectStyle(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
  html{width:100%;max-width:100%;-webkit-text-size-adjust:100%;text-size-adjust:100%}
  body{width:100%;max-width:100%;min-height:100vh;min-height:100dvh;overflow-x:hidden;overscroll-behavior-x:none}
  img,video,svg,canvas,iframe{max-width:100%}
  button,a,input,select,textarea{touch-action:manipulation}
  input,select,textarea{max-width:100%}
  .w,.sectionContent,.owner55,.serviceFormPage,.cab6Page,.cab6Wrap{max-width:100%}
  .grid>*,.subs>*,.cards>*,.form>*,.kpis>*,.serviceFormGrid>*{min-width:0}
  .table{width:100%;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
  .table table{max-width:none}
  .tileVisual img,.tileVisual video{max-width:100%;max-height:100%}
  .idcard,.ownerPanelCard,.serviceFormCard{max-width:100%;overflow-wrap:anywhere}
  .notice,.sectionHero,.card,.sub{overflow-wrap:anywhere}
  [data-dbest-responsive-scroll]{overflow-x:auto;-webkit-overflow-scrolling:touch}
  @media(max-width:720px){
    input,select,textarea{font-size:16px!important}
    .w{padding-left:12px!important;padding-right:12px!important}
    .sectionContent{padding-left:max(12px,env(safe-area-inset-left));padding-right:max(12px,env(safe-area-inset-right));padding-bottom:max(12px,env(safe-area-inset-bottom))}
    .grid.side .tileIn{grid-template-columns:minmax(0,1fr)!important}
    .idtop,.idbody{flex-wrap:wrap}
    .toast{left:12px!important;right:12px!important;bottom:max(12px,env(safe-area-inset-bottom))!important;text-align:center}
    #dbestPlatformInfoModal{padding:max(10px,env(safe-area-inset-top)) 10px max(10px,env(safe-area-inset-bottom))!important}
  }
  @media(max-width:340px){.grid{grid-template-columns:1fr!important}}
  @media(orientation:landscape) and (max-height:520px){
    #dbestPlatformInfoModal{align-items:flex-start!important;overflow:auto}
  }
  `;
  document.head.appendChild(s);
}

function setViewportVars(){
  const root=document.documentElement;
  root.style.setProperty('--dbest-vh',(window.innerHeight*0.01)+'px');
  root.style.setProperty('--dbest-vw',(window.innerWidth*0.01)+'px');
  root.dataset.dbestViewport=window.innerWidth<=480?'phone':window.innerWidth<=900?'tablet':'desktop';
  root.dataset.dbestOrientation=window.innerWidth>window.innerHeight?'landscape':'portrait';
}

function normalizeScrollableTables(root=document){
  root.querySelectorAll('table').forEach(t=>{
    const p=t.parentElement;
    if(!p||p.classList.contains('table'))return;
    const available=p.clientWidth||window.innerWidth;
    if(t.scrollWidth>available+4)p.setAttribute('data-dbest-responsive-scroll','1');
  });
}

function cacheLocation(x){
  if(!x||!Number.isFinite(Number(x.lat))||!Number.isFinite(Number(x.lng)))return;
  try{localStorage.setItem(LOCATION_CACHE,JSON.stringify({lat:Number(x.lat),lng:Number(x.lng),label:String(x.label||''),at:Date.now()}))}catch(e){}
}
function cachedLocation(){
  try{const x=JSON.parse(localStorage.getItem(LOCATION_CACHE)||'null');return x&&Number.isFinite(Number(x.lat))&&Number.isFinite(Number(x.lng))?x:null}catch(e){return null}
}
function getLocation(opts={}){
  const timeout=Math.max(2500,Number(opts.timeout||10000));
  return new Promise(resolve=>{
    const top=window.DBEST_TOP_LIVE_LOCATION;
    if(opts.preferCached!==false&&top&&Number.isFinite(Number(top.lat))&&Number.isFinite(Number(top.lng))){
      const x={lat:Number(top.lat),lng:Number(top.lng),accuracy:Number(top.accuracy||0),label:String(top.label||''),source:top.state||'platform-cache'};cacheLocation(x);return resolve(x)
    }
    if(!navigator.geolocation){const c=cachedLocation();return resolve(c?{...c,source:'cache'}:null)}
    let done=false;
    const finish=x=>{if(done)return;done=true;clearTimeout(timer);if(x)cacheLocation(x);resolve(x)};
    const timer=setTimeout(()=>{const c=cachedLocation();finish(c?{...c,source:'cache'}:null)},timeout+500);
    navigator.geolocation.getCurrentPosition(
      p=>finish({lat:Number(p.coords.latitude),lng:Number(p.coords.longitude),accuracy:Number(p.coords.accuracy||0),label:'',source:'gps'}),
      ()=>{const c=cachedLocation();finish(c?{...c,source:'cache'}:null)},
      {enableHighAccuracy:!!opts.highAccuracy,timeout,maximumAge:Number(opts.maximumAge??300000)}
    );
  });
}

function connectionState(){
  const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection||null;
  return {online:navigator.onLine!==false,effectiveType:c?.effectiveType||'',saveData:!!c?.saveData,downlink:Number(c?.downlink||0)};
}
function publishDevice(){
  window.DBEST_DEVICE_PROFILE={version:VERSION,viewport:{width:window.innerWidth,height:window.innerHeight,dpr:Number(window.devicePixelRatio||1)},orientation:window.innerWidth>window.innerHeight?'landscape':'portrait',connection:connectionState(),touch:('ontouchstart'in window)||Number(navigator.maxTouchPoints||0)>0};
  document.documentElement.dataset.dbestOnline=navigator.onLine===false?'0':'1';
}
function init(){ensureViewport();injectStyle();setViewportVars();publishDevice();normalizeScrollableTables();}

let timer=0;
function scheduleSync(){clearTimeout(timer);timer=setTimeout(()=>{setViewportVars();publishDevice();normalizeScrollableTables()},140)}
window.addEventListener('resize',scheduleSync,{passive:true});
window.addEventListener('orientationchange',()=>setTimeout(scheduleSync,180),{passive:true});
window.addEventListener('online',publishDevice);window.addEventListener('offline',publishDevice);
window.addEventListener('dbest-location-changed',e=>cacheLocation(e.detail||{}));
const mo=new MutationObserver(m=>{if(m.some(x=>x.addedNodes&&x.addedNodes.length))scheduleSync()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{init();mo.observe(document.body,{childList:true,subtree:true})},{once:true});else{init();mo.observe(document.body,{childList:true,subtree:true})}
window.DBEST_PLATFORM_COMPAT={version:VERSION,getLocation,cachedLocation,refresh:()=>{init();return window.DBEST_DEVICE_PROFILE}};
})();