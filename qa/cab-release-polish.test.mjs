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

test('Google reverse geocode prefers a street address over an administrative locality',async()=>{
 const code=between('async function reverseGoogle(', '\nasync function reverseNominatim(');
 const ctx={
   console:{warn:()=>{}},setTimeout,clearTimeout,
   S:{provider:'fallback'},
   initSearchProvider:async()=>{},
   waitGoogleKey:async()=> 'QA_KEY',
   loadScript:async()=>{},
   window:{google:{maps:{Geocoder:class{async geocode(req){
     assert.equal(req.location.lat,22.67);
     return {results:[
       {formatted_address:'General Chakradharpur locality',types:['locality']},
       {formatted_address:'Bata Road, Chakradharpur, Jharkhand',types:['route']}
     ]};
   }}}}},
 };
 ctx.google=ctx.window.google;
 const result=await vm.runInNewContext(code+'\nreverseGoogle(22.67,85.63)',ctx);
 assert.equal(result,'Bata Road, Chakradharpur, Jharkhand');
});
test('fallback reverse geocoding prefers a real mapped road when provided',async()=>{
 const code=between('async function reverseNominatim(', '\nfunction placePhotoUrl(');
 const ctx={
  AbortController, URLSearchParams,encodeURIComponent,setTimeout,clearTimeout,
  fetch:async()=>({ok:true,json:async()=>({display_name:'Danda, West Singhbhum, Jharkhand',
     address:{road:'Bata Road',town:'Chakradharpur',state:'Jharkhand',postcode:'833102'}})}),
  console:{warn:()=>{}}
 };
 const result=await vm.runInNewContext(code+'\nreverseNominatim(22.67,85.63)',ctx);
 assert.equal(result,'Bata Road, Chakradharpur, Jharkhand, 833102');
});
test('late Google runtime response still applies the Maps key after render timeout',async()=>{
 const runtime=readFileSync(new URL('../runtime-config.js',import.meta.url),'utf8');
 assert.doesNotThrow(()=>new vm.Script(runtime));
 const code=runtime.slice(runtime.indexOf('  const loadRuntimeSecrets='),runtime.indexOf('  const googleConfigured='));
 assert.match(code,/s\.onload=\(\)=>\{s\.dataset\.loaded='1';apply\(\)\}/);
 assert.match(code,/setTimeout\(finish,1600\)/);
 const events=[];
 let listener=null;
 const script={dataset:{},setAttribute(){},set src(v){},set async(v){},set onload(fn){listener=fn}};
 const ctx={
  document:{querySelector:()=>null,createElement:()=>script,head:{appendChild:()=>{}}},
  window:{DBEST_RUNTIME_CONFIG:{googleMapsApiKey:''},DBEST_RUNTIME_SECRETS:{}},
  V:'qa',encodeURIComponent,setTimeout:(fn,ms)=>{events.push({fn,ms});return 1},
  applyRuntimeSecrets:()=>{ctx.window.DBEST_RUNTIME_CONFIG.googleMapsApiKey=ctx.window.DBEST_RUNTIME_SECRETS.googleMapsApiKey||''}
 };
 const p=vm.runInNewContext(code+'\nloadRuntimeSecrets()',ctx);
 events.find(x=>x.ms===1600).fn();
 await p;
 ctx.window.DBEST_RUNTIME_SECRETS.googleMapsApiKey='SAFE_LATE_QA_KEY';
 listener();
 assert.equal(ctx.window.DBEST_RUNTIME_CONFIG.googleMapsApiKey,'SAFE_LATE_QA_KEY');
});
test('retries late provider initialization instead of permanently caching fallback',()=>{
 const code=between('async function initSearchProvider(', '\nasync function initLeaflet(');
 assert.match(code,/waitGoogleKey\(6500\)/);
 assert.match(code,/searchProviderPromise=null/);
});

