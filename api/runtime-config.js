const HOSTS=['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter'];
async function nearbyHandler(req,res){
 res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=300');
 const lat=Number(req.query.lat),lng=Number(req.query.lng);
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return res.status(400).json({error:'Invalid pickup coordinates'});
 const q='[out:json][timeout:9];(nwr(around:15000,'+lat+','+lng+')[name][amenity~"hospital|bus_station|marketplace|college|university|place_of_worship"];nwr(around:15000,'+lat+','+lng+')[name][railway=station];nwr(around:15000,'+lat+','+lng+')[name][tourism~"attraction|hotel|museum"];);out center 50;';
 const googleKey=String(process.env.GOOGLE_MAPS_SERVER_KEY||process.env.GOOGLE_MAPS_API_KEY||process.env.GOOGLE_MAPS_BROWSER_KEY||'').trim();
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
   const places=(data.elements||[]).map(x=>({name:String(x.tags?.name||'').trim(),lat:Number(x.lat??x.center?.lat),lng:Number(x.lon??x.center?.lon),types:[x.tags?.amenity,x.tags?.railway,x.tags?.tourism,x.tags?.aeroway,x.tags?.leisure].filter(Boolean).map(v=>({station:'train_station',bus_station:'bus_station',hospital:'hospital',college:'college',university:'university',park:'park',attraction:'tourist_attraction'}[v]||v))})).filter(x=>{const key=x.name.toLowerCase();if(!key||seen.has(key)||!Number.isFinite(x.lat)||!Number.isFinite(x.lng))return false;seen.add(key);return true}).slice(0,12);
   if(!places.length)throw Error('Empty response');
   return places;
  }finally{clearTimeout(timer)}
 };
 try{
  const places=await Promise.any([googleLookup(),...HOSTS.map(queryHost)]);
  return res.status(200).json({places,source:'openstreetmap'});
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
