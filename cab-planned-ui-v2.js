(function(){
'use strict';
const BASE='20260905-selected-realmap-v6';
const V='20260906-selected-realmap-v10';
const REALISTIC={
  bike:'https://images.tractorjunction.com/GLOSS_BLACK_4c0619d5ab.png?format=webp&height=424&width=760',
  mini:'https://media.mijnwinkel-api.nl/resizer2/2525200/pictures/CS280003-Stootlijsten-set-breed-zwart-Suzuki-Swift-04.2024-1-wxh.jpg?version=1',
  sedan:'https://www.autobics.com/wp-content/uploads/2017/05/2017-maruti-suzuki-dzire-pearl-arctic-white.jpg',
  suv:'https://images.91wheels.com/assets/c_images/gallery/toyota/innova-crysta/toyota-innova-crysta-4-1767849001.png?q=40&w=850'
};
let api=null,loading=null;

function haversineKm(aLat,aLng,bLat,bLng){
 const R=6371,rad=x=>x*Math.PI/180;
 const dLat=rad(bLat-aLat),dLng=rad(bLng-aLng);
 const z=Math.sin(dLat/2)**2+Math.cos(rad(aLat))*Math.cos(rad(bLat))*Math.sin(dLng/2)**2;
 return R*2*Math.atan2(Math.sqrt(z),Math.sqrt(1-z));
}
function fallbackOsrmResponse(url){
 const s=String(url||'');
 const m=s.match(/\/route\/v1\/driving\/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?);(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
 if(!m)return null;
 const aLng=Number(m[1]),aLat=Number(m[2]),bLng=Number(m[3]),bLat=Number(m[4]);
 if(![aLng,aLat,bLng,bLat].every(Number.isFinite))return null;
 const km=Math.max(.5,haversineKm(aLat,aLng,bLat,bLng)*1.25);
 const seconds=Math.max(180,Math.round((km/30)*3600+300));
 const payload={code:'Ok',routes:[{distance:Math.round(km*1000),duration:seconds,geometry:{type:'LineString',coordinates:[[aLng,aLat],[bLng,bLat]]}}],waypoints:[]};
 try{return new Response(JSON.stringify(payload),{status:200,headers:{'content-type':'application/json','x-dbest-route-fallback':'1'}})}catch(e){return{ok:true,status:200,json:async()=>payload,text:async()=>JSON.stringify(payload)}}
}
function installRouteFetchGuard(){
 if(window.fetch&&window.fetch.__dbestRouteGuardV10)return;
 const original=window.__DBEST_CAB_ORIGINAL_FETCH||window.fetch.bind(window);
 window.__DBEST_CAB_ORIGINAL_FETCH=original;
 const guarded=async function(input,init){
  const url=typeof input==='string'?input:(input&&input.url)||'';
  if(!/router\.project-osrm\.org\/route\/v1\/driving\//i.test(String(url)))return original(input,init);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),6500);
  let parentAbort=null;
  try{
   const parentSignal=init&&init.signal;
   if(parentSignal){
    if(parentSignal.aborted)controller.abort();
    else{parentAbort=()=>controller.abort();parentSignal.addEventListener('abort',parentAbort,{once:true})}
   }
   const nextInit=Object.assign({},init||{},{signal:controller.signal,cache:'no-store'});
   const res=await original(input,nextInit);
   if(res&&res.ok)return res;
   const fb=fallbackOsrmResponse(url);
   if(fb){console.warn('DBest Cab: road routing service returned an error; using temporary distance fallback.');return fb}
   return res;
  }catch(err){
   const fb=fallbackOsrmResponse(url);
   if(fb){console.warn('DBest Cab: road routing timed out; using temporary distance fallback.',err&&err.name);return fb}
   throw err;
  }finally{
   clearTimeout(timer);
   try{if(parentAbort&&init&&init.signal)init.signal.removeEventListener('abort',parentAbort)}catch(e){}
  }
 };
 guarded.__dbestRouteGuardV10=true;
 guarded.__dbestOriginal=original;
 window.fetch=guarded;
}

function vehicleKeyFromText(t){
 t=String(t||'').toLowerCase();
 if(t.includes('bike'))return'bike';
 if(t.includes('auto'))return'auto';
 if(t.includes('mini'))return'mini';
 if(t.includes('sedan'))return'sedan';
 if(t.includes('suv'))return'suv';
 return'';
}
function patchLeaflet(){
 if(!window.L)return;
 if(!window.L.__dbestMapV10){
  try{
   const origMap=window.L.map;
   window.L.map=function(id,opts){return origMap.call(this,id,Object.assign({},opts||{},{preferCanvas:false}))};
   window.L.__dbestMapV10=true;
  }catch(e){}
 }
 if(!window.L.__dbestRouteV10){
  try{
   const orig=window.L.polyline;
   window.L.polyline=function(latlngs,opts){
    const o=Object.assign({},opts||{});
    o.color='#00d9ff';o.weight=Math.max(Number(o.weight)||5,8);o.opacity=1;o.lineCap='round';o.lineJoin='round';
    return orig.call(this,latlngs,o);
   };
   window.L.__dbestRouteV10=true;
  }catch(e){}
 }
}
function polish(){
 installRouteFetchGuard();
 patchLeaflet();
 if(!document.getElementById('dbest-cab-v10-polish')){
  const st=document.createElement('style');
  st.id='dbest-cab-v10-polish';
  st.textContent=`
  .cab6MapShade{display:none!important}
  .cab6Page .leaflet-tile-pane{filter:brightness(1.14) contrast(.96) saturate(.9)!important}
  .cab6Page .leaflet-overlay-pane{z-index:560!important}
  .cab6Page .leaflet-marker-pane{z-index:620!important}
  .cab6Page .leaflet-tooltip-pane,.cab6Page .leaflet-popup-pane{z-index:700!important}
  .cab6Page .leaflet-control-container{position:relative;z-index:900!important}
  .cab6Page .leaflet-overlay-pane path{stroke:#00d9ff!important;stroke-width:8px!important;stroke-opacity:1!important;filter:drop-shadow(0 0 4px rgba(0,217,255,.95))}
  .cab6Veh .photo,.cab6VehicleHero .pic{background:#fff!important}
  .cab6Veh img,.cab6VehicleHero img{object-fit:contain!important;background:#fff!important;filter:drop-shadow(0 5px 5px rgba(21,31,70,.16))!important}
  .cab6Veh[data-v="bike"] img{width:112px!important;height:62px!important}
  .cab6Veh[data-v="auto"] img{width:110px!important;height:61px!important}
  .cab6Veh[data-v="mini"] img,.cab6Veh[data-v="sedan"] img,.cab6Veh[data-v="suv"] img{width:112px!important;height:62px!important}
  .cab6Veh b{line-height:1.08!important}
  `;
  document.head.appendChild(st);
 }
 document.querySelectorAll('.cab6Veh[data-v]').forEach(card=>{
  const k=card.dataset.v,img=card.querySelector('img'),label=card.querySelector('b');
  if(img&&REALISTIC[k]&&img.src!==REALISTIC[k])img.src=REALISTIC[k];
  if(k==='auto'&&label)label.textContent='Auto/E-Rickshaw';
 });
 document.querySelectorAll('.cab6VehicleHero').forEach(hero=>{
  const label=hero.querySelector('b'),k=vehicleKeyFromText(label&&label.textContent),img=hero.querySelector('img');
  if(img&&k&&REALISTIC[k]&&img.src!==REALISTIC[k])img.src=REALISTIC[k];
  if(k==='auto'&&label)label.textContent='Auto/E-Rickshaw';
 });
 document.querySelectorAll('.cab6Book').forEach(el=>{if(/\bAuto\b/.test(el.textContent||''))el.textContent=(el.textContent||'').replace(/\bAuto\b/g,'Auto/E-Rickshaw')});
 const rental=document.getElementById('cab6RentalPkg');
 if(rental&&!Array.from(rental.options).some(o=>o.value==='12|120')){
  const op=document.createElement('option');op.value='12|120';op.textContent='12 Hours / 120 km';rental.appendChild(op);
 }
}
function bind(a){
 if(!a||typeof a.open!=='function')return;
 api=a;
 const guard=name=>{try{Object.defineProperty(window,name,{configurable:true,enumerable:true,get(){return api},set(v){if(v===api)api=v}})}catch(e){try{window[name]=api}catch(_){}}};
 guard('DBEST_CAB_GOOGLE');guard('DBEST_CAB_MAPPLS_RENTAL');
 try{Object.defineProperty(window,'openRidePlatform',{configurable:true,enumerable:true,get(){return api.open},set(){}})}catch(e){window.openRidePlatform=api.open}
 window.DBEST_CAB_SELECTED_UI=api;
 window.DBEST_ACTIVE_CAB_VERSION='SELECTED_REALMAP_V10';
 polish();
}
function ensure(){
 if(window.DBEST_CAB_SELECTED_UI&&window.DBEST_CAB_SELECTED_UI.version===BASE){bind(window.DBEST_CAB_SELECTED_UI);return Promise.resolve(window.DBEST_CAB_SELECTED_UI)}
 if(loading)return loading;
 loading=new Promise((resolve,reject)=>{
  const old=document.getElementById('dbest-selected-cab-v6-script');if(old)old.remove();
  const s=document.createElement('script');s.id='dbest-selected-cab-v6-script';s.src='/cab-selected-ui-v3.js?v='+BASE+'&t='+Date.now();s.async=false;
  s.onload=()=>{const a=window.DBEST_CAB_SELECTED_UI;if(a&&a.version===BASE){bind(a);resolve(a)}else reject(new Error('selected cab base unavailable'))};
  s.onerror=reject;document.body.appendChild(s);
 }).catch(e=>{loading=null;console.warn('DBest selected cab loader',e);throw e});
 return loading;
}
installRouteFetchGuard();
ensure().catch(()=>{});
const mo=new MutationObserver(()=>polish());mo.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
const t=setInterval(()=>{polish();if(api)bind(api);else ensure().catch(()=>{})},120);
setTimeout(()=>{clearInterval(t);setInterval(()=>{polish();if(api)bind(api)},1800)},22000);
addEventListener('pageshow',()=>{polish();if(api)bind(api)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){polish();if(api)bind(api)}});
window.DBEST_CAB_PLANNED_UI={version:V,ensure,polish};
})();