'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const page=fs.readFileSync('hotel-simple-flow.html','utf8');
const csp=(page.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)||[])[1]||'';
test('photo content-security-policy allows Wikimedia image redirect hosts',()=>{
 assert.match(csp,/img-src[^;]*https:\/\/commons\.wikimedia\.org/);
 assert.match(csp,/img-src[^;]*https:\/\/thumb\.wikimedia\.org/);
 assert.match(csp,/img-src[^;]*https:\/\/upload\.wikimedia\.org/);
 assert.doesNotMatch(csp,/\bimg-src\s+\*/);
});
test('unverified photo must stay an accurately labeled property placeholder',()=>{
 assert.match(page,/function propertyPhotoPlaceholder\(h\)/);
 assert.match(page,/Verified hotel photograph pending/);
 assert.match(page,/aria-label="Verified photo not yet available for /);
 assert.match(page,/const fallback=propertyPhotoPlaceholder\(h\)/);
 assert.match(page,/photo:verifiedPhotoById\[h\.id\]/);
});
test('failed remote photo removes its stale credit; no duplicate fallbacks',()=>{
 assert.match(page,/addEventListener\('error',event=>/);
 assert.match(page,/media\.querySelector\('\[data-photo-credit\]'\)\?\.remove\(\)/);
 assert.match(page,/image\.remove\(\)/);
 assert.doesNotMatch(page,/Property image currently unavailable/);
});
test('photograph sources are property-specific and attributed',()=>{
 for(const hotelId of ['DBEST-REPL-20261024-138','DBEST-REPL-20261023-082','DBEST-REPL-20261027-240','DBEST-RECOVERY-20261022-008']){
  assert.ok(page.includes("'"+hotelId+"':{"),hotelId);
 }
 assert.match(page,/Photo: /);assert.match(page,/licenseUrl/);
});
test('guest Javascript is syntactically valid',()=>{
 const scripts=[...page.matchAll(/<script>\s*([\s\S]*?)<\/script>/g)];
 assert.ok(scripts.length>0);
 for(const [,script] of scripts)new vm.Script(script);
});

test('an honest official gallery link is shown instead of pretending an unlicensed image is hosted',()=>{
 for(const p of ['hotel-simple-flow.html','hotel-checkout-demo.html']){
  const s=fs.readFileSync(p,'utf8');
  assert.ok(s.includes('officialHotelGalleries=Object.freeze'));
  assert.ok(s.includes('https://hotelnandan.com/rooms/'));
  assert.ok(s.includes('official photo gallery'));
  assert.ok(s.includes('referrerpolicy="no-referrer"'));
  assert.ok(s.includes('sourced property photos'));
  assert.ok(s.includes('Check this property on Google Hotels'));
  assert.ok(s.includes('publicHotelSearchLink(h)'));
 }
});
