(function(){
  async function geocodeIndia(q){
    q=String(q||'').trim(); if(q.length<3) throw new Error('Enter a more specific place');
    const qs=new URLSearchParams({format:'jsonv2',limit:'1',countrycodes:'in',addressdetails:'1',q});
    const r=await fetch('https://nominatim.openstreetmap.org/search?'+qs.toString(),{headers:{'Accept-Language':'en'}});
    if(!r.ok) throw new Error('Unable to locate place');
    const j=await r.json(); if(!j.length) throw new Error('Place not found');
    return {lat:+j[0].lat,lon:+j[0].lon};
  }
  function practicalMinutes(km,osrmMins){
    let speed;
    if(km<=5) speed=22;
    else if(km<=15) speed=28;
    else if(km<=40) speed=36;
    else if(km<=100) speed=45;
    else if(km<=250) speed=50;
    else speed=55;
    let mins=Math.round((km/speed)*60 + (km<=15?5:8));
    // Keep the estimate within a sensible envelope of the routing engine,
    // but avoid unrealistic road-tag speeds on local Indian routes.
    if(Number.isFinite(osrmMins)&&osrmMins>0){
      const low=Math.round(mins*0.80), high=Math.round(mins*1.30);
      if(osrmMins>=low&&osrmMins<=high) mins=Math.round((mins+osrmMins)/2);
    }
    return Math.max(5,mins);
  }
  async function roadRoute(a,b){
    const url='https://router.project-osrm.org/route/v1/driving/'+a.lon+','+a.lat+';'+b.lon+','+b.lat+'?overview=false&steps=false';
    const r=await fetch(url); if(!r.ok) throw new Error('Road routing unavailable');
    const j=await r.json(); const rt=j.routes&&j.routes[0]; if(!rt) throw new Error('No drivable route found');
    const km=Math.round((rt.distance/1000)*10)/10;
    const osrmMins=Math.max(1,Math.round(rt.duration/60));
    return {km,mins:practicalMinutes(km,osrmMins),osrmMins};
  }
  function updateFareCards(km){
    try{
      document.querySelectorAll('.dbestVehicleCard').forEach(card=>{
        const id=card.dataset.rideId; const fare=card.querySelector('.fare'); if(!fare)return;
        let v=null; try{v=(typeof rideConfig!=='undefined'&&rideConfig.vehicles||[]).find(x=>String(x.id)===String(id))}catch(e){}
        let amt; try{amt=(v&&typeof rideFare==='function')?rideFare(v,km):Math.round(45+km*14)}catch(e){amt=Math.round(45+km*14)}
        fare.textContent='₹'+Math.round(amt);
      });
    }catch(e){}
  }
  async function correctRoute(){
    const p=document.getElementById('dbestPickup'),d=document.getElementById('dbestDrop'); if(!p||!d)return;
    const dist=document.getElementById('dbestRideDistance'),eta=document.getElementById('dbestRideEta'),sum=document.getElementById('dbestRideSummary');
    if(dist)dist.textContent='Routing…'; if(eta)eta.textContent='Routing…'; if(sum)sum.classList.add('show');
    try{
      const [a,b]=await Promise.all([geocodeIndia(p.value),geocodeIndia(d.value)]);
      const m=await roadRoute(a,b);
      if(dist)dist.textContent=m.km+' km'; if(eta)eta.textContent=m.mins+' min';
      try{if(typeof rideDraft!=='undefined'){rideDraft.distance=m.km;rideDraft.estimatedMinutes=m.mins;rideDraft.pickupCoords={lat:a.lat,lng:a.lon};rideDraft.dropCoords={lat:b.lat,lng:b.lon}}}catch(e){}
      updateFareCards(m.km);
    }catch(e){
      if(dist&&dist.textContent==='Routing…')dist.textContent='—'; if(eta&&eta.textContent==='Routing…')eta.textContent='—';
      try{if(typeof toast==='function')toast('Could not calculate exact road route. Please refine pickup/drop.')}catch(_){ }
    }
  }
  document.addEventListener('click',function(e){
    const b=e.target&&e.target.closest&&e.target.closest('#dbestFindRide'); if(!b)return;
    setTimeout(correctRoute,250);
  },true);
})();