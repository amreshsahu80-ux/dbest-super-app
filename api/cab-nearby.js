const HOSTS=['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter'];
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=300');
 const lat=Number(req.query.lat),lng=Number(req.query.lng);
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return res.status(400).json({error:'Invalid pickup coordinates'});
 const q='[out:json][timeout:9];(nwr(around:15000,'+lat+','+lng+')[name][amenity~"hospital|bus_station|marketplace|college|university|place_of_worship"];nwr(around:15000,'+lat+','+lng+')[name][railway=station];nwr(around:15000,'+lat+','+lng+')[name][tourism~"attraction|hotel|museum"];);out center 50;';
 const errors=[];
 for(const host of HOSTS){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8500);
  try{
   const response=await fetch(host,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({data:q}),signal:controller.signal});
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();const seen=new Set();
   const places=(data.elements||[]).map(x=>({name:String(x.tags?.name||'').trim(),lat:Number(x.lat??x.center?.lat),lng:Number(x.lon??x.center?.lon)})).filter(x=>{const key=x.name.toLowerCase();if(!key||seen.has(key)||!Number.isFinite(x.lat)||!Number.isFinite(x.lng))return false;seen.add(key);return true}).slice(0,12);
   if(places.length)return res.status(200).json({places,source:'openstreetmap'});
   errors.push('Empty '+host);
  }catch(e){errors.push(host+' '+String(e.message||e))}
  finally{clearTimeout(timer)}
 }
 return res.status(503).json({places:[],error:'Nearby location providers unavailable',details:errors});
};