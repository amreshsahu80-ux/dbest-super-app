(function(){
'use strict';
const VERSION='20260906-selected-v13-initial-map-v3-rental-fix';
const PACKS=[
 {value:'2|20',hours:2,km:20,label:'2 Hours / 20 km'},
 {value:'4|40',hours:4,km:40,label:'4 Hours / 40 km'},
 {value:'8|80',hours:8,km:80,label:'8 Hours / 80 km'},
 {value:'12|120',hours:12,km:120,label:'12 Hours / 120 km'}
];
const DEFAULT_RIDE={surge:1,platformFee:15,taxPercent:0,vehicles:[
 {id:'bike',name:'Bike',base:22,perKm:8,minFare:30},
 {id:'auto',name:'Auto/E-Rickshaw',base:35,perKm:12,minFare:50},
 {id:'mini',name:'Mini',base:55,perKm:15,minFare:80},
 {id:'sedan',name:'Sedan',base:75,perKm:18,minFare:110},
 {id:'suv',name:'SUV',base:105,perKm:23,minFare:160}
]};
let map=null,marker=null,leafletWait=null,mountBusy=false;
let rental={active:false,value:'2|20'};
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
function addCss(href,id){if($(id))return;const l=document.createElement('link');l.id=id;l.rel='stylesheet';l.href=href;document.head.appendChild(l)}
function loadJs(src,id,timeout=5200){
  return new Promise((resolve,reject)=>{
    if(window.L)return resolve(window.L);
    let old=$(id);
    if(old){const done=()=>window.L?resolve(window.L):reject(new Error('Leaflet unavailable'));old.addEventListener('load',done,{once:true});old.addEventListener('error',()=>reject(new Error('Leaflet unavailable')),{once:true});setTimeout(done,timeout);return}
    const s=document.createElement('script');s.id=id;s.src=src;s.async=true;const t=setTimeout(()=>reject(new Error('Leaflet timeout')),timeout);
    s.onload=()=>{clearTimeout(t);window.L?resolve(window.L):reject(new Error('Leaflet unavailable'))};s.onerror=()=>{clearTimeout(t);reject(new Error('Leaflet unavailable'))};document.head.appendChild(s)
  })
}
async function ensureLeaflet(){
  if(window.L)return window.L;if(leafletWait)return leafletWait;
  addCss('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css','dbest-cab-leaflet-css-v2');
  leafletWait=(async()=>{try{return await loadJs('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js','dbest-cab-leaflet-js-v2',5200)}catch(e){return await loadJs('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','dbest-cab-leaflet-js-v2-fallback',5200)}})().catch(e=>{leafletWait=null;throw e});
  return leafletWait
}
function removeMap(){try{map&&map.remove&&map.remove()}catch(e){}map=null;marker=null}
function setLabel(text){const el=$('cab13SearchMapLabel');if(el)el.textContent=text||'Live pickup map'}
function pin(lat,lng,label){
  if(!map||!window.L||!Number.isFinite(lat)||!Number.isFinite(lng))return;
  const pos=[lat,lng];if(marker)marker.setLatLng(pos);else marker=L.circleMarker(pos,{radius:8,weight:4,color:'#fff',fillColor:'#1cc8e8',fillOpacity:1}).addTo(map);
  map.setView(pos,15,{animate:true});setLabel(label||'Your current pickup area');setTimeout(()=>map&&map.invalidateSize&&map.invalidateSize(),80)
}
function locate(noisy){
  if(!navigator.geolocation){if(noisy)setLabel('Location unavailable • map ready for manual pickup');return}
  navigator.geolocation.getCurrentPosition(p=>{pin(Number(p.coords.latitude),Number(p.coords.longitude),'Your current pickup area')},()=>{if(noisy)setLabel('Location permission not available • choose pickup manually')},{enableHighAccuracy:true,timeout:9000,maximumAge:30000})
}
async function initMap(){
  const el=$('cab13SearchMap');if(!el||el.dataset.ready==='1')return;
  try{const L=await ensureLeaflet();if(!$('cab13SearchMap'))return;removeMap();map=L.map(el,{zoomControl:true,attributionControl:true,preferCanvas:false}).setView([22.5937,78.9629],5);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);el.dataset.ready='1';setTimeout(()=>map&&map.invalidateSize&&map.invalidateSize(),100);locate(false)}
  catch(e){if(el)el.innerHTML='<div class="cab13SearchMapFallback"><div><b>Map is reconnecting…</b><br><small>You can still enter pickup and destination.</small></div></div>'}
}
function bindGpsButton(){const b=$('cab6Gps');if(!b||b.dataset.dbestMapBind==='1')return;b.dataset.dbestMapBind='1';b.addEventListener('click',()=>setTimeout(()=>locate(true),50),{passive:true})}
function readRideConfig(){
  try{const x=JSON.parse(localStorage.getItem('d2_ride_config')||'null');if(x&&Array.isArray(x.vehicles)&&x.vehicles.length)return x}catch(e){}
  return DEFAULT_RIDE
}
function rentalPack(){return PACKS.find(x=>x.value===rental.value)||PACKS[0]}
function ownerFare(vehicleId,km){
  const c=readRideConfig(),v=(c.vehicles||[]).find(x=>x.id===vehicleId)||DEFAULT_RIDE.vehicles.find(x=>x.id===vehicleId);if(!v)return null;
  let n=Math.max(Number(v.minFare||0),Number(v.base||0)+Number(v.perKm||0)*Number(km||0));n*=Number(c.surge||1);n+=Number(c.platformFee||0);n*=1+Number(c.taxPercent||0)/100;return Math.round(n)
}
function syncRentalControls(){
  const sel=$('cab6RentalPkg'),btn=document.querySelector('[data-q="rental"]');
  if(sel){
    const before=PACKS.some(p=>p.value===sel.value)?sel.value:rental.value;
    if(sel.dataset.dbestRentalFixed!=='1'){
      sel.innerHTML=PACKS.map(p=>`<option value="${p.value}">${p.label}</option>`).join('');sel.dataset.dbestRentalFixed='1';
      sel.addEventListener('change',()=>{if(PACKS.some(p=>p.value===sel.value)){rental.value=sel.value;try{sessionStorage.setItem('dbest_rental_pkg_v1',rental.value)}catch(e){}}})
    }
    rental.value=PACKS.some(p=>p.value===before)?before:(PACKS.some(p=>p.value===rental.value)?rental.value:PACKS[0].value);sel.value=rental.value;
    try{sessionStorage.setItem('dbest_rental_pkg_v1',rental.value)}catch(e){}
  }else{try{const s=sessionStorage.getItem('dbest_rental_pkg_v1');if(PACKS.some(p=>p.value===s))rental.value=s}catch(e){}}
  if(btn&&btn.dataset.dbestRentalBind!=='1'){
    btn.dataset.dbestRentalBind='1';btn.addEventListener('click',()=>setTimeout(()=>{rental.active=btn.classList.contains('on');if(sel&&PACKS.some(p=>p.value===sel.value))rental.value=sel.value;patchRentalDisplay()},0))
  }
  if(btn)rental.active=btn.classList.contains('on')
}
function rentalScreenActive(){
  if(rental.active)return true;
  const pill=String(document.querySelector('.cab6RoutePill')?.textContent||'');
  const row=String(Array.from(document.querySelectorAll('.cab6RouteRow')).map(x=>x.textContent||'').join(' '));
  return /\b(2|4|8|12)\s*Hours?\s*\/\s*(20|40|80|120)\s*km\b/i.test(pill+' '+row)
}
function vehicleIdFromName(name){name=String(name||'').toLowerCase();if(name.includes('bike'))return'bike';if(name.includes('auto')||name.includes('rickshaw'))return'auto';if(name.includes('mini'))return'mini';if(name.includes('sedan'))return'sedan';if(name.includes('suv'))return'suv';return''}
function patchRentalDisplay(){
  if(!rentalScreenActive())return;
  const p=rentalPack();
  const km=$('cab13Km'),mn=$('cab13Min'),st=$('cab13Status');if(km)km.textContent=p.km+' km';if(mn)mn.textContent=p.hours+' hr';if(st){st.textContent=p.label+' included';st.className='cab13Status ok'}
  document.querySelectorAll('.cab6Veh[data-v]').forEach(card=>{const id=card.dataset.v,amt=ownerFare(id,p.km),strong=card.querySelector('strong');if(strong&&amt!=null)strong.textContent='₹'+amt});
  const hero=document.querySelector('.cab6VehicleHero b'),id=vehicleIdFromName(hero?.textContent),amt=id?ownerFare(id,p.km):null;
  const fare=document.querySelector('.cab6Confirm .cab6Fare strong');if(fare&&amt!=null)fare.textContent='₹'+amt;
  const detail=document.querySelector('.cab6Confirm .cab6Fare>div:last-child');if(detail)detail.innerHTML=p.km+'.0 km<br>'+p.hours+' hr';
  const pkgRow=Array.from(document.querySelectorAll('.cab6RouteRow')).find(x=>/package/i.test(String(x.querySelector('small')?.textContent||'')));if(pkgRow){const b=pkgRow.querySelector('b');if(b)b.textContent=p.label}
}
function mount(){
  syncRentalControls();patchRentalDisplay();
  const search=document.querySelector('.cab6Page .cab6Search');
  if(!search){if(!document.body.contains($('cab13SearchMapFrame')))removeMap();return}
  if(mountBusy)return;mountBusy=true;addStyle();let frame=$('cab13SearchMapFrame');
  if(!frame){frame=document.createElement('div');frame.id='cab13SearchMapFrame';frame.className='cab13SearchMapFrame';frame.innerHTML='<div id="cab13SearchMap" class="cab13SearchMap"></div><div id="cab13SearchMapLabel" class="cab13SearchMapLabel">Finding your pickup area…</div>';search.parentNode.insertBefore(frame,search)}
  bindGpsButton();initMap().finally(()=>{mountBusy=false})
}
function watch(){
  const mo=new MutationObserver(()=>mount());const start=()=>{mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});mount()};
  if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(mount,80)});window.addEventListener('pageshow',()=>setTimeout(mount,80));setInterval(()=>{syncRentalControls();patchRentalDisplay()},500)
}
function init(){addStyle();watch()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.DBEST_CAB_MODERN_UI={version:VERSION,refresh:mount,locate:()=>locate(true),rental:{packages:PACKS,refresh:()=>{syncRentalControls();patchRentalDisplay()}}};
})();