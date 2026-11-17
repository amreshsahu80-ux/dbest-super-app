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
   const url='https://maps.googleapis.com/maps/api/place/nearbysearch/json?location='+encodeURIComponent(lat+','+lng)+'&radius=12000&type=point_of_interest&key='+encodeURIComponent(googleKey);
   const response=await fetch(url,{signal:controller.signal});
   if(!response.ok)throw Error('Google HTTP '+response.status);
   const data=await response.json();
   if(data.status!=='OK')throw Error('Google Places '+String(data.status)+' '+String(data.error_message||''));
   const seen=new Set();
   const places=(data.results||[]).map(x=>({name:String(x.name||'').trim(),lat:Number(x.geometry?.location?.lat),lng:Number(x.geometry?.location?.lng)})).filter(x=>{const key=x.name.toLowerCase();if(!key||seen.has(key)||!Number.isFinite(x.lat)||!Number.isFinite(x.lng))return false;seen.add(key);return true}).slice(0,12);
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
 try{
  const places=await Promise.any([googleLookup(),...HOSTS.map(queryHost)]);
  return res.status(200).json({places,source:'openstreetmap'});
 }catch(e){
  console.error('DBest nearby: all providers failed',JSON.stringify((e.errors||[]).map(x=>String(x.message||x))));
  return res.status(503).json({places:[],error:'Nearby location providers unavailable'});
 }
}

async function marketplaceRoadDistanceHandler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(process.env.VERCEL_ENV==='production'||process.env.MARKETPLACE_ROUTING_PREVIEW_ENABLED!=='true')return res.status(503).json({error:'Preview routing disabled'});
 const key=process.env.GOOGLE_MAPS_SERVER_API_KEY;
 const registryRaw=process.env.MARKETPLACE_VERIFIED_VENDOR_COORDS;
 if(!key||!registryRaw)return res.status(503).json({error:'Verified routing configuration unavailable'});
 let registry;
 try{registry=JSON.parse(registryRaw)}catch(_){return res.status(503).json({error:'Verified vendor registry invalid'})}
 const {vendorId,destination}=req.body||{};
 const id=typeof vendorId==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(vendorId)?vendorId:null;
 if(!id||!Object.prototype.hasOwnProperty.call(registry,id))return res.status(422).json({error:'Approved vendor location required'});
 const origin=registry[id];
 const valid=p=>p&&typeof p.lat==='number'&&typeof p.lng==='number'&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180&&!(p.lat===0&&p.lng===0);
 if(!valid(origin)||!valid(destination))return res.status(400).json({error:'Verified coordinates required'});
 try{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),7000);
  let response;
  try{response=await fetch('https://routes.googleapis.com/directions/v2:computeRoutes',{
   method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':'routes.distanceMeters,routes.duration'},
   body:JSON.stringify({origin:{location:{latLng:{latitude:origin.lat,longitude:origin.lng}}},destination:{location:{latLng:{latitude:destination.lat,longitude:destination.lng}}},travelMode:'DRIVE',routingPreference:'TRAFFIC_UNAWARE'})
  })}finally{clearTimeout(timeout)}
  if(!response.ok)return res.status(502).json({error:'Verified route unavailable'});
  const data=await response.json();
  const meters=data.routes?.[0]?.distanceMeters;
  if(!Number.isFinite(meters)||meters<0)return res.status(502).json({error:'No verified driving route available'});
  return res.status(200).json({distanceKm:meters/1000,source:'google-routes',verified:true,vendorId:id});
 }catch(_){return res.status(502).json({error:'Routing service temporarily unavailable'})}
};

module.exports = async function handler(req, res) {
  if (req.query && req.query.mode === 'marketplace-road-distance') return marketplaceRoadDistanceHandler(req,res);
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
