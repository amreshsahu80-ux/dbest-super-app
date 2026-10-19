const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const cab=fs.readFileSync('cab-selected-ui-v3.js','utf8');
const nearby=fs.readFileSync('api/runtime-config.js','utf8');
new vm.Script(cab,{filename:'cab-selected-ui-v3.js'});
new vm.Script(nearby,{filename:'api/runtime-config.js'});
for(const token of ['cab6P','cab6D','cab6DS','cab6NearbyRail','cab6AddStop','roundtrip','carpool']) assert.ok(cab.includes(token),'Missing existing Cab feature '+token);
for(const token of ['lon:S.p.lng','new Promise(resolve=>setTimeout(()=>resolve([]),3500))','setTimeout(()=>controller.abort(),7000)','cab6TileStatus','basemaps.cartocdn.com','No location found.','if(rows.length&&hasRenderedPlaces)return']) assert.ok(cab.includes(token),'Missing Cab regression guard '+token);
for(const token of ['places.googleapis.com/v1/places:searchNearby','GOOGLE_MAPS_SERVER_KEY','nominatimFallback','if(km>15)continue','Chakradharpur']) { if(token!=='Chakradharpur') assert.ok(nearby.includes(token),'Missing nearby provider guard '+token); }
assert.ok(!nearby.includes('maps/api/place/nearbysearch/json'),'Legacy Places lookup must not be used');
assert.ok(!nearby.includes('process.env.GOOGLE_MAPS_BROWSER_KEY||'),'Server lookup must not use referer-restricted browser key');

assert.ok(nearby.includes('verifiedCkp'), 'Missing verified locality-specific fallback');
assert.ok(nearby.includes('photonLookup'), 'Missing independent geodata source');
assert.ok(nearby.includes('haversineKm(lat,lng,p.lat,p.lng)<=15'), 'Local landmark radius must be enforced');
assert.ok(!cab.includes('Diagnostic: '), 'Technical diagnostics must not appear to customers');
assert.ok(cab.includes('Retry nearby places'), 'Customer needs a nearby retry option');
(async()=>{
 const handler=require('../api/runtime-config.js');
 const oldFetch=global.fetch;
 const oldError=console.error;
 try{
  global.fetch=async()=>{throw new Error('Simulated upstream outage')};
  console.error=()=>{};
  const invoke=async(lat,lng)=>{
   let code=0,body;
   const res={setHeader(){},status(v){code=v;return this},json(v){body=v;return this}};
   await handler({query:{mode:'nearby',lat:String(lat),lng:String(lng)}},res);
   return {code,body};
  };
  const ckp=await invoke(22.675,85.635);
  assert.equal(ckp.code,200,'Verified local fallback must survive provider outage');
  assert.ok(ckp.body.places.some(x=>/Railway Hospital, Chakradharpur/.test(x.name)));
  assert.ok(ckp.body.places.some(x=>/Chakradharpur Railway Station/.test(x.name)));
  assert.ok(ckp.body.places.every(p=>p.types?.length),'Fallback must preserve category');
  const outside=await invoke(23.35,85.33);
  assert.equal(outside.code,503,'Do not present Chakradharpur data outside the validated locality');
  assert.equal(outside.body.places.length,0);
  console.log('Cab static and simulated-provider-outage checks passed');
 }finally{global.fetch=oldFetch;console.error=oldError}
})().catch(e=>{console.error(e);process.exitCode=1});

