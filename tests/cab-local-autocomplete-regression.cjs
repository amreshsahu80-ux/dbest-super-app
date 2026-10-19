'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync('cab-selected-ui-v3.js','utf8');
const from=code.indexOf('const LOCAL_PLACE_RADIUS_KM=250;');
const to=code.indexOf('async function resolvePlace(x){',from);
assert(from>=0&&to>from,'Cab geo search functions must be present');
assert(code.indexOf('await initSearchProvider();',from)<code.indexOf("const base=String(cfg().supabaseUrl",from),'Google must be attempted before Photon/Supabase');
assert(code.includes('data-map-pin="1"'),'Map-pin fallback must be offered for destinations');
assert(code.includes('pinMap.on(\'click\''),'Map-pin fallback must allow a map click');
const world=[
 {label:'Etwashausen, Kitzingen, Bavaria',lat:49.74,lon:10.16,detail:'Kitzingen, Bavaria, Germany',source:'photon'},
 {label:'Cox Bazar, Bangladesh',lat:21.42,lon:92.05,detail:"Cox's Bazar, Bangladesh",source:'photon'},
 {label:'Howrah Station, West Bengal',lat:22.58,lon:88.35,detail:'West Bengal, India',source:'photon'},
 {label:'Station, Chakradharpur, Jharkhand',lat:22.68,lon:85.63,detail:'Jharkhand, India',source:'photon'},
 {label:'Kolkata, India',lat:22.57,lon:88.36,detail:'West Bengal, India',source:'photon'}
];
function setup(provider,features){
 let backendHits=0,googleHits=0,request=null;
 const context={
   window:{google:{maps:{LatLng:class LatLng{constructor(lat,lng){this.lat=lat;this.lng=lng}},places:{PlacesServiceStatus:{OK:'OK'},AutocompleteService:class{getPlacePredictions(req,callback){googleHits++;request=req;callback(features||[],features?.length?'OK':'ZERO_RESULTS')}}}}},
   google:null,S:{provider,p:{lat:22.675,lng:85.635}},cfg:()=>({supabaseUrl:'https://mock.dbest',supabasePublishableKey:'public'}),
   initSearchProvider:async()=>{},AbortController,console:{warn(){}},setTimeout,clearTimeout,encodeURIComponent,
   fetch:async url=>{backendHits++;if(String(url).includes('location-search-live'))return {ok:true,json:async()=>({results:world})};return {ok:true,json:async()=>([])}}
 };
 context.google=context.window.google;
 vm.runInNewContext(code.slice(from,to)+'\nwindow.testSearch=searchLocations;window.testFilter=cabFilterIndianResults;',context,{timeout:1000});
 return {context,get backendHits(){return backendHits},get googleHits(){return googleHits},get request(){return request}};
}
(async()=>{
 const g=setup('google',[{description:'Etwari Bazar, Chakradharpur, Jharkhand, India',place_id:'local-place',distance_meters:2600}]);
 const local=await g.context.window.testSearch('Etwari Bazar');
 assert.equal(local.length,1);assert.equal(local[0].placeId,'local-place');assert.equal(g.googleHits,1);assert.equal(g.backendHits,0);
 assert.equal(g.request.componentRestrictions.country,'in');assert(g.request.origin);
 const fallback=setup('supabase');
 const matches=await fallback.context.window.testSearch('Station');
 assert.equal(matches.length,3);
 assert(matches[0].label.includes('Chakradharpur'));
 assert(matches.every(x=>x.lat>=6&&x.lat<=37.5&&x.lng>=68&&x.lng<=97.5));
 assert(matches.every(x=>!String(x.label).includes('Germany')));
 const onlyWorld=setup('supabase');
 const strict=onlyWorld.context.window.testFilter([world[0],world[1]]);
 assert.equal(strict.length,0);
 console.log('PASS: restored Google-first local autocomplete, Indian-only geographic fallback, near-first ordering and map-pin option.');
})().catch(e=>{console.error(e);process.exitCode=1});