test('Google reverse geocoder reports denied API request instead of a permanent checking message',async()=>{
 const code=between('let cabReverseGoogleStatus=', '\nasync function reverseNominatim(');
 const ctx={S:{provider:'fallback'},console:{warn:()=>{}},setTimeout,clearTimeout,
  cfg:()=>({googleMapsApiKey:'QA_DUMMY'}),
  initSearchProvider:async()=>{},waitGoogleKey:async()=> 'QA_DUMMY',loadScript:async()=>{},
  window:{google:{maps:{Geocoder:class{async geocode(){throw Error('REQUEST_DENIED')}}}}}};
 ctx.google=ctx.window.google;
 const data=await vm.runInNewContext(code+'\nreverseGoogle(22.67,85.63).then(v=>({v,status:cabReverseGoogleStatus,message:cabGoogleStatusMessage()}))',ctx);
 assert.equal(data.v,'');assert.equal(data.status,'REQUEST_DENIED');
 assert.equal(data.message,'Google Geocoding access denied');
});
test('Google reverse geocoder uses timeout fallback without leaving status checking',async()=>{
 const code=between('let cabReverseGoogleStatus=', '\nasync function reverseNominatim(');
 const ctx={S:{provider:'fallback'},console:{warn:()=>{}},clearTimeout, 
  setTimeout:(fn,ms)=>ms===7500?Promise.resolve().then(fn):0,
  cfg:()=>({googleMapsApiKey:'QA_DUMMY'}),
  initSearchProvider:async()=>{},waitGoogleKey:async()=> 'QA_DUMMY',loadScript:async()=>{},
  window:{google:{maps:{Geocoder:class{geocode(){return new Promise(()=>{})}}}}}};
 ctx.google=ctx.window.google;
 const data=await vm.runInNewContext(code+'\nreverseGoogle(22.67,85.63).then(v=>({v,status:cabReverseGoogleStatus}))',ctx);
 assert.equal(data.v,'');assert.equal(data.status,'response_timeout');
});

