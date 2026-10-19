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
console.log('Cab and Nearby syntax/static checks passed. Browser E2E remains required.');
