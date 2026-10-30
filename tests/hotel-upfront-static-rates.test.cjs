'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('hotel-simple-flow.html','utf8');
const match=src.match(/const EMBEDDED_HOTEL_REFERENCES=(\[[\s\S]*?\]);\nconst bootstrapById=/);
test('read-only outreach fallback retains real marked-up customer prices without supplier nets',()=>{
 assert.ok(match,'Missing embedded public catalogue reference');
 const rows=JSON.parse(match[1]);
 assert.ok(rows.length>=250, 'Expected 250+ hotels for fallback');
 assert.ok(rows.filter(x=>typeof x.contractedSellingReference==='number'&&x.contractedSellingReference>0).length>=238);
 assert.equal(rows.find(x=>x.id==='HOTEL-NANDAN-GHY').contractedSellingReference,4016.25);
 assert.ok(rows.every(x=>!('supplierB2BAmount' in x)&&!('netRate' in x)&&!('markupPercent' in x)));
 assert.ok(rows.every(x=>x.id&&x.name&&x.city));
});
test('customer cards use fallback immediately; catalogue fetch does not erase fallback on error',()=>{
 assert.match(src,/hotels=EMBEDDED_HOTEL_REFERENCES\.map/);
 assert.match(src,/const knownById=new Map/);
 assert.match(src,/contractedSellingReference:prior\?\.contractedSellingReference\|\|null/);
 assert.match(src,/buildDestinationIndex\(\);/);
 assert.match(src,/render\(\);/);
});
test('UI fetches alias-compatible public API; private net tariffs stay out of embedded data',()=>{
 assert.equal(src.includes("fetch('/api/hotel-catalog"),false);
 assert.match(src,/fetch\('\/api\/hotel-public-catalog\?view=offers-summary'/);
 const scripts=[...src.matchAll(/<script>\s*([\s\S]*?)<\/script>/g)];
 for(const x of scripts)new vm.Script(x[1]);
});