test('2-way QA computes both road directions independently and combines fares',async()=>{
 const code=between('async function routeOSRM(', '\nasync function continueRide(');
 const original={p:{lat:22.56,lng:85.62},d:{lat:22.60,lng:85.65},stops:[],
   mode:'ride',tripType:'roundtrip'};
 const urls=[];
 const ctx={S:original,fetch:async(url)=>{
  urls.push(url);
  const isReturn=url.includes('85.65,22.6;85.62,22.56');
  return {ok:true,json:async()=>({code:'Ok',
   routes:[{distance:isReturn?11040:9900,duration:isReturn?1300:1050,
    geometry:{coordinates:isReturn?[[85.65,22.6],[85.62,22.56]]:[[85.62,22.56],[85.65,22.6]]}}]})};
 },realisticRoadMinutes:(km,providerMin)=>Math.max(1,providerMin)};
 const q=await vm.runInNewContext(code+'\nrouteOSRM()',ctx);
 assert.equal(q.km,20.94);assert.equal(q.roundTripRouted,true);
 assert.deepEqual([...urls].map(u=>u.split('/driving/')[1].split('?')[0]),[
  '85.62,22.56;85.65,22.6','85.65,22.6;85.62,22.56'
 ]);
 assert.deepEqual([...q.geo].map(x=>[...x]),[[85.62,22.56],[85.65,22.6],[85.62,22.56]]);
 assert.equal(q.legs.outwardKm,9.9);
 assert.equal(q.legs.returnKm,11.04);
 assert.equal(q.routeWarning,'');
});
test('2-way routes with intermediate stops go directly back to pickup without returning to each stop',async()=>{
 const code=between('async function routeOSRM(', '\nasync function continueRide(');
 const urls=[];
 const ctx={S:{p:{lat:22.56,lng:85.62},d:{lat:22.60,lng:85.65},
   stops:[{lat:22.58,lng:85.63}],mode:'ride',tripType:'roundtrip'},
  fetch:async url=>{urls.push(url);return {ok:true,json:async()=>({code:'Ok',
   routes:[{distance:8000,duration:900,geometry:{coordinates:[]}}]})}},
  realisticRoadMinutes:(km,m)=>m};
 const q=await vm.runInNewContext(code+'\nrouteOSRM()',ctx);
 assert.equal(q.km,16);
 assert.equal(urls.length,2);
 assert.match(urls[0],/85\.62,22\.56;85\.63,22\.58;85\.65,22\.6/);
 assert.match(urls[1],/85\.65,22\.6;85\.62,22\.56/);
});
test('asymmetric returns show a clear warning, never invent a lower fare',async()=>{
 const code=between('async function routeOSRM(', '\nasync function continueRide(');
 const ctx={S:{p:{lat:22.56,lng:85.62},d:{lat:22.60,lng:85.65},stops:[],
  mode:'ride',tripType:'roundtrip'},fetch:async url=>{
   const isReturn=url.includes('85.65,22.6;85.62,22.56');
   return {ok:true,json:async()=>({code:'Ok',routes:[{distance:isReturn?21000:8100,
    duration:isReturn?2100:900,geometry:{coordinates:[]}}]})};
  },realisticRoadMinutes:(km,m)=>m};
 const quote=await vm.runInNewContext(code+'\nrouteOSRM()',ctx);
 assert.equal(quote.km,29.1);
 assert.match(quote.routeWarning,/differs significantly/);
 assert.equal(quote.legs.outwardKm,8.1);
 assert.equal(quote.legs.returnKm,21);
});
test('invalid return route cannot silently become an assumed two-times outward fare',async()=>{
 const code=between('async function routeOSRM(', '\nasync function continueRide(');
 const ctx={S:{p:{lat:22.56,lng:85.62},d:{lat:22.60,lng:85.65},stops:[],
  mode:'ride',tripType:'roundtrip'},fetch:async url=>({
    ok:true,json:async()=>url.includes('85.65,22.6;85.62,22.56')?
     {code:'NoRoute',routes:[]}:{code:'Ok',routes:[{distance:8100,duration:900,geometry:{coordinates:[]}}]}
  }),realisticRoadMinutes:(km,m)=>m};
 await assert.rejects(vm.runInNewContext(code+'\nrouteOSRM()',ctx),/NoRoute/);
});

test('2-way quote must never double the already-returned route, preserve sedan and SUV rates',()=>{
 const code=between('function roundRules(){','\n// No confirmed online Vaahak position');
 const ctx={S:{route:{km:20.94,min:40,roundTripRouted:true},mode:'ride',tripType:'roundtrip',nightHalt:false},
   localStorage:{getItem:()=>null},realisticRoadMinutes:(km,min)=>min};
 const x=vm.runInNewContext(code+'\n({distance:totalKm(),time:totalMin(),sedan:fare({id:"sedan"}),suv:fare({id:"suv"})})',ctx);
 assert.equal(x.distance,20.94);assert.equal(x.time,40);
 assert.equal(x.sedan,314);assert.equal(x.suv,377);
 ctx.S.nightHalt=true;
 const night=vm.runInNewContext('({sedan:fare({id:"sedan"}),suv:fare({id:"suv"})})',ctx);
 assert.equal(night.sedan,1314);assert.equal(night.suv,1877);
});
test('one-way routing remains single leg with unchanged fare calculations',async()=>{
 const code=between('async function routeOSRM(', '\nasync function continueRide(');
 let requested='';
 const ctx={S:{p:{lat:22.56,lng:85.62},d:{lat:22.60,lng:85.65},stops:[],mode:'ride',tripType:'oneway'},
  fetch:async url=>{requested=url;return{ok:true,json:async()=>({routes:[{distance:8100,duration:1000,geometry:{coordinates:[]}}]})}},
  realisticRoadMinutes:(km,m)=>m};
 const route=await vm.runInNewContext(code+'\nrouteOSRM()',ctx);
 assert.equal(route.roundTripRouted,false);assert.equal(route.km,8.1);
 assert.match(requested,/85\.62,22\.56;85\.65,22\.6\?/);
});
