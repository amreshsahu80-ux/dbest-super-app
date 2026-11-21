'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('hotel-public-guest.html','utf8');
test('DBest advantage highlights only verified higher public OTA references',()=>{
 assert.match(html,/const higher=q\?comparable\.filter\(x=>x\.inr>q\.pricePerNight\):\[\]/);
 assert.match(html,/const lower=q\?comparable\.filter\(x=>x\.inr<q\.pricePerNight\):\[\]/);
 assert.match(html,/const selectedHigher=higher\.slice\(\)\.sort/);
 assert.match(html,/DBest Advantage · selected higher public OTA rates/);
 assert.match(html,/Only higher-priced OTA quotes are featured here, not every OTA offer/);
 assert.match(html,/No verified DBest price advantage among comparable offers/);
});
test('cheaper offers remain discoverable and no blanket lowest-price or savings claim',()=>{
 assert.match(html,/Some verified OTA prices are lower than DBest/);
 assert.match(html,/View all /);
 assert.match(html,/verified public OTA prices/);
 assert.match(html,/<details class="all-ota" data-all-ota>/);
 assert.match(html,/including any lower prices/);
 assert.match(html,/This is a selectively featured comparison, not a lowest-price claim/);
 assert.match(html,/not guaranteed checkout savings/);
});
test('guest display retains live provider provenance, estimated FX and honest unavailable state',()=>{
 assert.match(html,/\/api\/hotel-public-google/);
 assert.match(html,/\/api\/hotel-fx/);
 assert.match(html,/const comparable=offers\.map\(p=>\(\{offer:p,inr:priceInr\(p\)\}\)\)/);
 assert.match(html,/Public OTA quotes are not available yet/);
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 assert.equal(scripts.length,1);
 for(const s of scripts)new vm.Script(s[1]);
});
