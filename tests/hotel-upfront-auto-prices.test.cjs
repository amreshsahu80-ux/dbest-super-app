'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const page=fs.readFileSync('hotel-simple-flow.html','utf8');
test('search card contains upfront DBest/OTA rates and clearly qualified potential savings',()=>{
 assert.match(page,/upfront-prices/);
 assert.match(page,/DBest Advantage/);
 assert.match(page,/not verified savings/);
 assert.match(page,/DBest contracted reference/);
 assert.match(page,/Public OTA from/);
 assert.match(page,/Comparison of displayed reference prices only/);
});
test('typing a destination or hotel schedules debounced automatic B2C rate checks',()=>{
 assert.match(page,/scheduleVisibleAutoRateLookups\(\);/);
 assert.match(page,/function autoRateCandidates\(\)/);
 assert.match(page,/autoMappedHotels=new Set\(/);
 assert.match(page,/for\(const h of candidates\)void loadPublicOtaRates\(h,false\)/);
 assert.match(page,/650\)/);
 assert.match(page,/\$\('destination'\)\.addEventListener\('input'/);
 assert.match(page,/\$\('hotelSearch'\)\.addEventListener\('input'/);
 assert.match(page,/AUTO_MAX_HOTELS_PER_SEARCH=2/);
});
test('automatic rates are limited by valid stay and cached; old results are rejected',()=>{
 assert.match(page,/state\.adults===2&&state\.rooms===1/);
 assert.match(page,/if\(query.length<3\|\|!validPublicRateStay\(\)\)return \[\]/);
 assert.match(page,/autoInFlight\.has\(key\)/);
 assert.match(page,/AUTO_RATE_FRESH_MS=15\*60\*1000/);
 assert.match(page,/if\(stayKey!==currentStayKey\(\)\)return/);
 assert.match(page,/payload\.stay\.checkIn===state\.checkIn/);
 assert.match(page,/h\.publicOta=null/);
});
test('no fabricated offers or unsafe OTA savings claim appears in source',()=>{
 assert.doesNotMatch(page,/Math\.random\(\).*price/);
 assert.match(page,/not verified savings/);
 const scripts=[...page.matchAll(/<script>\s*([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length>0);for(const [,script] of scripts)new vm.Script(script);
});
