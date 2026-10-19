const HOSTS=['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter'];
async function nearbyHandler(req,res){
 res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=300');
 const lat=Number(req.query.lat),lng=Number(req.query.lng);
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return res.status(400).json({error:'Invalid pickup coordinates'});
 const q='[out:json][timeout:9];(nwr(around:15000,'+lat+','+lng+')[name][amenity~"hospital|bus_station|marketplace|college|university|place_of_worship"];nwr(around:15000,'+lat+','+lng+')[name][railway=station];nwr(around:15000,'+lat+','+lng+')[name][tourism~"attraction|hotel|museum"];);out center 50;';

 // Emergency geographic fallback: exact public landmarks previously returned
 // by live geodata for Chakradharpur, never generic/random addresses.
 const verifiedCkp=[
  {name:'Railway Hospital, Chakradharpur',lat:22.675384,lng:85.62599,types:['hospital']},
  {name:'Government Hospital, Chakradharpur',lat:22.683167,lng:85.611951,types:['hospital']},
  {name:'Chakradharpur Railway Station',lat:22.6783014,lng:85.6270604,types:['train_station']},
  {name:'Lotapahar Railway Station',lat:22.6175962,lng:85.5664442,types:['train_station']},
  {name:'Barabambo Railway Station',lat:22.7013297,lng:85.7282764,types:['train_station']}
 ];
 const haversineKm=(a,b,c,d)=>{const rd=Math.PI/180,dy=(c-a)*rd,dx=(d-b)*rd;
  const k=Math.sin(dy/2)**2+Math.cos(a*rd)*Math.cos(c*rd)*Math.sin(dx/2)**2;
  return 12742*Math.atan2(Math.sqrt(k),Math.sqrt(Math.max(0,1-k)))};
 const verifiedOsmPhoto=tags=>{
  // Show a *real* place photo only when OSM associates the image with this POI.
  // Never substitute generic stock imagery, and never proxy arbitrary photo URLs.
  const input=String(tags?.image||tags?.wikimedia_commons||'').trim();
  if(!input)return null;
  if(/^File:/i.test(input)){
   const file=input.slice(5).trim();
   if(!file||file.length>170||!/\.(jpe?g|png|webp)$/i.test(file))return null;
   return {photo:'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(file)+'?width=640',attribution:'Wikimedia Commons • OpenStreetMap'};
  }
  try{
   const url=new URL(input);
   if(url.protocol!=='https:'||!['upload.wikimedia.org','commons.wikimedia.org'].includes(url.hostname))return null;
   if(!/\.(jpe?g|png|webp)$/i.test(url.pathname))return null;
   return {photo:url.href,attribution:'Wikimedia Commons • OpenStreetMap'};
  }catch{return null}
 };
 const ckpSeed=haversineKm(lat,lng,22.675,85.635)<=9?
  verifiedCkp.filter(p=>haversineKm(lat,lng,p.lat,p.lng)<=15):[];
 const resultType=p=>(p.types||[]).some(t=>t==='hospital')?0:(p.types||[]).some(t=>t==='train_station')?1:
  (p.types||[]).some(t=>t==='bus_station')?2:(p.types||[]).some(t=>t==='airport')?3:
  (p.types||[]).some(t=>t==='college'||t==='university')?4:(p.types||[]).some(t=>t==='park')?5:6;
 const finalize=rows=>{const seen=new Set();return (rows||[]).filter(p=>{
  if(!p||!p.name||/^(hospital|railway station|bus station|bus stand|college|park|airport|clinic|medical|unknown)$/i.test(String(p.name).trim())||!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||haversineKm(lat,lng,p.lat,p.lng)>15)return false;
  const key=String(p.name).trim().toLowerCase();if(seen.has(key))return false;seen.add(key);return true;
 }).sort((a,b)=>resultType(a)-resultType(b)||haversineKm(lat,lng,a.lat,a.lng)-haversineKm(lat,lng,b.lat,b.lng)).slice(0,12)};
 const photonLookup=async()=>{
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),4700);
  try{
   const searches=[['hospital','hospital'],['railway station','train_station'],['bus stand','bus_station'],['college','college'],['park','park']];
   // Query only a pair at a time to reduce public-service rate limiting.
   const rows=[];
   for(const [term,type] of searches.slice(0,3)){
    const u='https://photon.komoot.io/api/?q='+encodeURIComponent(term)+'&limit=8&lat='+encodeURIComponent(lat)+'&lon='+encodeURIComponent(lng);
    const response=await fetch(u,{signal:ctl.signal,headers:{Accept:'application/json','User-Agent':'DBestCabNearby/1.0 (dbest4u.com)'}});
    if(!response.ok)continue;
    const body=await response.json();
    for(const p of body.features||[]){const name=String(p.properties?.name||'').trim(),coords=p.geometry?.coordinates||[];
     const plat=Number(coords[1]),plng=Number(coords[0]);
     if(!name||!Number.isFinite(plat)||!Number.isFinite(plng))continue;
     if(haversineKm(lat,lng,plat,plng)>15)continue;
     rows.push({name,lat:plat,lng:plng,types:[type]});
    }
    if(rows.length>=5)break;
   }
   const valid=finalize(rows);if(!valid.length)throw Error('Photon nearby empty');return valid;
  }finally{clearTimeout(timer)}
 };

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
   const places=(data.elements||[]).map(x=>({name:String(x.tags?.name||'').trim(),lat:Number(x.lat??x.center?.lat),lng:Number(x.lon??x.center?.lon),types:[x.tags?.amenity,x.tags?.railway,x.tags?.aeroway,x.tags?.leisure].filter(Boolean).map(v=>({station:'train_station',bus_station:'bus_station',hospital:'hospital',college:'college',university:'university',park:'park',aerodrome:'airport'}[v]||v)),...verifiedOsmPhoto(x.tags)})).filter(x=>{const key=x.name.toLowerCase();if(!key||seen.has(key)||!Number.isFinite(x.lat)||!Number.isFinite(x.lng))return false;seen.add(key);return true}).slice(0,12);
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
    const url='https://nominatim.openstreetmap.org/search?format=json&extratags=1&limit=5&bounded=1&viewbox='+encodeURIComponent(viewbox)+'&q='+encodeURIComponent(term);
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
      /\bhospital\b/i.test(name)?'hospital':/\b(bus stand|bus station)\b/i.test(name)?'bus_station':
      /\b(railway station|junction)\b/i.test(name)?'train_station':/\b(college|university)\b/i.test(name)?'college':
      /\bpark\b/i.test(name)?'park':'';
     if(!type)continue;
     seen.add(key);places.push({name:type==='train_station'&&!/station|junction|halt/i.test(name)?name+' Railway Station':name,lat:plat,lng:plng,types:[type],...verifiedOsmPhoto(p.extratags||p)});
    }
   }
   if(!places.length)throw Error('Nominatim empty');return places.slice(0,12);
  }finally{clearTimeout(timer)}
 };
 try{
  const result=Promise.any([googleLookup(),...HOSTS.map(queryHost),nominatimFallback(),photonLookup()]);
  // Countrywide providers are primary; a verified local cache prevents false
  // empty screens in Chakradharpur during temporary provider throttling.
  const places=ckpSeed.length?await Promise.race([result,new Promise(resolve=>setTimeout(()=>resolve(ckpSeed),3400))]):await result;
  return res.status(200).json({places:finalize([...(places||[]),...ckpSeed]),source:places===ckpSeed?'local-verified-fallback':'nearby-provider'});
 }catch(e){
  if(ckpSeed.length)return res.status(200).json({places:finalize(ckpSeed),source:'local-verified-fallback'});
  console.error('DBest nearby: all providers failed',JSON.stringify((e.errors||[]).map(x=>String(x.message||x)).slice(0,5)));
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
