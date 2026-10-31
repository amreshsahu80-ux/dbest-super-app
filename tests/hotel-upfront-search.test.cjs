'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('hotel-simple-flow.html','utf8');
test('guest hotel search automatically schedules OTA prices without a Check button',()=>{
 assert.match(html,/function scheduleVisibleAutoRateLookups\(\)/);
 assert.match(html,/scheduleVisibleAutoRateLookups\(\)/);
 assert.match(html,/addEventListener\('input',\(\)=>\{state\.destination=/);
 assert.match(html,/autoMappedHotels\.has\(h\.id\)/);
 assert.match(html,/loadPublicOtaRates\(h,false\)/);
 assert.match(html,/Refresh available public OTA rates/);
 assert.doesNotMatch(html,/>Check public B2C OTA prices for selected dates</);
});
test('DBest rate, OTA reference and conditional indicative difference are upfront',()=>{
 assert.match(html,/DBest contracted reference/);
 assert.match(html,/Public OTA from · selected stay/);
 assert.match(html,/DBest Advantage/);
 assert.match(html,/not verified savings/);
 assert.match(html,/preliminary|Indicative only/i);
 assert.match(html,/const dbestNumeric=/);
 assert.match(html,/Math\.round\(gap\/cheapest\.pricePerNight\*100\)/);
});
test('price freshness and lookup budget controls avoid stale or endless lookup loops',()=>{
 assert.match(html,/AUTO_MAX_HOTELS_PER_SEARCH=2/);
 assert.match(html,/AUTO_ERROR_COOLDOWN_MS/);
 assert.match(html,/AUTO_RATE_FRESH_MS=15\*60\*1000/);
 assert.match(html,/autoInFlight\.has\(key\)/);
 assert.match(html,/if\(stayKey!==currentStayKey\(\)\)return/);
 assert.match(html,/h\.publicOta=null/);
});
test('hotel HTML script remains valid',()=>{
 const scripts=[...html.matchAll(/<script>\s*([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length);
 scripts.forEach(x=>new vm.Script(x[1]));
});
