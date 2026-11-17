// Preview-only, fail-closed Google Routes proxy. Never accept a browser-supplied vendor origin.
// Configure GOOGLE_MAPS_SERVER_API_KEY and MARKETPLACE_VERIFIED_VENDOR_COORDS (JSON map
// of approved vendor IDs to {lat,lng}) in an isolated Preview environment only.
// Before enabling for production, add authenticated requests and durable rate limiting.
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
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
