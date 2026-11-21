const HOSTS=['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter'];
// Per-instance short-lived caches reduce repeated requests to public providers.
// Do not cache customer-identifying data: only a coarsened spatial grid and public POIs.
const nearCache=new Map();
const positiveTtlMs=10*60*1000,negativeTtlMs=75*1000;
const cacheKey=(lat,lng)=>`${(Math.round(lat*100)/100).toFixed(2)}:${(Math.round(lng*100)/100).toFixed(2)}`;
async function nearbyHandler(req,res){
 res.setHeader('Cache-Control','no-store');
 const lat=Number(req.query.lat),lng=Number(req.query.lng);
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return res.status(400).json({error:'Invalid pickup coordinates'});
 const cacheId=cacheKey(lat,lng),entry=nearCache.get(cacheId);
 if(entry&&entry.expires>Date.now()){
   if(entry.places.length)return res.status(200).json({places:entry.places,source:entry.source,fromCache:true});
   res.setHeader('Retry-After','75');return res.status(503).json({places:[],error:'Nearby places temporarily unavailable'});
 }
 if(nearCache.size>90)nearCache.clear();
 const q='[out:json][timeout:9];(nwr(around:15000,'+lat+','+lng+')[name][amenity~"hospital|bus_station|marketplace|college|university|place_of_worship"];nwr(around:15000,'+lat+','+lng+')[name][railway=station];nwr(around:15000,'+lat+','+lng+')[name][tourism~"attraction|hotel|museum"];);out center 50;';
 const googleKey=String(process.env.GOOGLE_MAPS_SERVER_KEY||process.env.GOOGLE_MAPS_API_KEY||'').trim();
 const googleLookup=async()=>{
  if(!googleKey)throw Error('Google Places server key not configured');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
  try{
   const response=await fetch('https://places.googleapis.com/v1/places:searchNearby',{
    method:'POST',signal:controller.signal,headers:{
     'Content-Type':'application/json','X-Goog-Api-Key':googleKey,
     'X-Goog-FieldMask':'places.displayName,places.location,places.types'
    },
    body:JSON.stringify({includedTypes:['train_station','bus_station','airport','hospital',
     'university','school','shopping_mall','park','tourist_attraction'],
     maxResultCount:20,rankPreference:'DISTANCE',locationRestriction:{
      circle:{center:{latitude:lat,longitude:lng},radius:12000}}})
   });
   if(!response.ok)throw Error('Google Nearby HTTP '+response.status);
   const data=await response.json();
   const seen=new Set(),places=(data.places||[]).map(p=>({
    name:String(p.displayName?.text||'').trim(),lat:Number(p.location?.latitude),
    lng:Number(p.location?.longitude),types:Array.isArray(p.types)?p.types:[]
   })).filter(p=>{
    const k=p.name.toLocaleLowerCase();
    if(!k||seen.has(k)||!Number.isFinite(p.lat)||!Number.isFinite(p.lng))return false;
    seen.add(k);return true;
   }).slice(0,12);
   if(!places.length)throw Error('Google Nearby empty');
   return {places,source:'google'};
  }finally{clearTimeout(timer)}
 };
 const queryHost=async host=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7200);
  try{
   const response=await fetch(host,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({data:q}),signal:controller.signal});
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();const seen=new Set();
   const places=(data.elements||[]).map(x=>({name:String(x.tags?.name||'').trim(),lat:Number(x.lat??x.center?.lat),lng:Number(x.lon??x.center?.lon),types:[x.tags?.amenity,x.tags?.railway,x.tags?.tourism,x.tags?.shop].filter(Boolean)})).filter(x=>{const key=x.name.toLowerCase();if(!key||seen.has(key)||!Number.isFinite(x.lat)||!Number.isFinite(x.lng))return false;seen.add(key);return true}).slice(0,12);
   if(!places.length)throw Error('Empty response');
   return {places,source:'openstreetmap'};
  }finally{clearTimeout(timer)}
 };
 try{
  // Google is the primary licensed source. Public Overpass endpoints are
  // backups only; avoid hammering three anonymous services on every request.
  let result;
  if(googleKey){
   try{result=await googleLookup()}catch(e){console.warn('DBest Google Nearby unavailable:',String(e.message||e))}
  }
  if(!result){
   try{result=await Promise.any(HOSTS.slice(0,2).map(queryHost))}
   catch(e){console.warn('DBest backup Nearby unavailable:',JSON.stringify((e.errors||[]).map(x=>String(x.message||x))))}
  }
  if(result?.places?.length){
   // Google Places content must not be cached; only public OSM fallback is cached.
   if(result.source==='openstreetmap')nearCache.set(cacheId,{places:result.places,source:result.source,expires:Date.now()+positiveTtlMs});
   if(result.source==='openstreetmap')res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=300');
   return res.status(200).json(result);
  }
  nearCache.set(cacheId,{places:[],source:'none',expires:Date.now()+negativeTtlMs});
  res.setHeader('Retry-After','75');
  return res.status(503).json({places:[],error:'Nearby places temporarily unavailable'});
 }catch(e){
  console.error('DBest Nearby handler failure:',String(e.message||e));
  return res.status(503).json({places:[],error:'Nearby places temporarily unavailable'});
 }
}

module.exports = async function handler(req, res) {
  // Isolated Cab QA diagnostics: boolean configuration flags ONLY; never return keys.
  if (req.query && req.query.mode === 'cab-qa-check') {
    res.setHeader('Cache-Control','no-store');
    return res.status(200).json({
      qaGoogleBrowserKeyConfigured: !!String(process.env.GOOGLE_MAPS_BROWSER_KEY||'').trim(),
      qaGoogleNearbyServerKeyConfigured: !!String(process.env.GOOGLE_MAPS_SERVER_KEY||'').trim(),
      mapDiagnosticsVersion: '20261112-cab-qa'
    });
  }
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
