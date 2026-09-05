(function(){
'use strict';

const BASE='20260905-selected-realmap-v6';
const VERSION='20260906-selected-realmap-v12';
const VEH=[
 {id:'bike',name:'Bike',seats:1,base:35,km:8,min:45,img:'https://images.tractorjunction.com/GLOSS_BLACK_4c0619d5ab.png?format=webp&height=424&width=760'},
 {id:'auto',name:'Auto/E-Rickshaw',seats:3,base:45,km:12,min:60,img:'https://wallpapers.com/images/high/yellow-black-auto-rickshaw-side-view-png-i1udu28purzkrd2x-i1udu28purzkrd2x.png'},
 {id:'mini',name:'Mini',seats:4,base:65,km:15,min:90,img:'https://media.mijnwinkel-api.nl/resizer2/2525200/pictures/CS280003-Stootlijsten-set-breed-zwart-Suzuki-Swift-04.2024-1-wxh.jpg?version=1'},
 {id:'sedan',name:'Sedan',seats:4,base:85,km:18,min:120,img:'https://www.autobics.com/wp-content/uploads/2017/05/2017-maruti-suzuki-dzire-pearl-arctic-white.jpg'},
 {id:'suv',name:'SUV',seats:6,base:110,km:22,min:150,img:'https://images.91wheels.com/assets/c_images/gallery/toyota/innova-crysta/toyota-innova-crysta-4-1767849001.png?q=40&w=850'}
];
const FS={
 p:null,d:null,route:null,selected:'mini',mode:'ride',
 rentalHours:2,rentalKm:20,schedule:'now',scheduledAt:'',
 rider:'self',riderName:'',riderMobile:'',map:null
};
let api=null,loading=null,boundButton=null;
const $=id=>document.getElementById(id);
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cfg=()=>window.DBEST_RUNTIME_CONFIG||{};
const say=m=>{try{typeof window.toast==='function'?window.toast(m):alert(m)}catch(e){alert(m)}};

function clearCabLoadingOverlay(){
 if(!q('.cab6Page'))return;
 qa('body *').forEach(el=>{
   const text=String(el.textContent||'').trim();
   if(!/^Loading(?:\.\.\.|…)?$/i.test(text))return;
   let n=el;
   for(let i=0;i<6&&n&&n!==document.body;i++,n=n.parentElement){
     try{
       const cs=getComputedStyle(n);
       const z=parseInt(cs.zIndex||'0',10)||0;
       if(cs.position==='fixed'&&z>=100){
         n.style.setProperty('display','none','important');
         break;
       }
     }catch(e){}
   }
 });
}

function ensureStyle(){
 if($('dbest-cab-v12-style'))return;
 const st=document.createElement('style');
 st.id='dbest-cab-v12-style';
 st.textContent=`
 .cab6MapShade{display:none!important}
 .cab6Veh .photo,.cab6VehicleHero .pic{background:#fff!important}
 .cab6Veh img,.cab6VehicleHero img{object-fit:contain!important;background:#fff!important;filter:drop-shadow(0 5px 5px rgba(21,31,70,.16))!important}
 .cab6Veh[data-v="bike"] img{width:112px!important;height:62px!important}
 .cab6Veh[data-v="auto"] img{width:110px!important;height:61px!important}
 .cab6Veh[data-v="mini"] img,.cab6Veh[data-v="sedan"] img,.cab6Veh[data-v="suv"] img{width:112px!important;height:62px!important}
 .cab6Veh b{line-height:1.08!important}
 .cab12RouteNote{font-size:9px;color:#6f7890;margin:3px 2px 10px}
 .cab12MapFallback{height:100%;display:grid;place-items:center;text-align:center;padding:20px;color:#fff;background:linear-gradient(145deg,#17204d,#273b79)}
 `;
 document.head.appendChild(st);
}

function header(backExpr){
 return `<div class="cab6Top"><button type="button" onclick="${backExpr}">← Back</button><img class="cab6Logo" src="/dbest-logo.png" alt="DBest"><button type="button" onclick="backHome()">⌂ Home</button></div>`;
}
function screen(body,backExpr='DBEST_CAB_SELECTED_UI.open()'){
 ensureStyle();
 try{if(FS.map&&FS.map.remove)FS.map.remove()}catch(e){}
 FS.map=null;
 if(typeof window.sectionScreen==='function'){
   window.sectionScreen(`<div class="cab6Page">${header(backExpr)}<div class="cab6Wrap">${body}</div></div>`);
 }else{
   document.body.innerHTML=`<div class="cab6Page">${header(backExpr)}<div class="cab6Wrap">${body}</div></div>`;
 }
 clearCabLoadingOverlay();
}

function rawFetch(){
 return window.__DBEST_NATIVE_FETCH_V12||(window.__DBEST_NATIVE_FETCH_V12=window.fetch.bind(window));
}
async function fetchTextTimeout(url,opt={},ms=3500){
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),ms);
 try{
   const r=await rawFetch()(url,Object.assign({},opt,{signal:c.signal,cache:'no-store'}));
   const text=await Promise.race([
     r.text(),
     new Promise((_,rej)=>setTimeout(()=>rej(new Error('response timeout')),Math.max(800,ms-250)))
   ]);
   return {ok:r.ok,status:r.status,text};
 }finally{clearTimeout(timer)}
}
async function geocodeText(text){
 text=String(text||'').trim();
 if(text.length<3)throw new Error('Location is too short.');
 const base=String(cfg().supabaseUrl||'').replace(/\/$/,'');
 const key=String(cfg().supabasePublishableKey||cfg().supabaseAnonKey||'');
 if(base){
   try{
     const rr=await fetchTextTimeout(base+'/functions/v1/location-search-live',{
       method:'POST',
       headers:{'content-type':'application/json',apikey:key},
       body:JSON.stringify({q:text})
     },2600);
     const j=JSON.parse(rr.text||'{}'),x=(j.results||[])[0];
     const lat=Number(x&&x.lat),lng=Number(x&&(x.lon??x.lng));
     if(Number.isFinite(lat)&&Number.isFinite(lng))return{lat,lng,label:x.label||x.detail||text};
   }catch(e){}
 }
 try{
   const u='https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=in&limit=1&q='+encodeURIComponent(text);
   const rr=await fetchTextTimeout(u,{headers:{Accept:'application/json','Accept-Language':'en'}},3000);
   const a=JSON.parse(rr.text||'[]'),x=a&&a[0];
   const lat=Number(x&&x.lat),lng=Number(x&&x.lon);
   if(Number.isFinite(lat)&&Number.isFinite(lng))return{lat,lng,label:x.display_name||text};
 }catch(e){}
 throw new Error('Could not locate '+text);
}
function haversine(a,b){
 const R=6371,rad=x=>x*Math.PI/180;
 const dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng);
 const z=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
 return R*2*Math.atan2(Math.sqrt(z),Math.sqrt(1-z));
}
function estimatedRoute(a,b){
 const km=Math.max(.5,haversine(a,b)*1.25);
 return {km,min:Math.max(3,Math.round(km/30*60+5)),geo:[[a.lng,a.lat],[b.lng,b.lat]],source:'Estimated route'};
}
async function roadRoute(a,b){
 const u=`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
 try{
   const rr=await fetchTextTimeout(u,{},4300);
   const j=JSON.parse(rr.text||'{}'),x=j&&j.routes&&j.routes[0];
   if(rr.ok&&x&&Number(x.distance)>0){
     return {
       km:Number(x.distance)/1000,
       min:Math.max(1,Math.round(Number(x.duration||0)/60)),
       geo:(x.geometry&&x.geometry.coordinates)||[],
       source:'Real road route'
     };
   }
 }catch(e){console.warn('DBest Cab road route fallback',e&&e.message)}
 return estimatedRoute(a,b);
}

function readSearchPreferences(){
 FS.mode=q('[data-q="rental"].on')?'rental':'ride';
 FS.schedule=q('[data-q="schedule"].on')?'later':'now';
 FS.scheduledAt=$('cab6At')?.value||'';
 FS.rider=q('[data-q="other"].on')?'other':'self';
 FS.riderName=String($('cab6Name')?.value||'').trim();
 FS.riderMobile=String($('cab6Mobile')?.value||'').replace(/\D/g,'').slice(0,10);
 const pkg=$('cab6RentalPkg')?.value||'2|20';
 const [h,k]=pkg.split('|').map(Number);
 FS.rentalHours=Number.isFinite(h)?h:2;
 FS.rentalKm=Number.isFinite(k)?k:20;
}
function fare(v){
 const km=Number(FS.route&&FS.route.km)||FS.rentalKm;
 return Math.round(Math.max(v.min,v.base+v.km*km));
}
function vehCard(v){
 return `<button type="button" class="cab6Veh ${FS.selected===v.id?'on':''}" data-v="${v.id}">
   <span class="photo"><img src="${v.img}" alt="${esc(v.name)}" loading="eager"></span>
   <b>${esc(v.name)}</b><small>${v.seats} seat${v.seats>1?'s':''}</small><strong>₹${fare(v)}</strong>
 </button>`;
}
function mapBlock(title){
 return `<div class="cab6MapFrame"><div id="cab12Map" class="cab6Map"></div><div class="cab6RoutePill">${esc(title)}</div></div>`;
}
let leafletPromise=null;
function loadLeaflet(){
 if(window.L)return Promise.resolve(window.L);
 if(leafletPromise)return leafletPromise;
 if(!$('cab12-leaflet-css')){
   const l=document.createElement('link');l.id='cab12-leaflet-css';l.rel='stylesheet';l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(l);
 }
 leafletPromise=new Promise((resolve,reject)=>{
   const existing=$('cab12-leaflet-js')||$('cab6-leaflet');
   if(existing){
     if(window.L)return resolve(window.L);
     const t=setTimeout(()=>reject(new Error('Map library timeout')),3500);
     existing.addEventListener('load',()=>{clearTimeout(t);window.L?resolve(window.L):reject(new Error('Map unavailable'))},{once:true});
     existing.addEventListener('error',()=>{clearTimeout(t);reject(new Error('Map unavailable'))},{once:true});
     return;
   }
   const s=document.createElement('script');s.id='cab12-leaflet-js';s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.async=true;
   const t=setTimeout(()=>{try{s.remove()}catch(e){};reject(new Error('Map library timeout'))},3800);
   s.onload=()=>{clearTimeout(t);window.L?resolve(window.L):reject(new Error('Map unavailable'))};
   s.onerror=()=>{clearTimeout(t);reject(new Error('Map unavailable'))};
   document.head.appendChild(s);
 });
 return leafletPromise;
}
async function renderMap(){
 const el=$('cab12Map');if(!el)return;
 try{
   const L=await loadLeaflet();
   if(!q('#cab12Map'))return;
   try{if(FS.map)FS.map.remove()}catch(e){}
   FS.map=L.map(el,{zoomControl:true,attributionControl:true,preferCanvas:false});
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(FS.map);
   const p=FS.p,d=FS.d;
   if(FS.mode==='rental'||!d){
     FS.map.setView([p.lat,p.lng],14);
     L.circleMarker([p.lat,p.lng],{radius:8,weight:4,color:'#fff',fillColor:'#1cc8e8',fillOpacity:1}).addTo(FS.map);
   }else{
     const pts=(FS.route.geo||[]).map(c=>[c[1],c[0]]);
     let line=null;
     if(pts.length>1)line=L.polyline(pts,{weight:7,opacity:1,color:'#00bde8',lineCap:'round',lineJoin:'round'}).addTo(FS.map);
     L.circleMarker([p.lat,p.lng],{radius:8,weight:4,color:'#fff',fillColor:'#1cc8e8',fillOpacity:1}).addTo(FS.map);
     L.circleMarker([d.lat,d.lng],{radius:8,weight:4,color:'#fff',fillColor:'#ff5468',fillOpacity:1}).addTo(FS.map);
     if(line)FS.map.fitBounds(line.getBounds(),{padding:[34,34]});
     else FS.map.fitBounds([[p.lat,p.lng],[d.lat,d.lng]],{padding:[34,34]});
   }
   setTimeout(()=>FS.map&&FS.map.invalidateSize&&FS.map.invalidateSize(),100);
 }catch(e){
   el.innerHTML=`<div class="cab12MapFallback"><div><b>Route ready</b><br><small>${esc(FS.route?.source||'Map unavailable')}</small></div></div>`;
 }
}

function renderVehicles(){
 clearCabLoadingOverlay();
 const title=FS.mode==='rental'
   ?`${FS.p.label} → ${FS.rentalHours} Hours / ${FS.rentalKm} km`
   :`${FS.p.label} → ${FS.d.label}`;
 const source=FS.route.source||'Route';
 screen(`${mapBlock(title)}
 <div class="cab6Sheet">
  <div class="cab6SheetHead"><b>Choose a ride</b><small>Upfront fare</small></div>
  <div class="cab6Meta">
   <div><small>${FS.mode==='rental'?'Included distance':'Road distance'}</small><b>${FS.route.km.toFixed(1)} km</b></div>
   <div><small>${FS.mode==='rental'?'Rental duration':'Travel time'}</small><b>${FS.mode==='rental'?FS.rentalHours+' hr':'~'+FS.route.min+' min'}</b></div>
  </div>
  <div class="cab12RouteNote">${esc(source)}</div>
  <div class="cab6Vehicles">${VEH.map(vehCard).join('')}</div>
  <button type="button" id="cab12Continue" class="cab6Book">Continue with ${esc(VEH.find(v=>v.id===FS.selected)?.name||'Ride')}</button>
 </div>`,'DBEST_CAB_SELECTED_UI.open()');
 qa('.cab6Veh[data-v]').forEach(card=>card.onclick=()=>{
   FS.selected=card.dataset.v;
   qa('.cab6Veh[data-v]').forEach(x=>x.classList.toggle('on',x===card));
   const v=VEH.find(x=>x.id===FS.selected);
   const b=$('cab12Continue');if(b)b.textContent='Continue with '+(v?v.name:'Ride');
 });
 $('cab12Continue').onclick=()=>renderConfirm();
 setTimeout(renderMap,20);
}

function renderConfirm(){
 const v=VEH.find(x=>x.id===FS.selected)||VEH[2];
 const title=FS.mode==='rental'
   ?`${FS.rentalHours} Hours / ${FS.rentalKm} km`
   :`${FS.p.label} → ${FS.d.label}`;
 screen(`${mapBlock(title)}
 <div class="cab6Confirm">
  <div class="cab6VehicleHero">
   <div class="pic"><img src="${v.img}" alt="${esc(v.name)}"></div>
   <div><b style="font-size:16px">${esc(v.name)}</b><div style="font-size:9px;color:#7d8597">${v.seats} seats • ${FS.mode==='rental'?FS.rentalHours+' hr':'~'+FS.route.min+' min'}</div></div>
  </div>
  <div class="cab6RouteRow"><small>Pickup</small><b>${esc(FS.p.label)}</b></div>
  <div class="cab6RouteRow"><small>${FS.mode==='rental'?'Package':'Destination'}</small><b>${esc(FS.mode==='rental'?`${FS.rentalHours} Hours / ${FS.rentalKm} km`:FS.d.label)}</b></div>
  <div class="cab6Fare"><div><small style="color:#858da0;font-size:9px">Estimated fare</small><strong>₹${fare(v)}</strong></div><div style="text-align:right;color:#7c8498;font-size:8px">${FS.route.km.toFixed(1)} km<br>${FS.mode==='rental'?FS.rentalHours+' hr':'~'+FS.route.min+' min'}</div></div>
  <div class="cab6Pay"><label><input type="radio" name="cab12pay" value="cash" checked> Cash</label><label><input type="radio" name="cab12pay" value="upi"> UPI</label></div>
  <button type="button" id="cab12Book" class="cab6Book">Book ${esc(v.name)}</button>
 </div>`,'DBEST_CAB_V12.renderVehicles()');
 $('cab12Book').onclick=()=>book(v.id);
 setTimeout(renderMap,20);
}

function book(id){
 const pay=q('input[name="cab12pay"]:checked')?.value||'cash';
 const v=VEH.find(x=>x.id===id)||VEH[2];
 try{
   window.rideDraft=window.rideDraft||{};
   Object.assign(window.rideDraft,{
     pickup:FS.p.label,
     drop:FS.mode==='rental'?`${FS.rentalHours} Hours / ${FS.rentalKm} km`:FS.d.label,
     pickupCoords:{lat:FS.p.lat,lng:FS.p.lng},
     dropCoords:FS.d?{lat:FS.d.lat,lng:FS.d.lng}:null,
     distance:FS.route.km,
     estimatedMinutes:FS.route.min,
     selected:id,
     schedule:FS.schedule,
     scheduledAt:FS.scheduledAt,
     rider:FS.rider,
     riderName:FS.riderName,
     riderMobile:FS.riderMobile,
     mode:FS.mode,
     bookingType:FS.mode==='rental'?'Rental':'Ride',
     rental:FS.mode==='rental',
     rentalHours:FS.rentalHours,
     rentalKm:FS.rentalKm,
     rentalPackage:FS.mode==='rental'?{label:`${FS.rentalHours} Hours / ${FS.rentalKm} km`,hours:FS.rentalHours,includedKm:FS.rentalKm}:null
   });
   if(typeof window.bookRide==='function'){
     const f=document.createElement('form');
     f.innerHTML=`<input name="payment" value="${esc(pay)}">`;
     return window.bookRide({preventDefault(){},target:f},id);
   }
 }catch(e){console.warn('DBest booking handoff failed',e)}
 say(`Ride details for ${v.name} are ready. Please retry booking.`);
}

async function searchNow(e){
 e&&e.preventDefault&&e.preventDefault();
 readSearchPreferences();
 if(FS.schedule==='later'&&!FS.scheduledAt)return say('Please select schedule date and time.');
 if(FS.rider==='other'&&(!FS.riderName||FS.riderMobile.length!==10))return say('Please enter rider name and 10-digit mobile.');
 const pText=String($('cab6P')?.value||'').trim();
 const dText=String($('cab6D')?.value||'').trim();
 if(!pText)return say('Please enter a pickup location.');
 if(FS.mode!=='rental'&&!dText)return say('Please enter a destination.');
 const b=$('cab6Go');
 if(b){b.disabled=true;b.textContent='Finding route…'}
 clearCabLoadingOverlay();
 const cleaner=setInterval(clearCabLoadingOverlay,120);
 setTimeout(()=>clearInterval(cleaner),7000);
 try{
   if(FS.mode==='rental'){
     FS.p=await Promise.race([geocodeText(pText),new Promise((_,rej)=>setTimeout(()=>rej(new Error('Pickup lookup timed out')),3600))]);
     FS.d=null;
     FS.route={km:FS.rentalKm,min:FS.rentalHours*60,geo:[],source:'Hourly rental package'};
     return renderVehicles();
   }
   const [p,d]=await Promise.race([
     Promise.all([geocodeText(pText),geocodeText(dText)]),
     new Promise((_,rej)=>setTimeout(()=>rej(new Error('Location lookup timed out')),3900))
   ]);
   FS.p=p;FS.d=d;
   FS.route=await Promise.race([
     roadRoute(p,d),
     new Promise(resolve=>setTimeout(()=>resolve(estimatedRoute(p,d)),4700))
   ]);
   renderVehicles();
 }catch(err){
   console.warn('DBest Cab V12 search error',err);
   say('Could not resolve this route quickly. Please choose a location suggestion and try again.');
 }finally{
   clearCabLoadingOverlay();
   if(b&&document.body.contains(b)){b.disabled=false;b.textContent='Search Cabs'}
 }
}

function polish(){
 ensureStyle();
 const rental=$('cab6RentalPkg');
 if(rental&&!Array.from(rental.options).some(o=>o.value==='12|120')){
   const op=document.createElement('option');op.value='12|120';op.textContent='12 Hours / 120 km';rental.appendChild(op);
 }
 qa('.cab6Veh[data-v]').forEach(card=>{
   const v=VEH.find(x=>x.id===card.dataset.v);if(!v)return;
   const img=card.querySelector('img'),label=card.querySelector('b');
   if(img&&img.src!==v.img)img.src=v.img;
   if(label)label.textContent=v.name;
 });
 qa('.cab6VehicleHero').forEach(hero=>{
   const label=hero.querySelector('b');
   const text=String(label?.textContent||'').toLowerCase();
   const v=VEH.find(x=>text.includes(x.id)||text.includes(x.name.toLowerCase().split('/')[0]));
   const img=hero.querySelector('img');
   if(v&&img&&img.src!==v.img)img.src=v.img;
   if(v&&label)label.textContent=v.name;
 });
 const b=$('cab6Go');
 if(b&&b!==boundButton){
   boundButton=b;
   b.onclick=searchNow;
   b.dataset.dbestV12='1';
   b.textContent='Search Cabs';
   b.disabled=false;
 }
 clearCabLoadingOverlay();
}

function bind(a){
 if(!a||typeof a.open!=='function')return;
 api=a;
 try{Object.defineProperty(window,'openRidePlatform',{configurable:true,enumerable:true,get(){return api.open},set(){}})}catch(e){window.openRidePlatform=api.open}
 window.DBEST_CAB_GOOGLE=api;
 window.DBEST_CAB_MAPPLS_RENTAL=api;
 window.DBEST_CAB_SELECTED_UI=api;
 window.DBEST_ACTIVE_CAB_VERSION='SELECTED_REALMAP_V12';
 polish();
}
function ensure(){
 if(window.DBEST_CAB_SELECTED_UI&&window.DBEST_CAB_SELECTED_UI.version===BASE){
   bind(window.DBEST_CAB_SELECTED_UI);
   return Promise.resolve(window.DBEST_CAB_SELECTED_UI);
 }
 if(loading)return loading;
 loading=new Promise((resolve,reject)=>{
   const old=$('dbest-selected-cab-v6-script');if(old)old.remove();
   const s=document.createElement('script');
   s.id='dbest-selected-cab-v6-script';
   s.src='/cab-selected-ui-v3.js?v='+BASE+'&t='+Date.now();
   s.async=false;
   s.onload=()=>{const a=window.DBEST_CAB_SELECTED_UI;if(a&&a.version===BASE){bind(a);resolve(a)}else reject(new Error('selected cab base unavailable'))};
   s.onerror=reject;
   document.body.appendChild(s);
 }).catch(e=>{loading=null;console.warn('DBest selected cab loader',e);throw e});
 return loading;
}

window.DBEST_CAB_V12={version:VERSION,searchNow,renderVehicles,renderConfirm,book,polish,ensure};
ensure().catch(()=>{});
const mo=new MutationObserver(polish);
mo.observe(document.documentElement,{childList:true,subtree:true});
const t=setInterval(polish,180);
setTimeout(()=>{clearInterval(t);setInterval(polish,1200)},25000);
addEventListener('pageshow',polish);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)polish()});
})();