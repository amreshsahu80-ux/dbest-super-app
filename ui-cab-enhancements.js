(function(){
  const STYLE_ID='dbest-ui-cab-enhancements-style';
  function installStyles(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
      /* Compact premium membership panel */
      .heroBox{align-items:stretch}
      .heroBox .memberBox{padding:14px 16px!important;border-radius:18px!important;min-height:auto!important;display:flex!important;flex-direction:column!important;justify-content:center!important;gap:8px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.16)}
      .heroBox .memberBox b{font-size:21px!important;line-height:1.12!important;margin:0!important;letter-spacing:.2px}
      .heroBox .memberBox small{font-size:11px!important;line-height:1.35!important;opacity:.92}
      .dbestPlanChips{display:flex;gap:6px;flex-wrap:wrap;margin-top:3px}
      .dbestPlanChip{padding:6px 9px;border-radius:999px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.24);font-size:10px;font-weight:800;white-space:nowrap}
      @media(max-width:700px){
        .hero{padding:15px 0!important}.heroBox{padding:20px!important;border-radius:24px!important;gap:14px!important}
        .hero h1{font-size:31px!important;margin-bottom:8px!important}.hero p{margin:8px 0 14px!important;line-height:1.45!important}
        .heroBox .memberBox{padding:12px 13px!important}.heroBox .memberBox b{font-size:18px!important}.dbestPlanChip{font-size:9px;padding:5px 8px}
      }

      /* Ride experience */
      .dbestRideShell{max-width:980px;margin:0 auto;padding-bottom:26px}
      .dbestRideMap{height:330px;border-radius:22px;overflow:hidden;background:#e9eef6;border:1px solid #dce4ef;box-shadow:0 12px 30px rgba(20,40,80,.10);position:relative}
      .dbestRideMap .leaflet-container{height:100%;width:100%}
      .dbestRideSearch{background:#fff;border:1px solid #e2e8f2;border-radius:22px;padding:16px;margin-top:-28px;position:relative;z-index:500;box-shadow:0 16px 38px rgba(17,33,68,.14)}
      .dbestRideField{display:grid;grid-template-columns:30px 1fr;align-items:center;gap:8px;border:1px solid #dfe6f0;border-radius:14px;padding:5px 10px;background:#fff;margin-bottom:9px}
      .dbestRideDot{width:12px;height:12px;border-radius:50%;margin:auto}.dbestRideDot.pick{background:#16a36a}.dbestRideDot.drop{background:#e84b55}
      .dbestRideField input{width:100%;border:0;outline:0;padding:11px 4px;background:transparent;font-size:15px}
      .dbestRideActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.dbestRideActions button{flex:1;min-width:130px}
      .dbestRideSummary{display:none;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.dbestRideSummary.show{display:grid}
      .dbestRideStat{background:#f6f9ff;border:1px solid #e1e9f7;border-radius:14px;padding:10px}.dbestRideStat small{display:block;color:#718096;font-size:10px}.dbestRideStat b{display:block;margin-top:4px;font-size:15px;color:#16243d}
      .dbestRideSuggestions{position:absolute;left:16px;right:16px;z-index:800;background:#fff;border:1px solid #dfe6f0;border-radius:14px;box-shadow:0 15px 34px rgba(17,33,68,.18);max-height:230px;overflow:auto;display:none}
      .dbestRideSuggestion{padding:11px 13px;border-bottom:1px solid #edf1f6;font-size:13px;cursor:pointer}.dbestRideSuggestion:last-child{border-bottom:0}.dbestRideSuggestion small{display:block;color:#7a8597;margin-top:2px}
      .dbestVehicleTray{display:none;margin-top:14px}.dbestVehicleTray.show{display:block}.dbestVehicleGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
      .dbestVehicleCard{background:#fff;border:1px solid #e2e8f2;border-radius:16px;padding:12px;display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center}.dbestVehicleCard b{font-size:15px}.dbestVehicleCard small{color:#748095}.dbestVehicleCard .fare{font-size:17px;font-weight:900;color:#15243e}
      .dbestRideHint{margin-top:8px;font-size:11px;color:#768397;line-height:1.4}
      @media(max-width:600px){.dbestRideMap{height:270px;border-radius:0;margin-left:-16px;margin-right:-16px}.dbestRideSearch{margin-top:-20px;padding:13px;border-radius:20px}.dbestRideSummary{grid-template-columns:repeat(3,1fr)}.dbestRideStat{padding:8px}.dbestRideStat b{font-size:13px}.dbestVehicleGrid{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function compactMembership(){
    const box=document.querySelector('.heroBox .memberBox');if(!box||box.dataset.dbestCompact==='1')return;
    box.dataset.dbestCompact='1';
    const txt=box.textContent||'';
    if(/Membership Options/i.test(txt)){
      const chips=document.createElement('div');chips.className='dbestPlanChips';
      chips.innerHTML='<span class="dbestPlanChip">Leader ₹999</span><span class="dbestPlanChip">Prime ₹599</span><span class="dbestPlanChip">Promoter ₹299</span><span class="dbestPlanChip">Guest ₹49</span>';
      const big=[...box.querySelectorAll('b')].find(x=>/₹999/.test(x.textContent||''));
      if(big)big.style.display='none';
      const sm=[...box.querySelectorAll('small')].find(x=>/Leader|Prime|Promoter|Guest/i.test(x.textContent||''));
      if(sm)sm.style.display='none';
      box.appendChild(chips);
    }
  }

  function loadLeaflet(){
    if(window.L)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      let css=document.querySelector('link[data-dbest-leaflet]');if(!css){css=document.createElement('link');css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';css.dataset.dbestLeaflet='1';document.head.appendChild(css)}
      let sc=document.querySelector('script[data-dbest-leaflet]');if(sc){sc.addEventListener('load',resolve,{once:true});sc.addEventListener('error',reject,{once:true});return}
      sc=document.createElement('script');sc.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';sc.dataset.dbestLeaflet='1';sc.onload=resolve;sc.onerror=reject;document.head.appendChild(sc);
    });
  }
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function haversine(a,b){const R=6371,toRad=x=>x*Math.PI/180,dLat=toRad(b.lat-a.lat),dLon=toRad(b.lon-a.lon),aa=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;return R*2*Math.atan2(Math.sqrt(aa),Math.sqrt(1-aa))}
  async function geocode(q){
    q=String(q||'').trim();if(q.length<3)return [];
    const r=await fetch('https://photon.komoot.io/api/?limit=5&q='+encodeURIComponent(q));if(!r.ok)throw new Error('Location search unavailable');
    const j=await r.json();return (j.features||[]).map(f=>({lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],name:[f.properties.name,f.properties.city,f.properties.state].filter(Boolean).join(', '),detail:[f.properties.street,f.properties.district,f.properties.country].filter(Boolean).join(', ')}));
  }
  function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}

  let rideMap=null,pickMarker=null,dropMarker=null,pickGeo=null,dropGeo=null;
  function mapFit(){if(!rideMap)return;const pts=[];if(pickGeo)pts.push([pickGeo.lat,pickGeo.lon]);if(dropGeo)pts.push([dropGeo.lat,dropGeo.lon]);if(pts.length===2)rideMap.fitBounds(pts,{padding:[45,45]});else if(pts.length===1)rideMap.setView(pts[0],15)}
  function setPoint(kind,p){
    if(kind==='pickup')pickGeo=p;else dropGeo=p;
    if(rideMap&&window.L){
      const ll=[p.lat,p.lon];
      if(kind==='pickup'){if(pickMarker)pickMarker.setLatLng(ll);else pickMarker=L.marker(ll).addTo(rideMap).bindPopup('Pickup')}else{if(dropMarker)dropMarker.setLatLng(ll);else dropMarker=L.marker(ll).addTo(rideMap).bindPopup('Drop')}
      mapFit();
    }
  }
  function calcRide(){
    if(!pickGeo||!dropGeo)return null;
    const roadKm=Math.max(1.2,haversine(pickGeo,dropGeo)*1.24);const km=Math.round(roadKm*10)/10;const mins=Math.max(5,Math.round((km/27)*60+5));
    if(window.rideDraft){rideDraft.pickup=document.getElementById('dbestPickup')?.value||'';rideDraft.drop=document.getElementById('dbestDrop')?.value||'';rideDraft.pickupCoords={lat:pickGeo.lat,lng:pickGeo.lon};rideDraft.distance=km;rideDraft.schedule='Now'}
    return {km,mins};
  }
  function renderVehicleOptions(metric){
    const tray=document.getElementById('dbestVehicleTray'),grid=document.getElementById('dbestVehicleGrid');if(!tray||!grid)return;
    const vehicles=(window.rideConfig&&Array.isArray(rideConfig.vehicles))?rideConfig.vehicles:[];
    grid.innerHTML=vehicles.map(v=>{let fare=typeof window.rideFare==='function'?rideFare(v,metric.km):Math.round(45+metric.km*14);return `<button class="dbestVehicleCard" onclick="if(window.showRideOptions){rideDraft.selected='${esc(v.id)}';showRideOptions()}" style="text-align:left;cursor:pointer"><span><b>${esc(v.name||v.id)}</b><small>${esc(v.description||'Estimated pickup 4–8 min')}</small></span><span class="fare">₹${Math.round(fare)}</span></button>`}).join('');
    tray.classList.add('show');
  }
  function updateSummary(){
    const metric=calcRide();if(!metric)return;
    document.getElementById('dbestRideDistance').textContent=metric.km+' km';document.getElementById('dbestRideEta').textContent=metric.mins+' min';document.getElementById('dbestRidePickupEta').textContent='4–8 min';document.getElementById('dbestRideSummary').classList.add('show');renderVehicleOptions(metric);
  }

  function setupSuggestions(input,kind){
    const sug=document.getElementById('dbestRideSuggestions');
    const run=debounce(async()=>{try{const rows=await geocode(input.value);if(!rows.length){sug.style.display='none';return}sug.innerHTML=rows.map((r,i)=>`<div class="dbestRideSuggestion" data-i="${i}"><b>${esc(r.name||input.value)}</b><small>${esc(r.detail)}</small></div>`).join('');sug.style.display='block';[...sug.children].forEach((el,i)=>el.onclick=()=>{const r=rows[i];input.value=r.name||input.value;setPoint(kind,r);sug.style.display='none';if(pickGeo&&dropGeo)updateSummary()})}catch(e){sug.style.display='none'}},350);
    input.addEventListener('input',run);input.addEventListener('focus',run);
  }

  window.openRidePlatform=function(){
    if(typeof window.sectionScreen!=='function'||typeof window.sectionTopBar!=='function')return;
    sectionScreen(`${sectionTopBar('🚕 DBest Ride','Live map • Pickup • Drop • Fare • ETA','backHome()')}
      <div class="sectionContent"><div class="dbestRideShell">
        <div id="dbestRideMap" class="dbestRideMap"><div style="padding:20px;color:#66758a">Loading live map…</div></div>
        <div class="dbestRideSearch">
          <div class="dbestRideField"><span class="dbestRideDot pick"></span><input id="dbestPickup" autocomplete="off" placeholder="Pickup location"></div>
          <div class="dbestRideField"><span class="dbestRideDot drop"></span><input id="dbestDrop" autocomplete="off" placeholder="Where to?"></div>
          <div id="dbestRideSuggestions" class="dbestRideSuggestions"></div>
          <div class="dbestRideActions"><button class="btn soft" id="dbestUseGps" type="button">📍 Use current location</button><button class="btn" id="dbestFindRide" type="button">See rides & fares</button></div>
          <div id="dbestRideSummary" class="dbestRideSummary"><div class="dbestRideStat"><small>Distance</small><b id="dbestRideDistance">—</b></div><div class="dbestRideStat"><small>Travel time</small><b id="dbestRideEta">—</b></div><div class="dbestRideStat"><small>Driver arrival</small><b id="dbestRidePickupEta">—</b></div></div>
          <div class="dbestRideHint">Live GPS and map are active. Distance/ETA are road-style estimates for testing; production routing can later be connected to Google Maps/Mapbox routing for turn-by-turn accuracy.</div>
        </div>
        <div id="dbestVehicleTray" class="dbestVehicleTray"><h3 style="margin:0 0 10px">Choose a ride</h3><div id="dbestVehicleGrid" class="dbestVehicleGrid"></div></div>
      </div></div>`);
    pickGeo=dropGeo=null;rideMap=pickMarker=dropMarker=null;
    setupSuggestions(document.getElementById('dbestPickup'),'pickup');setupSuggestions(document.getElementById('dbestDrop'),'drop');
    document.getElementById('dbestFindRide').onclick=()=>{if(!pickGeo||!dropGeo)return typeof toast==='function'?toast('Please select pickup and drop from the location suggestions.'):null;updateSummary()};
    document.getElementById('dbestUseGps').onclick=()=>{
      if(!navigator.geolocation)return typeof toast==='function'&&toast('Location is not available on this device.');
      navigator.geolocation.getCurrentPosition(async pos=>{const p={lat:pos.coords.latitude,lon:pos.coords.longitude,name:'Current location',detail:'GPS accuracy ±'+Math.round(pos.coords.accuracy||0)+' m'};setPoint('pickup',p);document.getElementById('dbestPickup').value='Current location';if(typeof toast==='function')toast('Live pickup location locked')},()=>{if(typeof toast==='function')toast('Please allow location permission and try again.')},{enableHighAccuracy:true,timeout:12000,maximumAge:15000});
    };
    loadLeaflet().then(()=>{const el=document.getElementById('dbestRideMap');if(!el)return;el.innerHTML='';rideMap=L.map(el,{zoomControl:true}).setView([22.8,86.2],10);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(rideMap);setTimeout(()=>rideMap.invalidateSize(),100);}).catch(()=>{const el=document.getElementById('dbestRideMap');if(el)el.innerHTML='<div style="padding:22px;color:#66758a">Map could not load. Location search and fare estimate are still available.</div>'});
  };

  installStyles();
  const obs=new MutationObserver(()=>compactMembership());obs.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',compactMembership,{once:true});else compactMembership();
  window.DBEST_UI_CAB_ENHANCEMENTS={version:'1.0.0'};
})();
