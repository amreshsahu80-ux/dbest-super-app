const fs=require('node:fs');const assert=require('node:assert/strict');const vm=require('node:vm');const s=fs.readFileSync('cab-selected-ui-v3.js','utf8');
new vm.Script(s,{filename:'cab-selected-ui-v3.js'});
assert.match(s,/if\(predictions\.length\)return predictions/,'Google empty results must reach fallback');
assert.match(s,/new Promise\(resolve=>setTimeout\(\(\)=>resolve\(\[\]\),3500\)\)/,'Google timeout must be bounded');
assert.match(s,/controller\.abort\(\),4500/,'Supabase request must have a timeout');
assert.match(s,/Number\.isFinite\(x\.lat\)&&Number\.isFinite\(x\.lng\)/,'Supabase coordinates must be valid');
assert.match(s,/if\(rows\.length&&hasRenderedPlaces\)return/,'Late nearby responses must not overwrite valid results');
for(const token of ['cab6D','cab6P','cab6NearbyRail','cab6AddStop','roundtrip','carpool'])assert.ok(s.includes(token),'Missing Cab feature '+token);
console.log('Cab static regression guards passed (not browser E2E)');
