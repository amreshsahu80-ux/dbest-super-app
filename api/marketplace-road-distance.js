// Preview-only routing proxy. Configure GOOGLE_MAPS_SERVER_API_KEY on Vercel.
// Coordinates are supplied from the authenticated marketplace's verified vendor record.
module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const key=process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if(!key)return res.status(503).json({error:'Routing service not configured'});
  const {origin,destination}=req.body||{};
  const valid=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;
  if(!valid(origin)||!valid(destination))return res.status(400).json({error:'Verified coordinates required'});
  try{
    const response=await fetch('https://routes.googleapis.com/directions/v2:computeRoutes',{
      method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':'routes.distanceMeters,routes.duration'},
      body:JSON.stringify({origin:{location:{latLng:{latitude:origin.lat,longitude:origin.lng}}},destination:{location:{latLng:{latitude:destination.lat,longitude:destination.lng}}},travelMode:'DRIVE',routingPreference:'TRAFFIC_UNAWARE'})
    });
    const data=await response.json();
    if(!response.ok||!data.routes?.[0]?.distanceMeters)return res.status(502).json({error:'No verified driving route available'});
    return res.status(200).json({distanceKm:data.routes[0].distanceMeters/1000,source:'google-routes',verified:true});
  }catch(_){return res.status(502).json({error:'Routing service temporarily unavailable'});}
};