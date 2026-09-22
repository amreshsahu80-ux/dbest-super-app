(function(){
'use strict';
const BASE='20260905-selected-realmap-v6';
const VERSION='20260922-cab-experience-v2-entry-redesign';
const PACKS=[['2|20','2 Hours / 20 km'],['4|40','4 Hours / 40 km'],['8|80','8 Hours / 80 km'],['12|120','12 Hours / 120 km']];
const VEH=[
 {id:'bike',name:'Bike',seats:1,base:35,km:8,min:45,img:'https://images.tractorjunction.com/GLOSS_BLACK_4c0619d5ab.png?format=webp&height=424&width=760'},
 {id:'auto',name:'Auto/E-Rickshaw',seats:3,base:45,km:12,min:60,img:'https://wallpapers.com/images/high/yellow-black-auto-rickshaw-side-view-png-i1udu28purzkrd2x-i1udu28purzkrd2x.png'},
 {id:'mini',name:'Mini',seats:4,base:65,km:15,min:90,img:'https://media.mijnwinkel-api.nl/resizer2/2525200/pictures/CS280003-Stootlijsten-set-breed-zwart-Suzuki-Swift-04.2024-1-wxh.jpg?version=1'},
 {id:'sedan',name:'Sedan',seats:4,base:85,km:18,min:120,img:'https://www.autobics.com/wp-content/uploads/2017/05/2017-maruti-suzuki-dzire-pearl-arctic-white.jpg'},
 {id:'suv',name:'SUV',seats:6,base:110,km:22,min:150,img:'https://images.91wheels.com/assets/c_images/gallery/toyota/innova-crysta/toyota-innova-crysta-4-1767849001.png?q=40&w=850'}
];
const F={p:null,d:null,stops:[],stopTexts:[],route:null,selected:'mini',mode:'ride',rentalHours:2,rentalKm:20,schedule:'now',scheduledAt:'',rider:'self',riderName:'',riderMobile:'',map:null,calculating:false};
let api=null,loader=null,leafletPromise=null,googlePromise=null;
const $=id=>document.getElementById(id),q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cfg=()=>window.DBEST_RUNTIME_CONFIG||{};
function tell(m){try{typeof toast==='function'?toast(m):alert(m)}catch(e){alert(m)}}
function css(){if($('dbest-cab-v16-css'))return;const s=document.createElement('style');s.id='dbest-cab-v16-css';s.textContent=`
.cab13Status{margin:0 2px 10px;padding:8px 10px;border-radius:12px;background:#eef5ff;color:#31507f;font-size:9px;font-weight:800}.cab13Status.ok{background:#ecfdf5;color:#16735f}.cab13Status.warn{background:#fff7ed;color:#9a4b13}
.cab13MapFallback{height:100%;display:grid;place-items:center;text-align:center;padding:20px;color:#fff;background:linear-gradient(145deg,#17204d,#273b79)}
.cab6MapShade{display:none!important}.cab6MapFrame{z-index:1!important}.cab6Confirm{z-index:5!important;margin:14px 7px 0!important}.cab6Veh .photo,.cab6VehicleHero .pic{background:#fff!important}.cab6Veh img,.cab6VehicleHero img{object-fit:contain!important;background:#fff!important;filter:drop-shadow(0 5px 5px rgba(21,31,70,.16))!important}.cab6Veh b{line-height:1.08!important}
.cab6Veh[data-v="bike"] img{width:112px!important;height:62px!important}.cab6Veh[data-v="auto"] img{width:110px!important;height:61px!important}.cab6Veh[data-v="mini"] img,.cab6Veh[data-v="sedan"] img,.cab6Veh[data-v="suv"] img{width:112px!important;height:62px!important}
#cab6Gps{font-size:0!important;flex:0 0 44px!important;width:44px!important;padding:8px!important}#cab6Gps:before{content:'◎';font-size:19px;line-height:1}
#cab6AddStop{width:100%;min-height:42px;border:1px dashed #94a3c7;border-radius:14px;background:#fff;color:#31507f;font-size:11px;font-weight:900;margin:4px 0 8px}
.cab6StopRow{display:grid;grid-template-columns:1fr 38px;gap:7px;align-items:center;margin:7px 0}.cab6StopRow .cab6Field{margin:0}.cab6StopRemove{height:38px;border:1px solid #e1e5ef;border-radius:12px;background:#fff;color:#9b3340;font-weight:900}
.cab6Page{overflow-x:hidden}.cab6MapFrame{transition:height .28s ease}.cab6Sheet{transition:transform .24s ease,opacity .24s ease,margin .24s ease;will-change:transform}.cab6Sheet.dbestSheetIn{animation:dbestSheetIn .28s ease both}@keyframes dbestSheetIn{from{transform:translateY(26px);opacity:.55}to{transform:translateY(0);opacity:1}}
.dbestCabProgress{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:0 0 10px}.dbestCabProgress span{height:4px;border-radius:999px;background:#e8ebf4}.dbestCabProgress span.on{background:linear-gradient(90deg,#1f64f3,#684de8)}
.dbestCabRouteMini{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:10px 11px;margin:0 0 10px;border:1px solid #e8ebf3;border-radius:16px;background:#f8f9fd}.dbestCabRouteMini .dot{width:10px;height:10px;border-radius:50%;background:#20b883;box-shadow:0 0 0 4px #20b88318}.dbestCabRouteMini .dot.drop{background:#f45361;box-shadow:0 0 0 4px #f4536118}.dbestCabRouteMini b{display:block;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dbestCabRouteMini small{display:block;color:#8990a0;font-size:8px}.dbestCabRouteMini .time{font-size:10px;font-weight:900;color:#284276}
.cab6Veh small.dbestPickupEta{margin-top:2px;color:#2d6a57;font-weight:800}.cab6Veh strong{display:flex;align-items:end;justify-content:space-between;gap:4px}.cab6Veh strong em{font-size:8px;font-style:normal;color:#7f8797;font-weight:800}
.dbestCabConfirmHead{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.dbestCabConfirmHead button{border:0;background:#eef2fb;color:#29406c;border-radius:12px;padding:8px 10px;font-size:10px;font-weight:900}.dbestCabConfirmHead b{font-size:18px}
.dbestFinding{display:none;position:absolute;inset:0;z-index:30;border-radius:28px;background:rgba(255,255,255,.96);backdrop-filter:blur(10px);align-items:center;justify-content:center;text-align:center;padding:28px}.dbestFinding.show{display:flex}.dbestFindingPulse{width:64px;height:64px;border-radius:50%;margin:0 auto 13px;background:linear-gradient(135deg,#1f64f3,#6a4de9);position:relative;display:grid;place-items:center;color:#fff;font-size:28px;box-shadow:0 0 0 0 rgba(61,90,230,.35);animation:dbestPulse 1.2s infinite}@keyframes dbestPulse{70%{box-shadow:0 0 0 22px rgba(61,90,230,0)}100%{box-shadow:0 0 0 0 rgba(61,90,230,0)}}.dbestFinding b{display:block;font-size:18px}.dbestFinding small{display:block;margin-top:5px;color:#7d8595;font-size:10px}
#dbestCabEntryMapWrap{position:relative;height:300px;margin:0 0 -44px;border-radius:28px;overflow:hidden;background:linear-gradient(145deg,#dbe9ff,#edf3ff);box-shadow:0 18px 42px rgba(30,55,120,.14)}
#dbestCabEntryMap{position:absolute;inset:0}
#dbestCabEntryMap .entryMapFallback{position:absolute;inset:0;display:grid;place-items:center;text-align:center;color:#42506c;background:
radial-gradient(circle at 25% 25%,rgba(44,177,132,.18),transparent 26%),
linear-gradient(135deg,#edf4ff,#e9eefc 50%,#f6f8ff)}
#dbestCabEntryMap .entryMapFallback:before{content:'';position:absolute;left:9%;right:8%;top:48%;height:7px;border-radius:999px;background:linear-gradient(90deg,#1bc2dc,#2462ee);transform:rotate(-9deg);box-shadow:0 0 0 2px rgba(255,255,255,.6)}
#dbestCabEntryMap .entryMapPin{position:absolute;left:50%;top:45%;transform:translate(-50%,-100%);width:34px;height:34px;border-radius:50% 50% 50% 0;rotate:-45deg;background:#2362ee;box-shadow:0 8px 18px rgba(35,98,238,.3)}
#dbestCabEntryMap .entryMapPin:after{content:'';position:absolute;width:12px;height:12px;border-radius:50%;background:#fff;left:11px;top:11px}
#dbestCabEntryMapWrap .entryMapBadge{position:absolute;z-index:3;left:14px;top:14px;padding:8px 11px;border-radius:999px;background:rgba(16,30,71,.82);color:#fff;font-size:9px;font-weight:900;backdrop-filter:blur(8px)}
#dbestCabEntryMapWrap .entryMapLocate{position:absolute;z-index:3;right:14px;bottom:58px;width:42px;height:42px;border:0;border-radius:14px;background:#fff;color:#2162ef;font-size:19px;box-shadow:0 8px 20px rgba(28,52,110,.18)}
.cab6Search.dbestEntrySheet{position:relative;z-index:6;margin:0 8px;border-radius:28px;padding:15px 14px 18px;background:rgba(255,255,255,.98);box-shadow:0 24px 54px rgba(29,46,100,.2);border:1px solid #e3e8f3}
.cab6Search.dbestEntrySheet .cab6Spark,.cab6Search.dbestEntrySheet .cab6Title,.cab6Search.dbestEntrySheet .cab6Sub{display:none!important}
.dbestEntryHandle{width:42px;height:5px;border-radius:99px;background:#d6dbe7;margin:0 auto 12px}
.dbestEntryHeading{display:flex;align-items:center;justify-content:space-between;margin:0 2px 8px}.dbestEntryHeading b{font-size:17px;color:#17203d}.dbestEntryHeading small{font-size:9px;color:#8490a4}
.cab6Search.dbestEntrySheet .cab6Field{margin:7px 0}.cab6Search.dbestEntrySheet .cab6Field input{min-height:52px;border-radius:16px;background:#fbfcff;font-size:13px}
.cab6Search.dbestEntrySheet .cab6RecentHead{margin-top:10px}
.cab6Search.dbestEntrySheet .cab6Quick{margin:10px 0 12px}.cab6Search.dbestEntrySheet .cab6Quick button{min-height:68px;border-radius:16px}
.cab6Search.dbestEntrySheet .cab6Tools{display:none}
.cab6Search.dbestEntrySheet .cab6Go{position:sticky;bottom:8px;z-index:8;min-height:56px;border-radius:17px;box-shadow:0 12px 28px rgba(51,80,208,.28)}
@media(max-width:480px){#dbestCabEntryMapWrap{height:270px;margin-bottom:-38px}.cab6Search.dbestEntrySheet{margin:0 4px}.cab6Search.dbestEntrySheet .cab6Quick button{font-size:8.5px}}
`;document.head.appendChild(s)}
function header(back){return `<div class="cab6Top"><button type="button" onclick="${back}">← Back</button><img class="cab6Logo" src="/dbest-logo.png" alt="DBest"><button type="button" onclick="backHome()">⌂ Home</button></div>`}
function screen(body,back='DBEST_CAB_SELECTED_UI.open()'){css();try{F.map&&F.map.remove&&F.map.remove()}catch(e){}F.map=null;const html=`<div class="cab6Page">${header(back)}<div class="cab6Wrap">${body}</div></div>`;if(typeof sectionScreen==='function')sectionScreen(html);else document.body.innerHTML=html}
function readPrefs(){F.mode=q('[data-q="rental"].on')?'rental':'ride';F.schedule=q('[data-q="schedule"].on')?'later':'now';F.scheduledAt=$('cab6At')?.value||'';F.rider=q('[data-q="other"].on')?'other':'self';F.riderName=String($('cab6Name')?.value||'').trim();F.riderMobile=String($('cab6Mobile')?.value||'').replace(/\D/g,'').slice(0,10);const pkg=$('cab6RentalPkg')?.value||'2|20',a=pkg.split('|').map(Number);F.rentalHours=a[0]||2;F.rentalKm=a[1]||20}
function xhr(method,url,body,headers,timeout){return new Promise((resolve,reject)=>{const x=new XMLHttpRequest();x.open(method,url,true);x.timeout=timeout||3500;Object.entries(headers||{}).forEach(([k,v])=>{if(v)x.setRequestHeader(k,v)});x.onload=()=>{if(x.status>=200&&x.status<300){try{resolve(JSON.parse(x.responseText||'null'))}catch(e){reject(e)}}else reject(new Error('HTTP '+x.status))};x.onerror=()=>reject(new Error('network'));x.ontimeout=()=>reject(new Error('timeout'));try{x.send(body||null)}catch(e){reject(e)}})}
function googleReady(){return !!(window.google?.maps?.Map&&window.google?.maps?.Geocoder&&window.google?.maps?.DirectionsService)}
function ensureGoogle(timeout=2200){if(googleReady())return Promise.resolve(true);if(googlePromise)return googlePromise;const key=String(cfg().googleMapsApiKey||'').trim();if(!key)return Promise.resolve(false);googlePromise=new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;resolve(googleReady())};const existing=Array.from(document.scripts||[]).find(s=>String(s.src||'').includes('maps.googleapis.com/maps/api/js'));if(existing){existing.addEventListener('load',finish,{once:true});existing.addEventListener('error',finish,{once:true});setTimeout(finish,timeout);return}const s=document.createElement('script');s.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&libraries=places&v=weekly';s.async=true;s.defer=true;s.onload=finish;s.onerror=finish;(document.head||document.documentElement).appendChild(s);setTimeout(finish,timeout)}).finally(()=>{googlePromise=null});return googlePromise}
async function geocodeGoogle(text){if(!await ensureGoogle()||!window.google?.maps?.Geocoder)return null;try{return await new Promise(resolve=>{const g=new google.maps.Geocoder(),t=setTimeout(()=>resolve(null),2200);g.geocode({address:text,componentRestrictions:{country:'IN'}},(rows,status)=>{clearTimeout(t);const r=rows?.[0],l=r?.geometry?.location;resolve(status==='OK'&&l?{label:r.formatted_address||text,lat:l.lat(),lng:l.lng()}:null)})})}catch(e){return null}}
const mapplsKey=()=>String(cfg().mapplsStaticKey||'').trim();
async function mapplsGeocode(text){const key=mapplsKey();if(!key)return null;try{const u='https://search.mappls.com/search/address/geocode?address='+encodeURIComponent(text)+'&itemCount=1&region=IND&access_token='+encodeURIComponent(key),j=await xhr('GET',u,null,{},1800),raw=j?.copResults,x=Array.isArray(raw)?raw[0]:raw;if(!x?.eLoc&&!x?.eloc)return null;return{label:x.formattedAddress||text,eloc:x.eLoc||x.eloc}}catch(e){return null}}
async function mapplsPlaceDetails(p){if(!p?.eloc||!mapplsKey())return p;try{const u='https://place.mappls.com/O2O/entity/place-details/'+encodeURIComponent(p.eloc)+'?access_token='+encodeURIComponent(mapplsKey()),j=await xhr('GET',u,null,{},1600),lat=Number(j?.latitude??j?.lat),lng=Number(j?.longitude??j?.lng??j?.lon);if(Number.isFinite(lat)&&Number.isFinite(lng)){p.lat=lat;p.lng=lng}}catch(e){}return p}
async function geocode(text){text=String(text||'').trim();if(text.length<3)throw new Error('Location too short');const gg=await geocodeGoogle(text);if(gg)return gg;let p=await mapplsGeocode(text);if(p){await mapplsPlaceDetails(p);if(Number.isFinite(p.lat)&&Number.isFinite(p.lng))return p}const c=cfg(),base=String(c.supabaseUrl||'').replace(/\/$/,''),key=String(c.supabasePublishableKey||c.supabaseAnonKey||'');if(base){try{const j=await xhr('POST',base+'/functions/v1/location-search-live',JSON.stringify({q:text}),{'Content-Type':'application/json',apikey:key,Authorization:key?'Bearer '+key:''},1800),x=j&&Array.isArray(j.results)?j.results[0]:null,lat=Number(x&&x.lat),lng=Number(x&&(x.lon??x.lng));if(Number.isFinite(lat)&&Number.isFinite(lng))return{lat,lng,label:x.label||x.detail||text}}catch(e){}}
try{const u='https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=in&limit=1&q='+encodeURIComponent(text),a=await xhr('GET',u,null,{'Accept-Language':'en'},1800),x=a&&a[0],lat=Number(x&&x.lat),lng=Number(x&&x.lon);if(Number.isFinite(lat)&&Number.isFinite(lng))return{lat,lng,label:x.display_name||text}}catch(e){}throw new Error('location unavailable')}
function hav(a,b){if(!a||!b||!Number.isFinite(a.lat)||!Number.isFinite(a.lng)||!Number.isFinite(b.lat)||!Number.isFinite(b.lng))return 10;const R=6371,r=x=>x*Math.PI/180,d1=r(b.lat-a.lat),d2=r(b.lng-a.lng),z=Math.sin(d1/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(d2/2)**2;return R*2*Math.atan2(Math.sqrt(z),Math.sqrt(1-z))}
function realisticEta(km,providerMin){
 const d=Math.max(0,Number(km||0)),p=Math.max(0,Number(providerMin||0));
 // Sanity floor for mixed Indian city/town roads: max practical average ~35 km/h,
 // plus a small junction/pickup buffer. Provider ETA may still be slower.
 const floor=Math.max(5,Math.ceil((d/35)*60+3));
 return Math.max(floor,Math.round(p||0));
}
function estimated(a,b){const km=Math.max(.5,hav(a,b)*1.3);return{km,min:realisticEta(km,Math.round(km/32*60+4)),geo:a&&b&&Number.isFinite(a.lng)&&Number.isFinite(b.lng)?[[a.lng,a.lat],[b.lng,b.lat]]:[],source:'Estimated route'}}
async function googleRoute(a,b){if(!Number.isFinite(a?.lat)||!Number.isFinite(a?.lng)||!Number.isFinite(b?.lat)||!Number.isFinite(b?.lng)||!await ensureGoogle()||!window.google?.maps?.DirectionsService)return null;try{return await new Promise(resolve=>{const svc=new google.maps.DirectionsService(),timer=setTimeout(()=>resolve(null),2600),req={origin:{lat:a.lat,lng:a.lng},destination:{lat:b.lat,lng:b.lng},travelMode:google.maps.TravelMode.DRIVING,drivingOptions:{departureTime:new Date(),trafficModel:google.maps.TrafficModel?.BEST_GUESS||'bestguess'}};svc.route(req,(res,status)=>{clearTimeout(timer);if(status!=='OK'||!res?.routes?.[0]?.legs?.[0])return resolve(null);const route=res.routes[0],leg=route.legs[0],dist=Number(leg.distance?.value||0),dur=Number(leg.duration_in_traffic?.value||leg.duration?.value||0),geo=(route.overview_path||[]).map(p=>[p.lng(),p.lat()]);resolve(dist>0&&dur>0?{km:dist/1000,min:realisticEta(dist/1000,Math.round(dur/60)),geo,source:'Google Maps'}:null)})})}catch(e){return null}}
function routePos(p){if(p?.eloc)return p.eloc;if(Number.isFinite(p?.lat)&&Number.isFinite(p?.lng))return `${p.lng},${p.lat}`;return''}
async function mapplsRouteResource(a,b,resource){const key=mapplsKey(),pa=routePos(a),pb=routePos(b);if(!key||!pa||!pb)return null;try{const u='https://route.mappls.com/route/direction/'+resource+'/driving/'+encodeURIComponent(pa)+';'+encodeURIComponent(pb)+'?steps=false&geometries=geojson&overview=full&region=ind&rtype=0&access_token='+encodeURIComponent(key),j=await xhr('GET',u,null,{},2400),x=j?.routes?.[0];if(!x||!Number(x.distance)||!Number(x.duration))return null;return{km:Number(x.distance)/1000,min:realisticEta(Number(x.distance)/1000,Math.round(Number(x.duration)/60)),geo:x.geometry?.coordinates||[],source:'Fallback road route'}}catch(e){return null}}
async function mapplsRoute(a,b){return await mapplsRouteResource(a,b,'route_eta')||await mapplsRouteResource(a,b,'route_adv')}
async function osrmRoute(a,b){if(!Number.isFinite(a?.lat)||!Number.isFinite(b?.lat))return null;try{const u=`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`,j=await xhr('GET',u,null,{},2500),x=j&&j.routes&&j.routes[0];if(x&&Number(x.distance)>0&&Number(x.duration)>0)return{km:Number(x.distance)/1000,min:realisticEta(Number(x.distance)/1000,Math.round(Number(x.duration)/60)),geo:x.geometry?.coordinates||[],source:'Fallback road route'}}catch(e){}return null}
async function realRoute(a,b){
 const g=await googleRoute(a,b);if(g)return g;
 // After Google timeout, try the two independent fallbacks together instead
 // of waiting for each service sequentially.
 const [m,o]=await Promise.allSettled([mapplsRouteResource(a,b,'route_eta'),osrmRoute(a,b)]);
 const mv=m.status==='fulfilled'?m.value:null,ov=o.status==='fulfilled'?o.value:null;
 if(mv)return mv;if(ov)return ov;
 const adv=await mapplsRouteResource(a,b,'route_adv');if(adv)return adv;
 return estimated(a,b)
}
function readRideConfig(){try{const x=JSON.parse(localStorage.getItem('d2_ride_config')||'null');if(x&&Array.isArray(x.vehicles))return x}catch(e){}return null}
function liveVehicle(v){const c=readRideConfig(),ov=(c?.vehicles||[]).find(x=>x.id===v.id)||{};return {...v,name:ov.name||v.name,seats:Number(ov.seats||v.seats||1),eta:Number(ov.eta||4),base:Number(ov.base??v.base),km:Number(ov.perKm??v.km),min:Number(ov.minFare??v.min)}}
function fare(v){if(!F.route||!Number(F.route.km))return null;const c=readRideConfig(),ov=(c?.vehicles||[]).find(x=>x.id===v.id);if(ov){let n=Math.max(Number(ov.minFare||0),Number(ov.base||0)+Number(ov.perKm||0)*F.route.km);n*=Number(c.surge||1);n+=Number(c.platformFee||0);n*=1+Number(c.taxPercent||0)/100;return Math.round(n)}return Math.round(Math.max(v.min,v.base+v.km*F.route.km))}
function veh(v){const x=liveVehicle(v),f=fare(x);return `<button type="button" class="cab6Veh ${F.selected===x.id?'on':''}" data-v="${x.id}"><span class="photo"><img src="${x.img}" alt="${esc(x.name)}" loading="lazy" decoding="async"></span><b>${esc(x.name)}</b><small>${x.seats} seat${x.seats>1?'s':''}</small><small class="dbestPickupEta">Pickup ~${x.eta} min</small><strong><span>${f===null?'₹…':'₹'+f}</span><em>${F.route?'Trip ~'+F.route.min+' min':''}</em></strong></button>`}
function mapShell(title){return `<div class="cab6MapFrame"><div id="cab13Map" class="cab6Map"><div class="cab13MapFallback"><div><b>Preparing route map…</b><br><small>Ride options are available below</small></div></div></div><div class="cab6RoutePill">${esc(title)}</div></div>`}
function rideTitle(){return F.mode==='rental'?`${F.p?.label||'Pickup'} → ${F.rentalHours} Hours / ${F.rentalKm} km`:[F.p?.label,...(F.stops||[]).map(x=>x?.label).filter(Boolean),F.d?.label].filter(Boolean).join(' → ')}
function statusText(){if(!F.route)return'Calculating road route…';if(F.mode==='rental')return`${F.rentalHours} Hours / ${F.rentalKm} km included`;if(F.route.source==='Google Maps')return'Google road distance and travel time ready';if(F.route.source==='Estimated route')return'Approximate route shown — please retry if it looks incorrect';return'Road distance and travel time ready'}
function renderRideShell(){const ready=!!(F.route&&F.route.km),sel=liveVehicle(VEH.find(v=>v.id===F.selected)||VEH[2]);screen(`${mapShell(rideTitle())}<div class="cab6Sheet dbestSheetIn"><div class="dbestCabProgress"><span class="on"></span><span></span><span></span></div><div class="cab6SheetHead"><b>Choose a ride</b><small>Upfront fare • Live Owner tariff</small></div><div class="cab6Meta"><div><small>${F.mode==='rental'?'Included distance':'Road distance'}</small><b id="cab13Km">${ready?F.route.km.toFixed(1)+' km':'Calculating…'}</b></div><div><small>${F.mode==='rental'?'Rental duration':'Estimated travel time'}</small><b id="cab13Min">${ready?(F.mode==='rental'?F.rentalHours+' hr':'~'+F.route.min+' min'):'Calculating…'}</b></div></div><div id="cab13Status" class="cab13Status ${ready?(F.route.source==='Estimated route'?'warn':'ok'):''}">${esc(statusText())}</div><div id="cab13Vehicles" class="cab6Vehicles">${VEH.map(veh).join('')}</div><button type="button" id="cab13Continue" class="cab6Book" ${ready?'':'disabled'}>${ready?'Continue with '+esc(sel.name):'Calculating fare…'}</button></div>`,'DBEST_CAB_SELECTED_UI.open()');bindRideCards();if(ready)renderMap()}
function bindRideCards(){qa('.cab6Veh[data-v]').forEach(c=>c.onclick=()=>{F.selected=c.dataset.v;qa('.cab6Veh[data-v]').forEach(x=>x.classList.toggle('on',x===c));const b=$('cab13Continue'),v=VEH.find(x=>x.id===F.selected);if(b&&!b.disabled)b.textContent='Continue with '+(v?v.name:'Ride')});const b=$('cab13Continue');if(b)b.onclick=()=>renderConfirm()}
function updateRide(){if(!$('cab13Vehicles')||!F.route)return;const km=$('cab13Km'),mn=$('cab13Min'),st=$('cab13Status'),list=$('cab13Vehicles'),b=$('cab13Continue');if(km)km.textContent=F.route.km.toFixed(1)+' km';if(mn)mn.textContent=F.mode==='rental'?F.rentalHours+' hr':'~'+F.route.min+' min';if(st){st.textContent=statusText();st.className='cab13Status '+(F.route.source==='Estimated route'?'warn':'ok')}if(list){list.innerHTML=VEH.map(veh).join('');bindRideCards()}if(b){b.disabled=false;b.textContent='Continue with '+(VEH.find(v=>v.id===F.selected)?.name||'Ride');b.onclick=()=>renderConfirm()}renderMap()}
function googleMap(el){if(!googleReady()||!el)return false;try{el.innerHTML='';const center=Number.isFinite(F.p?.lat)?{lat:F.p.lat,lng:F.p.lng}:{lat:22.5937,lng:78.9629},m=new google.maps.Map(el,{center,zoom:14,streetViewControl:false,mapTypeControl:false,fullscreenControl:false,gestureHandling:'greedy'});F.map=m;const bounds=new google.maps.LatLngBounds();if(Number.isFinite(F.p?.lat)){new google.maps.Marker({map:m,position:{lat:F.p.lat,lng:F.p.lng},label:'P'});bounds.extend({lat:F.p.lat,lng:F.p.lng})}if(Number.isFinite(F.d?.lat)){new google.maps.Marker({map:m,position:{lat:F.d.lat,lng:F.d.lng},label:'D'});bounds.extend({lat:F.d.lat,lng:F.d.lng})}const path=(F.route?.geo||[]).map(c=>({lat:Number(c[1]),lng:Number(c[0])})).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng));if(path.length>1){new google.maps.Polyline({map:m,path,strokeColor:'#00bde8',strokeOpacity:1,strokeWeight:7});path.forEach(x=>bounds.extend(x))}if(!bounds.isEmpty()&&Number.isFinite(F.d?.lat))m.fitBounds(bounds,42);return true}catch(e){return false}}
function loadLeaflet(){if(window.L)return Promise.resolve(window.L);if(leafletPromise)return leafletPromise;if(!$('cab13LeafletCss')){const l=document.createElement('link');l.id='cab13LeafletCss';l.rel='stylesheet';l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(l)}leafletPromise=new Promise((ok,no)=>{let s=$('cab13LeafletJs');if(s){s.addEventListener('load',()=>window.L?ok(window.L):no(new Error('map unavailable')),{once:true});setTimeout(()=>window.L?ok(window.L):no(new Error('map timeout')),3500);return}s=document.createElement('script');s.id='cab13LeafletJs';s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.async=true;const t=setTimeout(()=>no(new Error('map timeout')),3500);s.onload=()=>{clearTimeout(t);window.L?ok(window.L):no(new Error('map unavailable'))};s.onerror=()=>{clearTimeout(t);no(new Error('map unavailable'))};document.head.appendChild(s)}).finally(()=>{leafletPromise=null});return leafletPromise}
async function renderMap(){const el=$('cab13Map');if(!el)return;try{if(googleReady()&&googleMap(el))return}catch(e){}try{ensureGoogle(1800).catch(()=>{});const L=await loadLeaflet();if(!$('cab13Map'))return;try{F.map&&F.map.remove&&F.map.remove()}catch(e){}F.map=L.map(el,{zoomControl:true,attributionControl:true});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(F.map);if(F.p&&Number.isFinite(F.p.lat))L.circleMarker([F.p.lat,F.p.lng],{radius:8,weight:4,color:'#fff',fillColor:'#1cc8e8',fillOpacity:1}).addTo(F.map);if(F.d&&Number.isFinite(F.d.lat)){L.circleMarker([F.d.lat,F.d.lng],{radius:8,weight:4,color:'#fff',fillColor:'#ff5468',fillOpacity:1}).addTo(F.map);const pts=(F.route?.geo||[]).map(c=>[c[1],c[0]]);if(pts.length>1){const line=L.polyline(pts,{weight:7,opacity:1,color:'#00bde8',lineCap:'round',lineJoin:'round'}).addTo(F.map);F.map.fitBounds(line.getBounds(),{padding:[30,30]})}else if(Number.isFinite(F.p?.lat))F.map.fitBounds([[F.p.lat,F.p.lng],[F.d.lat,F.d.lng]],{padding:[30,30]})}else if(Number.isFinite(F.p?.lat))F.map.setView([F.p.lat,F.p.lng],14);else F.map.setView([22.5937,78.9629],5);setTimeout(()=>F.map&&F.map.invalidateSize&&F.map.invalidateSize(),80)}catch(e){if(el)el.innerHTML='<div class="cab13MapFallback"><div><b>Route calculated</b><br><small>Map is temporarily unavailable</small></div></div>'}}
async function calculateRide(pText,dText,stopTexts=[]){try{
 const texts=[pText,...stopTexts,dText];
 const pts=await Promise.race([Promise.all(texts.map(geocode)),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),14000))]);
 F.p=pts[0];F.d=pts[pts.length-1];F.stops=pts.slice(1,-1);
 let totalKm=0,totalMin=0,geo=[],source='Google Maps';
 for(let i=0;i<pts.length-1;i++){
   const leg=await realRoute(pts[i],pts[i+1]);
   totalKm+=Number(leg?.km||0);totalMin+=Number(leg?.min||0);
   if(Array.isArray(leg?.geo)&&leg.geo.length){if(geo.length&&JSON.stringify(geo[geo.length-1])===JSON.stringify(leg.geo[0]))geo.push(...leg.geo.slice(1));else geo.push(...leg.geo)}
   if(leg?.source!=='Google Maps')source=leg?.source||source;
 }
 F.route={km:totalKm,min:realisticEta(totalKm,totalMin),geo,source};
}catch(e){
 const pts=[F.p,...(F.stops||[]),F.d].filter(Boolean);let totalKm=0,totalMin=0,geo=[];
 for(let i=0;i<pts.length-1;i++){const leg=estimated(pts[i],pts[i+1]);totalKm+=leg.km;totalMin+=leg.min;geo.push(...leg.geo)}
 F.route={km:totalKm||10,min:totalMin||20,geo,source:'Estimated route'};
}finally{F.calculating=false;updateRide()}}
async function calculateRentalPickup(pText){try{F.p=await Promise.race([geocode(pText),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),6500))]);renderMap()}catch(e){}}
function startSearch(ev){ev&&ev.preventDefault&&ev.preventDefault();readPrefs();if(F.schedule==='later'&&!F.scheduledAt)return tell('Please select schedule date and time.');if(F.rider==='other'&&(!F.riderName||F.riderMobile.length!==10))return tell('Please enter rider name and 10-digit mobile.');const pText=String($('cab6P')?.value||'').trim(),dText=String($('cab6D')?.value||'').trim();F.stopTexts=qa('.cab6StopInput').map(x=>String(x.value||'').trim()).filter(Boolean).slice(0,3);if(!pText)return tell('Please enter a pickup location.');if(F.mode!=='rental'&&!dText)return tell('Please enter a destination.');F.p=null;F.d=null;F.stops=[];F.calculating=true;if(F.mode==='rental'){F.route={km:F.rentalKm,min:F.rentalHours*60,geo:[],source:'Hourly rental package'};F.calculating=false;renderRideShell();calculateRentalPickup(pText);return}F.route=null;renderRideShell();setTimeout(()=>calculateRide(pText,dText,F.stopTexts),20)}
function renderConfirm(){
 if(!F.route)return;
 const raw=VEH.find(x=>x.id===F.selected)||VEH[2],v=liveVehicle(raw),amount=fare(v);
 const current=document.querySelector('.cab6Sheet');
 const html=`<div class="dbestCabProgress"><span class="on"></span><span class="on"></span><span></span></div>
 <div class="dbestCabConfirmHead"><button type="button" id="dbestCabBackRide">← Rides</button><b>Confirm your ride</b><span></span></div>
 <div class="dbestCabRouteMini"><span class="dot"></span><div><small>Pickup</small><b>${esc(F.p?.label||'Pickup')}</b></div><span class="time">~${v.eta} min</span></div>
 ${F.mode!=='rental'&&(F.stops||[]).length?`<div class="dbestCabRouteMini"><span class="dot" style="background:#f6a623"></span><div><small>${F.stops.length} stop${F.stops.length>1?'s':''}</small><b>${F.stops.map((s,i)=>`${i+1}. ${esc(s?.label||'')}`).join(' • ')}</b></div><span></span></div>`:''}
 <div class="dbestCabRouteMini"><span class="dot drop"></span><div><small>${F.mode==='rental'?'Package':'Destination'}</small><b>${esc(F.mode==='rental'?F.rentalHours+' Hours / '+F.rentalKm+' km':F.d?.label||'Destination')}</b></div><span class="time">${F.mode==='rental'?F.rentalHours+' hr':'~'+F.route.min+' min'}</span></div>
 <div class="cab6VehicleHero"><div class="pic"><img src="${v.img}" alt="${esc(v.name)}"></div><div><b style="font-size:16px">${esc(v.name)}</b><div style="font-size:9px;color:#7d8597">${v.seats} seats • Pickup ~${v.eta} min</div></div></div>
 <div class="cab6Fare"><div><small style="color:#858da0;font-size:9px">Upfront estimated fare</small><strong>₹${amount}</strong></div><div style="text-align:right;color:#7c8498;font-size:8px">${F.route.km.toFixed(1)} km<br>${F.mode==='rental'?F.rentalHours+' hr':'Trip ~'+F.route.min+' min'}</div></div>
 <div class="cab6Pay"><label><input type="radio" name="cab13pay" value="cash" checked> Cash</label><label><input type="radio" name="cab13pay" value="upi"> UPI</label></div>
 <button type="button" id="cab13Book" class="cab6Book">Confirm ${esc(v.name)} • ₹${amount}</button>
 <div id="dbestFinding" class="dbestFinding"><div><div class="dbestFindingPulse">🚕</div><b>Finding your DBest Vaahak…</b><small>Matching the nearest eligible partner. Please keep this screen open.</small></div></div>`;
 if(current){
   current.classList.remove('dbestSheetIn');void current.offsetWidth;current.classList.add('dbestSheetIn');
   current.innerHTML=html;
 }else{
   screen(`${mapShell(rideTitle())}<div class="cab6Sheet dbestSheetIn">${html}</div>`,'DBEST_CAB_V13.renderRideShell()');
   renderMap();
 }
 $('dbestCabBackRide').onclick=()=>{renderRideShell()};
 $('cab13Book').onclick=()=>book(v.id);
 try{window.DBEST_I18N?.apply?.();window.DBEST_USER_I18N?.apply?.()}catch(e){}
}
function book(id){
 const pay=q('input[name="cab13pay"]:checked')?.value||'cash',draft={pickup:F.p?.label||'',drop:F.mode==='rental'?F.rentalHours+' Hours / '+F.rentalKm+' km':F.d?.label||'',pickupCoords:Number.isFinite(F.p?.lat)?{lat:F.p.lat,lng:F.p.lng}:null,dropCoords:Number.isFinite(F.d?.lat)?{lat:F.d.lat,lng:F.d.lng}:null,stops:(F.stops||[]).map(s=>s?.label||'').filter(Boolean),stopCoords:(F.stops||[]).filter(s=>Number.isFinite(s?.lat)&&Number.isFinite(s?.lng)).map(s=>({lat:s.lat,lng:s.lng,label:s.label||''})),distance:F.route?.km||0,estimatedMinutes:F.route?.min||0,selected:id,schedule:F.schedule,scheduledAt:F.scheduledAt,rider:F.rider,riderName:F.riderName,riderMobile:F.riderMobile,bookingType:F.mode==='rental'?'Rental':'Ride',rental:F.mode==='rental',rentalHours:F.rentalHours,rentalKm:F.rentalKm,rentalPackage:F.mode==='rental'?{label:F.rentalHours+' Hours / '+F.rentalKm+' km',hours:F.rentalHours,includedKm:F.rentalKm}:null};
 try{
   if(typeof rideDraft!=='undefined')Object.assign(rideDraft,draft);else window.rideDraft=draft;
   const overlay=$('dbestFinding'),btn=$('cab13Book');if(overlay)overlay.classList.add('show');if(btn)btn.disabled=true;
   if(typeof bookRide==='function'){
     const form=document.createElement('form');form.innerHTML='<input name="payment" value="'+esc(pay)+'">';
     setTimeout(()=>{try{bookRide({preventDefault(){},target:form},id)}catch(e){console.warn('DBest booking handoff',e);if(overlay)overlay.classList.remove('show');if(btn)btn.disabled=false;tell('Booking could not continue. Please retry.')}},140);
     return;
   }
 }catch(e){console.warn('DBest booking handoff',e)}
 tell('Booking details are ready. Please retry once.')
}
function patchSearch(){css();
 const search=document.querySelector('.cab6Search');
 if(search&&!search.classList.contains('dbestEntrySheet')){
   search.classList.add('dbestEntrySheet');
   search.insertAdjacentHTML('afterbegin','<div class="dbestEntryHandle"></div><div class="dbestEntryHeading"><b>Where would you like to go?</b><small>DBest Cab</small></div>');
   if(!document.getElementById('dbestCabEntryMapWrap')){
     const map=document.createElement('div');map.id='dbestCabEntryMapWrap';
     map.innerHTML='<div id="dbestCabEntryMap"><div class="entryMapFallback"><div class="entryMapPin"></div></div></div><div class="entryMapBadge">Live pickup map</div><button type="button" class="entryMapLocate" id="dbestEntryLocate" aria-label="Use current location">◎</button>';
     search.insertAdjacentElement('beforebegin',map);
     document.getElementById('dbestEntryLocate').onclick=()=>document.getElementById('cab6Gps')?.click();
     setTimeout(renderEntryMap,50);
   }
 }
 const drop=$('cab6DropWrap');
 if(drop&&!$('cab6AddStop')){
   const wrap=document.createElement('div');wrap.id='cab6StopsWrap';
   wrap.innerHTML='<button type="button" id="cab6AddStop">＋ Add Stop</button><div id="cab6StopsList"></div>';
   drop.insertAdjacentElement('afterend',wrap);
   $('cab6AddStop').onclick=()=>{
     const list=$('cab6StopsList'),count=list?.querySelectorAll('.cab6StopRow').length||0;
     if(count>=3)return tell('Maximum 3 stops allowed.');
     const row=document.createElement('div');row.className='cab6StopRow';
     row.innerHTML='<div class="cab6Field"><input class="cab6StopInput" autocomplete="off" placeholder="Enter stop '+(count+1)+'"></div><button type="button" class="cab6StopRemove">✕</button>';
     row.querySelector('.cab6StopRemove').onclick=()=>row.remove();
     list.appendChild(row);
     try{window.DBEST_I18N?.apply?.();window.DBEST_USER_I18N?.apply?.()}catch(e){}
   };
 }
 const rent=$('cab6RentalPkg');if(rent&&rent.dataset.dbestV16!=='1'){const current=PACKS.some(x=>x[0]===rent.value)?rent.value:'2|20';rent.innerHTML=PACKS.map(x=>`<option value="${x[0]}">${x[1]}</option>`).join('');rent.value=current;rent.dataset.dbestV16='1'}
 const gps=$('cab6Gps');if(gps){gps.setAttribute('aria-label','Use current location');gps.setAttribute('title','Use current location')}
 const b=$('cab6Go');if(b){b.textContent='Find My Ride';b.disabled=false}
 try{window.DBEST_I18N?.apply?.();window.DBEST_USER_I18N?.apply?.()}catch(e){}
}
async function renderEntryMap(){
 const el=document.getElementById('dbestCabEntryMap');if(!el)return;
 const paint=(lat,lng)=>{
   try{
     if(window.google?.maps?.Map){
       el.innerHTML='';
       const m=new google.maps.Map(el,{center:{lat,lng},zoom:14,streetViewControl:false,mapTypeControl:false,fullscreenControl:false,gestureHandling:'greedy',disableDefaultUI:true});
       new google.maps.Marker({map:m,position:{lat,lng}});
       return true;
     }
   }catch(_){}
   return false;
 };
 try{
   if(navigator.geolocation){
     navigator.geolocation.getCurrentPosition(async p=>{
       const lat=p.coords.latitude,lng=p.coords.longitude;
       if(paint(lat,lng))return;
       try{
         const L=await loadLeaflet();
         if(!document.getElementById('dbestCabEntryMap'))return;
         el.innerHTML='';
         const m=L.map(el,{zoomControl:false,attributionControl:false}).setView([lat,lng],14);
         L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(m);
         L.circleMarker([lat,lng],{radius:8,weight:4,color:'#fff',fillColor:'#2362ee',fillOpacity:1}).addTo(m);
       }catch(_){}
     },()=>{}, {enableHighAccuracy:false,timeout:2200,maximumAge:60000});
   }
 }catch(_){}
}
function bind(a){if(!a||typeof a.open!=='function')return;api=a;const open=()=>{a.open();setTimeout(patchSearch,0)};try{Object.defineProperty(window,'openRidePlatform',{configurable:true,get(){return open},set(){}})}catch(e){window.openRidePlatform=open}window.DBEST_CAB_SELECTED_UI={...a,open};window.DBEST_ACTIVE_CAB_VERSION='SELECTED_REALMAP_V16';patchSearch()}
function ensure(){if(api)return Promise.resolve(api);if(window.DBEST_CAB_SELECTED_UI&&window.DBEST_CAB_SELECTED_UI.version===BASE){bind(window.DBEST_CAB_SELECTED_UI);return Promise.resolve(api)}if(loader)return loader;loader=new Promise((ok,no)=>{const old=$('dbest-selected-cab-v6-script');if(old)old.remove();const s=document.createElement('script');s.id='dbest-selected-cab-v6-script';s.src='/cab-selected-ui-v3.js?v='+BASE+'&t='+Date.now();s.async=false;s.onload=()=>{const a=window.DBEST_CAB_SELECTED_UI;if(a&&a.version===BASE){bind(a);ok(api)}else no(new Error('base unavailable'))};s.onerror=no;(document.body||document.documentElement).appendChild(s)}).catch(e=>{loader=null;console.warn(e);throw e});return loader}
document.addEventListener('click',e=>{const r=e.target.closest?.('[data-q="rental"]');if(r)setTimeout(()=>{const w=$('cab6StopsWrap');if(w)w.style.display=r.classList.contains('on')?'none':''},0);const b=e.target.closest?.('#cab6Go');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();startSearch(e)},true);
window.DBEST_CAB_V13={version:VERSION,startSearch,renderRideShell,renderConfirm,book};
ensureGoogle().catch(()=>{});ensure().catch(()=>{});
})();