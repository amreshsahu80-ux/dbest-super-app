'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('hotel-review/hotel-coverage-api.template.cjs','utf8');
const mapping={
 A:{hotel:'Mapped Hotel',city:'Town',entity:'abc'},
 B:{hotel:'Wrong Identity',city:'Another City',entity:'def'},
 C:{hotel:'Query Hotel',city:'Small Town',query:'Query Hotel Small Town'}
};
const catalog={_publicHotelById:id=>({
 A:{id:'A',hotel:'Mapped Hotel',city:'Town'},
 B:{id:'B',hotel:'Different Name',city:'Another City'},
 C:{id:'C',hotel:'Query Hotel',city:'Small Town'}
})[id]||null};
const moduleObj={exports:{}};
vm.runInNewContext(code,{module:moduleObj,require:p=>{
 if(p.endsWith('google-hotels-browser.cjs'))return {SOURCES:mapping};
 if(p==='./hotel-catalog.js')return catalog;
 throw Error('Unexpected require '+p)
},URL,JSON,Object,String});
const api=moduleObj.exports;
function call(host,method='GET'){
 let body=null,headers={},status=200;
 const r={setHeader(k,v){headers[k]=v},end(s){body=JSON.parse(s)},set statusCode(v){status=v}};
 api({method,headers:{host}},r);
 return {status,body,headers};
}
test('only exact verified property IDs appear in coverage',()=>{
 const p=api._test.coverage();
 assert.equal(p.status,'DBEST_PUBLIC_OTA_CROSSWALK');
 assert.deepEqual(Array.from(p.mapped,h=>h.id),['A','C']);
 assert.equal(p.count,2);
 assert.equal(p.livePriceCountNotGuaranteed,true);
});
test('public coverage rejects unknown host and mutations',()=>{
 assert.equal(call('other-preview.vercel.app').status,403);
 assert.equal(call('dbest-hotel-review-preview.vercel.app','POST').status,405);
 assert.equal(call('dbest-hotel-photo-preview.vercel.app').status,200);
});
test('guest UI consumes crosswalk without generating nonexistent provider prices',()=>{
 const html=fs.readFileSync('hotel-simple-flow.html','utf8');
 assert.match(html,/fetch\('\/api\/hotel-coverage'/);
 assert.match(html,/h\.name===row\.hotel&&h\.city===row\.city/);
 assert.match(html,/autoMappedHotels\.clear\(\)/);
 assert.match(html,/No verified live OTA price available|Live OTA lookup unavailable/);
});
