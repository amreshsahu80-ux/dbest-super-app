(function(){
'use strict';
const BASE='20260905-selected-realmap-v6';
const V='20260906-selected-realmap-v9';
const REALISTIC={
  bike:'https://images.tractorjunction.com/GLOSS_BLACK_4c0619d5ab.png?format=webp&height=424&width=760',
  mini:'https://media.mijnwinkel-api.nl/resizer2/2525200/pictures/CS280003-Stootlijsten-set-breed-zwart-Suzuki-Swift-04.2024-1-wxh.jpg?version=1',
  sedan:'https://www.autobics.com/wp-content/uploads/2017/05/2017-maruti-suzuki-dzire-pearl-arctic-white.jpg',
  suv:'https://images.91wheels.com/assets/c_images/gallery/toyota/innova-crysta/toyota-innova-crysta-4-1767849001.png?q=40&w=850'
};
let api=null,loading=null;

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
 if(!window.L.__dbestMapV9){
  try{
   const origMap=window.L.map;
   window.L.map=function(id,opts){
    const o=Object.assign({},opts||{},{preferCanvas:false});
    return origMap.call(this,id,o);
   };
   window.L.__dbestMapV9=true;
  }catch(e){}
 }
 if(!window.L.__dbestRouteV9){
  try{
   const orig=window.L.polyline;
   window.L.polyline=function(latlngs,opts){
    const o=Object.assign({},opts||{});
    o.color='#00d9ff';
    o.weight=Math.max(Number(o.weight)||5,8);
    o.opacity=1;
    o.lineCap='round';
    o.lineJoin='round';
    return orig.call(this,latlngs,o);
   };
   window.L.__dbestRouteV9=true;
  }catch(e){}
 }
}

function polish(){
 patchLeaflet();
 if(!document.getElementById('dbest-cab-v9-polish')){
  const st=document.createElement('style');
  st.id='dbest-cab-v9-polish';
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
  const k=card.dataset.v;
  const img=card.querySelector('img');
  if(img&&REALISTIC[k]&&img.src!==REALISTIC[k])img.src=REALISTIC[k];
  const label=card.querySelector('b');
  if(k==='auto'&&label)label.textContent='Auto/E-Rickshaw';
 });

 document.querySelectorAll('.cab6VehicleHero').forEach(hero=>{
  const label=hero.querySelector('b');
  const k=vehicleKeyFromText(label?.textContent);
  const img=hero.querySelector('img');
  if(img&&k&&REALISTIC[k]&&img.src!==REALISTIC[k])img.src=REALISTIC[k];
  if(k==='auto'&&label)label.textContent='Auto/E-Rickshaw';
 });

 document.querySelectorAll('.cab6Book').forEach(el=>{
  if(/\bAuto\b/.test(el.textContent||''))el.textContent=(el.textContent||'').replace(/\bAuto\b/g,'Auto/E-Rickshaw');
 });

 const rental=document.getElementById('cab6RentalPkg');
 if(rental&&!Array.from(rental.options).some(o=>o.value==='12|120')){
  const op=document.createElement('option');
  op.value='12|120';
  op.textContent='12 Hours / 120 km';
  rental.appendChild(op);
 }
}

function bind(a){
 if(!a||typeof a.open!=='function')return;
 api=a;
 const guard=name=>{try{Object.defineProperty(window,name,{configurable:true,enumerable:true,get(){return api},set(v){if(v===api)api=v}})}catch(e){try{window[name]=api}catch(_){}}};
 guard('DBEST_CAB_GOOGLE');guard('DBEST_CAB_MAPPLS_RENTAL');
 try{Object.defineProperty(window,'openRidePlatform',{configurable:true,enumerable:true,get(){return api.open},set(v){}})}catch(e){window.openRidePlatform=api.open}
 window.DBEST_CAB_SELECTED_UI=api;
 window.DBEST_ACTIVE_CAB_VERSION='SELECTED_REALMAP_V9';
 polish();
}

function ensure(){
 if(window.DBEST_CAB_SELECTED_UI?.version===BASE){
  bind(window.DBEST_CAB_SELECTED_UI);
  return Promise.resolve(window.DBEST_CAB_SELECTED_UI);
 }
 if(loading)return loading;
 loading=new Promise((resolve,reject)=>{
  const old=document.getElementById('dbest-selected-cab-v6-script');if(old)old.remove();
  const s=document.createElement('script');
  s.id='dbest-selected-cab-v6-script';
  s.src='/cab-selected-ui-v3.js?v='+BASE+'&t='+Date.now();
  s.async=false;
  s.onload=()=>{const a=window.DBEST_CAB_SELECTED_UI;if(a?.version===BASE){bind(a);resolve(a)}else reject(new Error('selected cab base unavailable'))};
  s.onerror=reject;
  document.body.appendChild(s);
 }).catch(e=>{loading=null;console.warn('DBest selected cab loader',e);throw e});
 return loading;
}

ensure().catch(()=>{});
const mo=new MutationObserver(()=>polish());
mo.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
const t=setInterval(()=>{polish();if(api)bind(api);else ensure().catch(()=>{})},120);
setTimeout(()=>{clearInterval(t);setInterval(()=>{polish();api&&bind(api)},1800)},22000);
addEventListener('pageshow',()=>{polish();api&&bind(api)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){polish();api&&bind(api)}});
window.DBEST_CAB_PLANNED_UI={version:V,ensure,polish};
})();