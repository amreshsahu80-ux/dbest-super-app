const HOSTS=['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter'];
async function nearbyHandler(req,res){
 res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=300');
 const lat=Number(req.query.lat),lng=Number(req.query.lng);
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return res.status(400).json({error:'Invalid pickup coordinates'});
 const q='[out:json][timeout:9];(nwr(around:15000,'+lat+','+lng+')[name][amenity~"hospital|bus_station|marketplace|college|university|place_of_worship"];nwr(around:15000,'+lat+','+lng+')[name][railway=station];nwr(around:15000,'+lat+','+lng+')[name][tourism~"attraction|hotel|museum"];);out center 50;';
 const googleKey=String(process.env.GOOGLE_MAPS_SERVER_KEY||'').trim();
 const googleLookup=async()=>{
  if(!googleKey)throw Error('Google Places key missing');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
  try{
   const response=await fetch('https://places.googleapis.com/v1/places:searchNearby',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':googleKey,'X-Goog-FieldMask':'places.displayName,places.location,places.types'},body:JSON.stringify({includedTypes:['hospital','train_station','bus_station','airport','university','school','park','tourist_attraction'],maxResultCount:20,locationRestriction:{circle:{center:{latitude:lat,longitude:lng},radius:12000}}}),signal:controller.signal});
   if(!response.ok){const detail=await response.text().catch(()=>'');throw Error('Google Places New HTTP '+response.status+' '+detail.slice(0,180))}
   const data=await response.json();
   const seen=new Set();
   const places=(data.places||[]).map(x=>({name:String(x.displayName?.text||'').trim(),lat:Number(x.location?.latitude),lng:Number(x.location?.longitude),types:Array.isArray(x.types)?x.types:[]})).filter(x=>{const key=x.name.toLowerCase();if(!key||seen.has(key)||!Number.isFinite(x.lat)||!Number.isFinite(x.lng))return false;seen.add(key);return true}).slice(0,12);
   if(!places.length)throw Error('Google Places empty');
   return places;
  }finally{clearTimeout(timer)}
 };
 const queryHost=async host=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7200);
  try{
   const response=await fetch(host,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({data:q}),signal:controller.signal});
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();const seen=new Set();
   const places=(data.elements||[]).map(x=>({name:String(x.tags?.name||'').trim(),lat:Number(x.lat??x.center?.lat),lng:Number(x.lon??x.center?.lon)})).filter(x=>{const key=x.name.toLowerCase();if(!key||seen.has(key)||!Number.isFinite(x.lat)||!Number.isFinite(x.lng))return false;seen.add(key);return true}).slice(0,12);
   if(!places.length)throw Error('Empty response');
   return places;
  }finally{clearTimeout(timer)}
 };
 const nominatimFallback=async()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
  try{
   const delta=.18,viewbox=[lng-delta,lat+delta,lng+delta,lat-delta].join(',');
   const searches=['hospital','railway station','bus station','college','park'];
   const results=await Promise.allSettled(searches.map(async term=>{
    const url='https://nominatim.openstreetmap.org/search?format=json&limit=5&bounded=1&viewbox='+encodeURIComponent(viewbox)+'&q='+encodeURIComponent(term);
    const response=await fetch(url,{headers:{'Accept':'application/json','User-Agent':'DBestCabNearby/1.0 (dbest4u.com)'},signal:controller.signal});
    if(!response.ok)throw Error('Nominatim HTTP '+response.status);
    return response.json();
   }));
   const seen=new Set(),places=[];
   for(const result of results){if(result.status!=='fulfilled')continue;
    for(const p of result.value||[]){const name=String(p.name||p.display_name?.split(',')[0]||'').trim(),plat=Number(p.lat),plng=Number(p.lon),key=name.toLowerCase();
     if(!name||seen.has(key)||!Number.isFinite(plat)||!Number.isFinite(plng))continue;
     const km=Math.hypot((plat-lat)*111.2,(plng-lng)*111.2*Math.cos(lat*Math.PI/180));
     if(km>15)continue;
     const klass=String(p.class||p.category||'').toLowerCase(),kind=String(p.type||'').toLowerCase();
     const type=klass==='railway'&&/station|halt/.test(kind)?'train_station':
      klass==='amenity'&&/hospital|bus_station|college|university/.test(kind)?kind:
      klass==='aeroway'&&/aerodrome/.test(kind)?'airport':
      klass==='leisure'&&kind==='park'?'park':
      /\\bhospital\\b/i.test(name)?'hospital':/\\b(bus stand|bus station)\\b/i.test(name)?'bus_station':
      /\\b(railway station|junction)\\b/i.test(name)?'train_station':/\\b(college|university)\\b/i.test(name)?'college':
      /\\bpark\\b/i.test(name)?'park':'';
     if(!type)continue;
     seen.add(key);places.push({name:type==='train_station'&&!/station|junction|halt/i.test(name)?name+' Railway Station':name,lat:plat,lng:plng,types:[type]});
    }
   }
   if(!places.length)throw Error('Nominatim empty');return places.slice(0,12);
  }finally{clearTimeout(timer)}
 };
 try{
  const places=await Promise.any([googleLookup(),...HOSTS.map(queryHost),nominatimFallback()]);
  return res.status(200).json({places,source:'nearby-provider'});
 }catch(e){
  console.error('DBest nearby: all providers failed',JSON.stringify((e.errors||[]).map(x=>String(x.message||x))));
  return res.status(503).json({places:[],error:'Nearby location providers unavailable'});
 }
}

module.exports = async function handler(req, res) {
  if (req.query && req.query.mode === 'nearby') return nearbyHandler(req,res);
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const googleMapsApiKey = String(
    process.env.GOOGLE_MAPS_BROWSER_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    ''
  ).trim();

  const payload = {
    googleMapsApiKey
  };

  res.status(200).send(
    'window.DBEST_RUNTIME_SECRETS = Object.freeze(' + JSON.stringify(payload) + ');'
  );
};
