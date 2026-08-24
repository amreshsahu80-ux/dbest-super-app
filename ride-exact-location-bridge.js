(function(){
  'use strict';
  const VERSION='2.0.0';
  const originalFetch=window.fetch.bind(window);
  const cfg=window.DBEST_RUNTIME_CONFIG||{};
  const base=String(cfg.supabaseUrl||'').replace(/\/$/,'');
  const key=cfg.supabasePublishableKey||'';
  const LIVE=base?base+'/functions/v1/location-search-live':'';

  function photonLike(rows){
    return {features:(rows||[]).map(r=>({
      geometry:{coordinates:[Number(r.lon),Number(r.lat)]},
      properties:{
        name:r.label||r.name||'',
        city:r.city||'',
        state:r.state||'',
        street:r.street||'',
        district:r.detail||r.district||'',
        country:r.country||'India',
        dbestSource:r.source||'live'
      }
    })).filter(f=>Number.isFinite(f.geometry.coordinates[0])&&Number.isFinite(f.geometry.coordinates[1]))};
  }
  function normFeature(f){
    const c=f?.geometry?.coordinates||[],p=f?.properties||{};
    const lon=Number(c[0]),lat=Number(c[1]);
    if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
    return {lat,lon,label:[p.name,p.street,p.city,p.state].filter(Boolean).join(', ')||p.name||'',detail:[p.district,p.country].filter(Boolean).join(', '),source:p.dbestSource||'photon'};
  }
  function mergeRows(){
    const out=[],seen=new Set();
    for(const list of arguments){
      for(const r of (list||[])){
        const lat=Number(r.lat),lon=Number(r.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
        const k=lat.toFixed(4)+','+lon.toFixed(4);if(seen.has(k))continue;seen.add(k);out.push(r);
      }
    }
    return out;
  }
  async function liveSearch(q,lat,lon){
    if(!LIVE||!key||String(q||'').trim().length<3)return[];
    try{
      const r=await originalFetch(LIVE,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({q,lat,lon})});
      const d=await r.json().catch(()=>({}));
      return r.ok&&Array.isArray(d.results)?d.results:[];
    }catch(e){return[]}
  }
  async function nominatim(q,lat,lon){
    try{
      const u=new URL('https://nominatim.openstreetmap.org/search');
      u.searchParams.set('format','jsonv2');u.searchParams.set('addressdetails','1');u.searchParams.set('limit','10');u.searchParams.set('countrycodes','in');u.searchParams.set('dedupe','1');u.searchParams.set('q',q);
      if(Number.isFinite(Number(lat))&&Number.isFinite(Number(lon))){const a=Number(lat),b=Number(lon);u.searchParams.set('viewbox',`${b-2.2},${a+1.8},${b+2.2},${a-1.8}`);u.searchParams.set('bounded','0')}
      const r=await originalFetch(u,{headers:{'Accept-Language':'en'}});if(!r.ok)return[];
      return (await r.json()).map(x=>({lat:+x.lat,lon:+x.lon,label:x.display_name||q,detail:[x.address?.city||x.address?.town||x.address?.village,x.address?.state,x.address?.postcode].filter(Boolean).join(', '),source:'nominatim'}));
    }catch(e){return[]}
  }

  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(!url.includes('photon.komoot.io/api/')) return originalFetch(input,init);
    let first=null,photonRows=[];
    try{
      first=await originalFetch(input,init);
      const data=await first.clone().json().catch(()=>null);
      photonRows=(data?.features||[]).map(normFeature).filter(Boolean);
    }catch(e){}
    try{
      const u=new URL(url),q=(u.searchParams.get('q')||'').trim();
      if(q.length<3)return first||originalFetch(input,init);
      const lat=Number(u.searchParams.get('lat')),lon=Number(u.searchParams.get('lon'));
      let live=await liveSearch(q,Number.isFinite(lat)?lat:null,Number.isFinite(lon)?lon:null);
      if(!live.length&&photonRows.length<4)live=await nominatim(q,lat,lon);
      const merged=mergeRows(live,photonRows);
      if(merged.length)return new Response(JSON.stringify(photonLike(merged)),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
      return first||originalFetch(input,init);
    }catch(e){return first||originalFetch(input,init)}
  };

  // If the primary OSM tile server has a temporary tile failure, retry that tile on Carto.
  document.addEventListener('error',function(e){
    const img=e.target;
    if(!(img instanceof HTMLImageElement)||!img.classList.contains('leaflet-tile')||img.dataset.dbestTileFallback==='1')return;
    const m=String(img.src||'').match(/^https:\/\/[abc]\.tile\.openstreetmap\.org\/(\d+)\/(\d+)\/(\d+)\.png/i);
    if(!m)return;
    img.dataset.dbestTileFallback='1';
    img.src=`https://a.basemaps.cartocdn.com/light_all/${m[1]}/${m[2]}/${m[3]}.png`;
  },true);

  function enhanceVisibleRide(){
    const pick=document.getElementById('cabxPickup')||document.getElementById('dbestPickup');
    const drop=document.getElementById('cabxDrop')||document.getElementById('dbestDrop');
    const card=pick?.closest('.cabxPanel')||pick?.closest('.dbestRideSearch');
    if(!pick||!drop||!card||card.dataset.exactBridge==='2')return;
    card.dataset.exactBridge='2';
    const note=document.createElement('div');
    note.style.cssText='font-size:10px;line-height:1.45;color:#40516c;background:#f7faff;border:1px solid #dce7f7;border-radius:11px;padding:8px 10px;margin:8px 0';
    note.innerHTML='<b>Exact pickup/drop:</b> Search by house/shop name, landmark, road, area, PIN code or city. If you do not tap a suggestion, DBest will still try to resolve the full typed address when you tap <b>See rides & fares</b>.';
    const actions=card.querySelector('.cabxActions,.dbestRideActions');
    if(actions)card.insertBefore(note,actions);else card.appendChild(note);
  }
  const mo=new MutationObserver(enhanceVisibleRide);mo.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(enhanceVisibleRide,1200);setTimeout(enhanceVisibleRide,100);

  window.DBEST_RIDE_EXACT_LOCATION={version:VERSION,liveSearch};
})();