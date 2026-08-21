(function(){
  const STYLE_ID='dbest-ui-cab-enhancements-style-v2';
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function installStyles(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
      /* Compact premium home hero */
      .hero{padding:12px 0!important}
      .heroBox{padding:18px!important;border-radius:22px!important;gap:12px!important;grid-template-columns:1fr!important;align-items:center!important}
      .heroBox>div:first-child{display:grid;gap:8px}
      .hero .pill{font-size:10px!important;padding:5px 8px!important;width:max-content}
      .hero h1{font-size:28px!important;line-height:1.05!important;margin:2px 0 2px!important}
      .hero p{font-size:13px!important;line-height:1.4!important;margin:2px 0 8px!important;max-width:760px}
      .heroBox .memberBox{padding:10px 12px!important;border-radius:15px!important;min-height:auto!important;display:flex!important;flex-direction:row!important;align-items:center!important;gap:8px!important;flex-wrap:wrap!important;margin-top:2px!important}
      .heroBox .memberBox b{display:none!important}.heroBox .memberBox small{display:none!important}
      .dbestMembershipLabel{font-size:11px;font-weight:800;opacity:.95;white-space:nowrap}
      .dbestPlanChips{display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin:0!important}
      .dbestPlanChip{padding:5px 8px;border-radius:999px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.24);font-size:9px;font-weight:800;white-space:nowrap}
      @media(max-width:700px){
        .hero{padding:8px 0!important}.heroBox{padding:13px!important;border-radius:18px!important;gap:8px!important}
        .hero .pill{font-size:9px!important;padding:4px 7px!important}
        .hero h1{font-size:22px!important;line-height:1.08!important;margin:0!important}
        .hero p{font-size:11.5px!important;line-height:1.32!important;margin:0 0 4px!important}
        .heroBox .memberBox{padding:8px 9px!important;gap:6px!important;border-radius:13px!important}
        .dbestMembershipLabel{font-size:9px}.dbestPlanChip{font-size:8.5px;padding:4px 6px}
        .heroBox .btn,.heroBox button{padding:8px 10px!important;font-size:12px!important;border-radius:10px!important}
      }

      /* Ride experience */
      .dbestRideShell{max-width:980px;margin:0 auto;padding-bottom:26px}
      .dbestRideMap{height:315px;border-radius:22px;overflow:hidden;background:#e9eef6;border:1px solid #dce4ef;box-shadow:0 12px 30px rgba(20,40,80,.10);position:relative}
      .dbestRideMap .leaflet-container{height:100%;width:100%}
      .dbestRideSearch{background:#fff;border:1px solid #e2e8f2;border-radius:22px;padding:14px;margin-top:-24px;position:relative;z-index:500;box-shadow:0 16px 38px rgba(17,33,68,.14)}
      .dbestRideFieldWrap{position:relative;margin-bottom:9px}
      .dbestRideField{display:grid;grid-template-columns:28px 1fr;align-items:center;gap:8px;border:1px solid #dfe6f0;border-radius:14px;padding:4px 10px;background:#fff}
      .dbestRideDot{width:11px;height:11px;border-radius:50%;margin:auto}.dbestRideDot.pick{background:#16a36a}.dbestRideDot.drop{background:#e84b55}
      .dbestRideField input{width:100%;border:0;outline:0;padding:11px 4px;background:transparent;font-size:15px}
      .dbestRideSuggestions{position:absolute;top:100%;left:0;right:0;z-index:850;background:#fff;border:1px solid #dfe6f0;border-radius:13px;box-shadow:0 15px 34px rgba(17,33,68,.18);max-height:230px;overflow:auto;display:none;margin-top:4px}
      .dbestRideSuggestion{padding:10px 12px;border-bottom:1px solid #edf1f6;font-size:13px;cursor:pointer;text-align:left}.dbestRideSuggestion:last-child{border-bottom:0}.dbestRideSuggestion small{display:block;color:#7a8597;margin-top:2px;font-size:10px}
      .dbestRideActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}.dbestRideActions button{flex:1;min-width:130px}
      .dbestRideSummary{display:none;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:11px}.dbestRideSummary.show{display:grid}
      .dbestRideStat{background:#f6f9ff;border:1px solid #e1e9f7;border-radius:13px;padding:9px}.dbestRideStat small{display:block;color:#718096;font-size:10px}.dbestRideStat b{display:block;margin-top:3px;font-size:15px;color:#16243d}
      .dbestVehicleTray{display:none;margin-top:14px}.dbestVehicleTray.show{display:block}.dbestVehicleGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
      .dbestVehicleCard{background:#fff;border:1px solid #e2e8f2;border-radius:16px;padding:12px;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;text-align:left;cursor:pointer;width:100%}.dbestVehicleCard:active{transform:scale(.99)}
      .dbestVehicleIcon{font-size:25px}.dbestVehicleCard b{font-size:15px;display:block}.dbestVehicleCard small{color:#748095;display:block;margin-top:2px;font-size:10px}.dbestVehicleCard .fare{font-size:17px;font-weight:900;color:#15243e;white-space:nowrap}
      .dbestVaahakStrip{display:none;margin-top:10px;background:#f7fbff;border:1px solid #dfe9f6;border-radius:15px;padding:10px}.dbestVaahakStrip.show{display:block}.dbestVaahakTitle{font-size:11px;font-weight:900;color:#25446e;margin-bottom:7px}.dbestVaahakList{display:flex;gap:7px;overflow:auto;padding-bottom:2px}.dbestVaahakChip{min-width:150px;background:#fff;border:1px solid #e3eaf3;border-radius:12px;padding:8px}.dbestVaahakChip b{display:block;font-size:11px}.dbestVaahakChip small{display:block;color:#718096;font-size:9px;margin-top:2px}
      .dbestRideHint{margin-top:8px;font-size:10px;color:#768397;line-height:1.35}
      @media(max-width:600px){
        .dbestRideMap{height:250px;border-radius:0;margin-left:-16px;margin-right:-16px}.dbestRideSearch{margin-top:-16px;padding:12px;border-radius:18px}.dbestRideSummary{grid-template-columns:repeat(3,1fr)}.dbestRideStat{padding:7px}.dbestRideStat b{font-size:12px}.dbestVehicleGrid{grid-template-columns:1fr}.dbestRideHint{font-size:9px}
      }
    `;document.head.appendChild(s);
  }

  function compactHero(){
    const hero=document.querySelector('.heroBox');if(!hero)return;
    const h1=hero.querySelector('h1');const p=hero.querySelector('p');
    if(h1&&!h1.dataset.dbestCompactCopy){h1.dataset.dbestCompactCopy='1';h1.textContent='Everything you need. One DBest.'}
    if(p&&!p.dataset.dbestCompactCopy){p.dataset.dbestCompactCopy='1';p.textContent='Travel • Insurance • Finance • Shopping • Government • Local services'}
    const box=hero.querySelector('.memberBox');if(box&&box.dataset.dbestCompact!=='2'){
      box.dataset.dbestCompact='2';box.innerHTML='<span class="dbestMembershipLabel">Membership</span><div class="dbestPlanChips"><span class="dbestPlanChip">Leader ₹999</span><span class="dbestPlanChip">Prime ₹599</span><span class="dbestPlanChip">Promoter ₹299</span><span class="dbestPlanChip">Guest ₹49</span></div>';
    }
  }

  function loadLeaflet(){
    if(window.L)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      let css=document.querySelector('link[data-dbest-leaflet]');if(!css){css=document.createElement('link');css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';css.dataset.dbestLeaflet='1';document.head.appendChild(css)}
      let sc=document.querySelector('script[data-dbest-leaflet]');if(sc){if(window.L)return resolve();sc.addEventListener('load',resolve,{once:true});sc.addEventListener('error',reject,{once:true});return}
      sc=document.createElement('script');sc.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';sc.dataset.dbestLeaflet='1';sc.onload=resolve;sc.onerror=reject;document.head.appendChild(sc);
    });
  }
  async function geocode(q){q=String(q||'').trim();if(q.length<3)return[];const r=await fetch('https://photon.komoot.io/api/?limit=7&q='+encodeURIComponent(q));if(!r.ok)throw new Error('Location search unavailable');const j=await r.json();return(j.features||[]).map(f=>({lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],name:[f.properties.name,f.properties.city,f.properties.state].filter(Boolean).join(', '),detail:[f.properties.street,f.properties.district,f.properties.country].filter(Boolean).join(', ')}))}
  async function reverseGeocode(lat,lon){try{const r=await fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat='+encodeURIComponent(lat)+'&lon='+encodeURIComponent(lon)+'&zoom=18&addressdetails=1',{headers:{'Accept-Language':'en'}});if(!r.ok)throw 0;const j=await r.json();return j.display_name||'Current location'}catch(e){return'Current location'}}
  function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}
  function haversine(a,b){const R=6371,toRad=x=>x*Math.PI/180,dLat=toRad(b.lat-a.lat),dLon=toRad(b.lon-a.lon),aa=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;return R*2*Math.atan2(Math.sqrt(aa),Math.sqrt(1-aa))}

  let rideMap=null,pickMarker=null,dropMarker=null,pickGeo=null,dropGeo=null;
  function mapFit(){if(!rideMap)return;const pts=[];if(pickGeo)pts.push([pickGeo.lat,pickGeo.lon]);if(dropGeo)pts.push([dropGeo.lat,dropGeo.lon]);if(pts.length===2)rideMap.fitBounds(pts,{padding:[42,42]});else if(pts.length===1)rideMap.setView(pts[0],15)}
  function setPoint(kind,p){if(kind==='pickup')pickGeo=p;else dropGeo=p;if(rideMap&&window.L){const ll=[p.lat,p.lon];if(kind==='pickup'){if(pickMarker)pickMarker.setLatLng(ll);else pickMarker=L.marker(ll).addTo(rideMap).bindPopup('Pickup')}else{if(dropMarker)dropMarker.setLatLng(ll);else dropMarker=L.marker(ll).addTo(rideMap).bindPopup('Drop')}mapFit()}}
  function syncRideDraft(metric){try{if(typeof rideDraft!=='undefined'){rideDraft.pickup=document.getElementById('dbestPickup')?.value||'';rideDraft.drop=document.getElementById('dbestDrop')?.value||'';rideDraft.pickupCoords=pickGeo?{lat:pickGeo.lat,lng:pickGeo.lon}:null;rideDraft.distance=metric.km;rideDraft.schedule='Now'}}catch(e){}}
  function calcRide(){if(!pickGeo||!dropGeo)return null;const roadKm=Math.max(1.2,haversine(pickGeo,dropGeo)*1.24),km=Math.round(roadKm*10)/10,mins=Math.max(5,Math.round((km/27)*60+5));const metric={km,mins};syncRideDraft(metric);return metric}
  function getVehicles(){try{return(typeof rideConfig!=='undefined'&&Array.isArray(rideConfig.vehicles))?rideConfig.vehicles:[]}catch(e){return[]}}
  function getVaahaks(){try{return(typeof vaahakPartners!=='undefined'&&Array.isArray(vaahakPartners))?vaahakPartners.filter(v=>v.available&&v.canRide):[]}catch(e){return[]}}
  function vehicleVaahaks(v){const all=getVaahaks(),name=String(v.name||v.id||'').toLowerCase();let desired=name.includes('bike')?'bike':name.includes('auto')?'auto':(name.includes('cab')||name.includes('car')||name.includes('mini')||name.includes('sedan')||name.includes('suv'))?'car':'';let rows=all.filter(x=>!desired||String(x.vehicle||'').toLowerCase().includes(desired));return rows.length?rows:all}
  function fareFor(v,km){try{return typeof rideFare==='function'?rideFare(v,km):Math.round(45+km*14)}catch(e){return Math.round(45+km*14)}}
  function renderVaahaks(v){const box=document.getElementById('dbestVaahakStrip');if(!box)return;const rows=vehicleVaahaks(v).slice(0,4);if(!rows.length){box.classList.remove('show');return}box.innerHTML='<div class="dbestVaahakTitle">Nearby Vaahak available for this ride</div><div class="dbestVaahakList">'+rows.map(x=>`<div class="dbestVaahakChip"><b>🛵 ${esc(x.name)}</b><small>${esc(x.vehicle)} • ⭐ ${esc(x.rating||'4.8')} • ${esc(x.vehicleNo||'')}</small></div>`).join('')+'</div>';box.classList.add('show')}
  function chooseVehicle(id){
    try{if(typeof rideDraft!=='undefined')rideDraft.selected=id}catch(e){}
    const v=getVehicles().find(x=>String(x.id)===String(id));if(v)renderVaahaks(v);
    setTimeout(()=>{try{if(typeof confirmRide==='function')return confirmRide(id);if(typeof showRideOptions==='function')return showRideOptions();if(typeof toast==='function')toast('Booking page is not available yet.')}catch(e){if(typeof toast==='function')toast('Unable to open booking page. Please try again.')}},180);
  }
  function renderVehicleOptions(metric){
    const tray=document.getElementById('dbestVehicleTray'),grid=document.getElementById('dbestVehicleGrid');if(!tray||!grid)return;const vehicles=getVehicles();
    if(!vehicles.length){grid.innerHTML='<div style="padding:14px;background:#fff;border:1px solid #e2e8f2;border-radius:14px">Ride options are loading. Please tap See rides & fares again.</div>';tray.classList.add('show');return}
    grid.innerHTML=vehicles.map(v=>`<button class="dbestVehicleCard" type="button" data-ride-id="${esc(v.id)}"><span class="dbestVehicleIcon">${esc(v.icon||'🚕')}</span><span><b>${esc(v.name||v.id)}</b><small>${Number(v.eta||5)}–${Number(v.eta||5)+3} min • ${v.seats||4} seat${v.seats===1?'':'s'} • Vaahak available</small></span><span class="fare">₹${Math.round(fareFor(v,metric.km))}</span></button>`).join('');
    tray.classList.add('show');grid.querySelectorAll('[data-ride-id]').forEach(btn=>btn.onclick=()=>chooseVehicle(btn.dataset.rideId));
    const first=vehicles[0];if(first)renderVaahaks(first);
    setTimeout(()=>tray.scrollIntoView({behavior:'smooth',block:'nearest'}),120);
  }
  function updateSummary(){const metric=calcRide();if(!metric)return false;document.getElementById('dbestRideDistance').textContent=metric.km+' km';document.getElementById('dbestRideEta').textContent=metric.mins+' min';document.getElementById('dbestRidePickupEta').textContent='4–8 min';document.getElementById('dbestRideSummary').classList.add('show');renderVehicleOptions(metric);return true}

  function setupSuggestions(input,kind,sug){
    const run=debounce(async()=>{try{const rows=await geocode(input.value);if(!rows.length){sug.style.display='none';return}sug.innerHTML=rows.map((r,i)=>`<button type="button" class="dbestRideSuggestion" data-i="${i}" style="width:100%;border:0;background:#fff"><b>${esc(r.name||input.value)}</b><small>${esc(r.detail)}</small></button>`).join('');sug.style.display='block';sug.querySelectorAll('[data-i]').forEach((el,i)=>el.onclick=()=>{const r=rows[i];input.value=r.name||input.value;setPoint(kind,r);sug.style.display='none';if(pickGeo&&dropGeo)updateSummary()})}catch(e){sug.style.display='none'}},280);
    input.addEventListener('input',()=>{if(kind==='pickup')pickGeo=null;else dropGeo=null;run()});input.addEventListener('focus',run);
  }
  async function resolveTypedPoint(kind,input){
    const existing=kind==='pickup'?pickGeo:dropGeo;if(existing)return existing;const q=String(input.value||'').trim();if(q.length<3)throw new Error(kind==='pickup'?'Enter a pickup location.':'Enter a drop location.');const rows=await geocode(q);if(!rows.length)throw new Error('Location not found. Please type a more specific place.');const r=rows[0];input.value=r.name||q;setPoint(kind,r);return r;
  }

  window.openRidePlatform=function(){
    if(typeof sectionScreen!=='function'||typeof sectionTopBar!=='function')return;
    sectionScreen(`${sectionTopBar('🚕 DBest Ride','Live map • Pickup • Drop • Fare • Vaahak','backHome()')}
      <div class="sectionContent"><div class="dbestRideShell">
        <div id="dbestRideMap" class="dbestRideMap"><div style="padding:20px;color:#66758a">Loading live map…</div></div>
        <div class="dbestRideSearch">
          <div class="dbestRideFieldWrap"><div class="dbestRideField"><span class="dbestRideDot pick"></span><input id="dbestPickup" autocomplete="off" placeholder="Type pickup location"></div><div id="dbestPickupSuggestions" class="dbestRideSuggestions"></div></div>
          <div class="dbestRideFieldWrap"><div class="dbestRideField"><span class="dbestRideDot drop"></span><input id="dbestDrop" autocomplete="off" placeholder="Type drop location"></div><div id="dbestDropSuggestions" class="dbestRideSuggestions"></div></div>
          <div class="dbestRideActions"><button class="btn soft" id="dbestUseGps" type="button">📍 Use current location</button><button class="btn" id="dbestFindRide" type="button">See rides & fares</button></div>
          <div id="dbestRideSummary" class="dbestRideSummary"><div class="dbestRideStat"><small>Distance</small><b id="dbestRideDistance">—</b></div><div class="dbestRideStat"><small>Travel time</small><b id="dbestRideEta">—</b></div><div class="dbestRideStat"><small>Driver arrival</small><b id="dbestRidePickupEta">—</b></div></div>
          <div id="dbestVaahakStrip" class="dbestVaahakStrip"></div>
          <div class="dbestRideHint">Start typing pickup/drop and choose a suggestion, or simply type the place and tap See rides & fares — DBest will resolve the closest matching place automatically.</div>
        </div>
        <div id="dbestVehicleTray" class="dbestVehicleTray"><h3 style="margin:0 0 10px">Choose a ride</h3><div id="dbestVehicleGrid" class="dbestVehicleGrid"></div></div>
      </div></div>`);
    pickGeo=dropGeo=null;rideMap=pickMarker=dropMarker=null;
    const pick=document.getElementById('dbestPickup'),drop=document.getElementById('dbestDrop');
    setupSuggestions(pick,'pickup',document.getElementById('dbestPickupSuggestions'));setupSuggestions(drop,'drop',document.getElementById('dbestDropSuggestions'));
    document.getElementById('dbestFindRide').onclick=async()=>{const btn=document.getElementById('dbestFindRide');try{btn.disabled=true;btn.textContent='Finding rides…';await resolveTypedPoint('pickup',pick);await resolveTypedPoint('drop',drop);updateSummary()}catch(e){if(typeof toast==='function')toast(e.message||'Please check pickup and drop.')}finally{btn.disabled=false;btn.textContent='See rides & fares'}};
    document.getElementById('dbestUseGps').onclick=()=>{
      if(!navigator.geolocation)return typeof toast==='function'&&toast('Location is not available on this device.');
      navigator.geolocation.getCurrentPosition(async pos=>{const lat=pos.coords.latitude,lon=pos.coords.longitude,label=await reverseGeocode(lat,lon),p={lat,lon,name:label,detail:'GPS accuracy ±'+Math.round(pos.coords.accuracy||0)+' m'};setPoint('pickup',p);pick.value=label;if(typeof toast==='function')toast('Live pickup location locked')},()=>{if(typeof toast==='function')toast('Please allow location permission and try again.')},{enableHighAccuracy:true,timeout:12000,maximumAge:15000});
    };
    loadLeaflet().then(()=>{const el=document.getElementById('dbestRideMap');if(!el)return;el.innerHTML='';rideMap=L.map(el,{zoomControl:true}).setView([22.8,86.2],10);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(rideMap);setTimeout(()=>rideMap.invalidateSize(),100)}).catch(()=>{const el=document.getElementById('dbestRideMap');if(el)el.innerHTML='<div style="padding:20px;color:#66758a">Map could not load. Location search still works.</div>'});
  };

  installStyles();
  const runHero=()=>{compactHero();setTimeout(compactHero,500);setTimeout(compactHero,1600)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',runHero,{once:true});else runHero();
  try{new MutationObserver(()=>compactHero()).observe(document.body,{childList:true,subtree:true})}catch(e){}
  window.DBEST_UI_CAB_ENHANCEMENTS={version:'2.0.0'};
})();
