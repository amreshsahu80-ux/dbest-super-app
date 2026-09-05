(function(){
'use strict';
const BASE='20260905-selected-realmap-v6';
const V='20260906-selected-realmap-v7';
let api=null,loading=null;
function polish(){
 if(!document.getElementById('dbest-cab-v7-polish')){
  const st=document.createElement('style');
  st.id='dbest-cab-v7-polish';
  st.textContent=`
  .cab6MapShade{display:none!important}
  .cab6Page .leaflet-tile-pane{filter:brightness(1.22) contrast(.92) saturate(.82)!important}
  .cab6Page .leaflet-overlay-pane{z-index:520!important}
  .cab6Page .leaflet-marker-pane{z-index:620!important}
  .cab6Page .leaflet-tooltip-pane,.cab6Page .leaflet-popup-pane{z-index:700!important}
  .cab6Page .leaflet-control-container{position:relative;z-index:900!important}
  .cab6Page .leaflet-canvas-pane canvas,.cab6Page .leaflet-overlay-pane canvas{filter:drop-shadow(0 0 4px rgba(0,222,255,.9))!important}
  `;
  document.head.appendChild(st);
 }
 document.querySelectorAll('.cab6Veh b,.cab6VehicleHero b').forEach(el=>{if((el.textContent||'').trim()==='Auto')el.textContent='Auto/E-Rickshaw'});
 document.querySelectorAll('.cab6Book').forEach(el=>{if(/\bAuto\b/.test(el.textContent||''))el.textContent=(el.textContent||'').replace(/\bAuto\b/g,'Auto/E-Rickshaw')});
 if(window.L && !window.L.__dbestRouteV7){
  try{
   const orig=window.L.polyline;
   window.L.polyline=function(latlngs,opts){
    const o=Object.assign({},opts||{});
    if(o.color==='#55ddea'||o.color==='#58dce9'||o.color==='#56dfea'){o.color='#00d9ff';o.weight=Math.max(Number(o.weight)||5,8);o.opacity=1;o.lineCap='round';o.lineJoin='round'}
    return orig.call(this,latlngs,o);
   };
   window.L.__dbestRouteV7=true;
  }catch(e){}
 }
}
function bind(a){
 if(!a||typeof a.open!=='function')return;
 api=a;
 const guard=name=>{try{Object.defineProperty(window,name,{configurable:true,enumerable:true,get(){return api},set(v){if(v===api)api=v}})}catch(e){try{window[name]=api}catch(_){}}};
 guard('DBEST_CAB_GOOGLE');guard('DBEST_CAB_MAPPLS_RENTAL');
 try{Object.defineProperty(window,'openRidePlatform',{configurable:true,enumerable:true,get(){return api.open},set(v){}})}catch(e){window.openRidePlatform=api.open}
 window.DBEST_CAB_SELECTED_UI=api;window.DBEST_ACTIVE_CAB_VERSION='SELECTED_REALMAP_V7';polish();
}
function ensure(){
 if(window.DBEST_CAB_SELECTED_UI?.version===BASE){bind(window.DBEST_CAB_SELECTED_UI);return Promise.resolve(window.DBEST_CAB_SELECTED_UI)}
 if(loading)return loading;
 loading=new Promise((resolve,reject)=>{const old=document.getElementById('dbest-selected-cab-v6-script');if(old)old.remove();const s=document.createElement('script');s.id='dbest-selected-cab-v6-script';s.src='/cab-selected-ui-v3.js?v='+BASE+'&t='+Date.now();s.async=false;s.onload=()=>{const a=window.DBEST_CAB_SELECTED_UI;if(a?.version===BASE){bind(a);resolve(a)}else reject(new Error('selected cab base unavailable'))};s.onerror=reject;document.body.appendChild(s)}).catch(e=>{loading=null;console.warn('DBest selected cab loader',e);throw e});return loading;
}
ensure().catch(()=>{});
const mo=new MutationObserver(()=>polish());mo.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
const t=setInterval(()=>{polish();if(api)bind(api);else ensure().catch(()=>{})},120);setTimeout(()=>{clearInterval(t);setInterval(()=>{polish();api&&bind(api)},1800)},22000);
addEventListener('pageshow',()=>{polish();api&&bind(api)});document.addEventListener('visibilitychange',()=>{if(!document.hidden){polish();api&&bind(api)}});
window.DBEST_CAB_PLANNED_UI={version:V,ensure,polish};
})();