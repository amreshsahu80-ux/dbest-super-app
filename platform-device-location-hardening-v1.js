(function(){
'use strict';
const VERSION='1.2.0-fast';
const STYLE_ID='dbest-platform-device-location-hardening-v1';
const LOCATION_CACHE='dbest_platform_location_compat_v1';

function ensureViewport(){
  let m=document.querySelector('meta[name="viewport"]');
  if(!m){m=document.createElement('meta');m.name='viewport';document.head.appendChild(m)}
  m.setAttribute('content','width=device-width,initial-scale=1,viewport-fit=cover');
}

function injectStyle(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
  html{width:100%;max-width:100%;-webkit-text-size-adjust:100%;text-size-adjust:100%}
  body{width:100%;max-width:100%;min-height:100vh;min-height:100dvh;overflow-x:hidden;overscroll-behavior-x:none;margin-left:0;margin-right:0}
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
  [data-dbest-responsive-scroll]{overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%}
  @media(max-width:900px){.w{width:100%;max-width:100%}}
  @media(max-width:720px){
    input,select,textarea{font-size:16px!important}
    .w{padding-left:max(12px,env(safe-area-inset-left))!important;padding-right:max(12px,env(safe-area-inset-right))!important}
    .sectionContent{padding-left:max(12px,env(safe-area-inset-left));padding-right:max(12px,env(safe-area-inset-right));padding-bottom:max(12px,env(safe-area-inset-bottom))}
    .grid.side .tileIn{grid-template-columns:minmax(0,1fr)!important}
    .idtop,.idbody{flex-wrap:wrap}
    .toast{left:12px!important;right:12px!important;bottom:max(12px,env(safe-area-inset-bottom))!important;text-align:center}
    #dbestPlatformInfoModal{padding:max(10px,env(safe-area-inset-top)) 10px max(10px,env(safe-area-inset-bottom))!important}
  }
  @media(max-width:340px){.grid{grid-template-columns:1fr!important}}
  @media(orientation:landscape) and (max-height:520px){#dbestPlatformInfoModal{align-items:flex-start!important;overflow:auto}}
  @media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
  `;document.head.appendChild(s)
}

function setViewportVars(){
  const root=document.documentElement;
  root.style.setProperty('--dbest-vh',(window.innerHeight*0.01)+'px');
  root.style.setProperty('--dbest-vw',(window.innerWidth*0.01)+'px');
  root.dataset.dbestViewport=window.innerWidth<=480?'phone':window.innerWidth<=900?'tablet':'desktop';
  root.dataset.dbestOrientation=window.innerWidth>window.innerHeight?'landscape':'portrait'
}

function normalizeTable(t){
  if(!t||!t.parentElement)return;
  const p=t.parentElement,available=p.clientWidth||window.innerWidth;
  if(t.scrollWidth>available+4)p.setAttribute('data-dbest-responsive-scroll','1');else if(p.hasAttribute('data-dbest-responsive-scroll'))p.removeAttribute('data-dbest-responsive-scroll')
}
function normalizeScrollableTables(root=document){
  if(!root)return;
  if(root.nodeType===1&&root.matches?.('table'))normalizeTable(root);
  root.querySelectorAll?.('table').forEach(normalizeTable)
}

function cacheLocation(x){
  if(!x||!Number.isFinite(Number(x.lat))||!Number.isFinite(Number(x.lng)))return;
  try{localStorage.setItem(LOCATION_CACHE,JSON.stringify({lat:Number(x.lat),lng:Number(x.lng),label:String(x.label||''),at:Date.now()}))}catch(e){}
}
function cachedLocation(){
  try{const x=JSON.parse(localStorage.getItem(LOCATION_CACHE)||'null');return x&&Number.isFinite(Number(x.lat))&&Number.isFinite(Number(x.lng))?x:null}catch(e){return null}
}
function getLocation(opts={}){
  const timeout=Math.max(2500,Number(opts.timeout||10000)),maximumAge=Math.max(0,Number(opts.maximumAge??300000));
  return new Promise(resolve=>{
    const top=window.DBEST_TOP_LIVE_LOCATION;
    if(opts.preferCached!==false&&top&&Number.isFinite(Number(top.lat))&&Number.isFinite(Number(top.lng))){const x={lat:Number(top.lat),lng:Number(top.lng),accuracy:Number(top.accuracy||0),label:String(top.label||''),source:top.state||'platform-cache'};cacheLocation(x);return resolve(x)}
    if(opts.preferCached!==false){const c=cachedLocation();if(c&&Date.now()-Number(c.at||0)<=maximumAge)return resolve({...c,source:'cache'})}
    if(!navigator.geolocation){const c=cachedLocation();return resolve(c?{...c,source:'cache'}:null)}
    let done=false;
    const finish=x=>{if(done)return;done=true;clearTimeout(timer);if(x)cacheLocation(x);resolve(x)};
    const timer=setTimeout(()=>{const c=cachedLocation();finish(c?{...c,source:'cache'}:null)},timeout+300);
    navigator.geolocation.getCurrentPosition(
      p=>finish({lat:Number(p.coords.latitude),lng:Number(p.coords.longitude),accuracy:Number(p.coords.accuracy||0),label:'',source:'gps'}),
      ()=>{const c=cachedLocation();finish(c?{...c,source:'cache'}:null)},
      {enableHighAccuracy:!!opts.highAccuracy,timeout,maximumAge}
    )
  })
}

function connectionState(){const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection||null;return {online:navigator.onLine!==false,effectiveType:c?.effectiveType||'',saveData:!!c?.saveData,downlink:Number(c?.downlink||0)}}
function publishDevice(){
  const connection=connectionState();
  window.DBEST_DEVICE_PROFILE={version:VERSION,viewport:{width:window.innerWidth,height:window.innerHeight,dpr:Number(window.devicePixelRatio||1)},orientation:window.innerWidth>window.innerHeight?'landscape':'portrait',connection,touch:('ontouchstart'in window)||Number(navigator.maxTouchPoints||0)>0};
  const root=document.documentElement;root.dataset.dbestOnline=navigator.onLine===false?'0':'1';root.dataset.dbestConnection=connection.saveData||/^(slow-2g|2g)$/i.test(connection.effectiveType)?'constrained':'normal'
}
function init(){ensureViewport();injectStyle();setViewportVars();publishDevice();normalizeScrollableTables(document)}

let resizeTimer=0;
function scheduleResizeSync(){clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{setViewportVars();publishDevice();normalizeScrollableTables(document)},120)}
window.addEventListener('resize',scheduleResizeSync,{passive:true});
window.addEventListener('orientationchange',()=>setTimeout(scheduleResizeSync,160),{passive:true});
window.addEventListener('pageshow',scheduleResizeSync,{passive:true});
window.addEventListener('online',publishDevice);window.addEventListener('offline',publishDevice);
const conn=navigator.connection||navigator.mozConnection||navigator.webkitConnection;if(conn?.addEventListener)conn.addEventListener('change',publishDevice);
window.addEventListener('dbest-location-changed',e=>cacheLocation(e.detail||{}));

// Only inspect newly-added DOM branches that can contain a table. The previous
// implementation rescanned every table after every SPA mutation, which was costly
// on Cab/maps and other frequently updating screens.
let tableTimer=0,pending=[];
function queueTableScan(node){if(node?.nodeType===1)pending.push(node);if(tableTimer)return;tableTimer=setTimeout(()=>{const roots=pending.splice(0);tableTimer=0;roots.forEach(normalizeScrollableTables)},90)}
const mo=new MutationObserver(m=>m.forEach(x=>(x.addedNodes||[]).forEach(n=>{if(n.nodeType===1&&(n.matches?.('table')||n.querySelector?.('table')))queueTableScan(n)})));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{init();mo.observe(document.body,{childList:true,subtree:true})},{once:true});else{init();mo.observe(document.body,{childList:true,subtree:true})}
window.DBEST_PLATFORM_COMPAT={version:VERSION,getLocation,cachedLocation,refresh:()=>{init();return window.DBEST_DEVICE_PROFILE}};
})();