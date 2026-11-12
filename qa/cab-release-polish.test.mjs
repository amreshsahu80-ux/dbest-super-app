import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../cab-selected-ui-v3.js',import.meta.url),'utf8');
function between(a,b) {
 const start=source.indexOf(a),end=source.indexOf(b,start+a.length);
 assert.ok(start>=0 && end>start,'expected application code segment: '+a);
 return source.slice(start,end);
}
test('the shipped Cab JavaScript parses',()=>{
 assert.doesNotThrow(()=>new vm.Script(source));
});
test('new Google Places autocomplete hard-restricts 500 km predictions, including unknown distances',async()=>{
 const code=between('async function cabGoogleSuggestions(', '\nasync function searchLocations(');
 const suggestions=[{placePrediction:{text:{text:'Nearby station'},distanceMeters:35000}},
 {placePrediction:{text:{text:'Faraway city'},distanceMeters:650000}},
 {placePrediction:{text:{text:'Unknown coordinates'},distanceMeters:undefined}}];
 let request;
 const Places={
  AutocompleteSessionToken: class {},
  AutocompleteSuggestion:{fetchAutocompleteSuggestions:async r=>{request=r;return {suggestions}}}
 };
 const ctx={window:{google:{maps:{places:Places,importLibrary:async()=>Places}}},
  console:{warn:()=>{}},cabDestinationSession:null,CAB_DESTINATION_NEARBY_KM:500,
  cabSearchBounds:()=>({north:27,south:18,east:89,west:81})};
 const nearby=await vm.runInNewContext(code+'\ncabGoogleSuggestions("sta",{lat:22.67,lng:85.63},true)',ctx);
 assert.deepEqual([...nearby.map(x=>x.label)],['Nearby station']);
 assert.ok(request.origin && request.locationRestriction);
 const allIndia=await vm.runInNewContext(code+'\ncabGoogleSuggestions("sta",{lat:22.67,lng:85.63},false)',ctx);
 assert.deepEqual([...allIndia.map(x=>x.label)],['Nearby station','Faraway city','Unknown coordinates']);
});
test('selected 500 km radius is checked against actual coordinates (not only a square)',()=>{
 const code=between('const CAB_DESTINATION_NEARBY_KM=500;', '\nasync function cabGoogleSuggestions(');
 const ctx={S:{p:{lat:22.67,lng:85.63},destinationScope:'nearby'},$(){return null}};
 const result=vm.runInNewContext(code+'\n([cabDestinationPermitted({lat:22.80,lng:86.20}),cabDestinationPermitted({lat:10.0,lng:76.0}),cabDestinationPermitted({lat:27.1,lng:89.8})])',ctx);
 assert.equal(result[0],true);
 assert.equal(result[1],false);
 assert.equal(result[2],false);
});
test('release polish never displays an invented Vaahak pickup time',()=>{
 assert.doesNotMatch(source,/function pickupEta\(/);
 assert.doesNotMatch(source,/~\$\{pickupEta\(/);
 assert.match(source,/Pickup ETA after assignment/);
});
test('removed hourly rental shortcut and preserved ride, return, car pool and stops',()=>{
 assert.doesNotMatch(source,/data-q="rental"/);
 for(const required of ['data-trip="oneway"','data-trip="roundtrip"','data-trip="carpool"','cab6AddStop']){
  assert.ok(source.includes(required),required);
 }
});
test('nearby photo merging and map attribution survive fallback',()=>{
 assert.match(source,/if\(oldHasPhoto&&!newHasPhoto\)/);
 assert.match(source,/attributionControl:true,preferCanvas:true/);
 assert.match(source,/© OpenStreetMap contributors/);
});
test('manual pickup and stale suggestion callbacks are guarded',()=>{
 assert.match(source,/pickupUserRevision\+\+;pickupGpsSeq\+\+/);
 assert.match(source,/if\(run!==seq\|\|inp\.value\.trim\(\)!==term\)return/);
});
