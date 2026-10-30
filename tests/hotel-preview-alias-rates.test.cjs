'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const {forward,HOST}=require('../hotel-review/hotel-public-host-adapter.cjs');
function res(){
 return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},end(s){this.body=JSON.parse(s)}};
}
test('photo preview hostname is accepted but production DBest and arbitrary hosts are not',()=>{
 assert.equal(HOST.test('dbest-hotel-photo-preview.vercel.app'),true);
 assert.equal(HOST.test('dbest-hotel-review-preview.vercel.app'),true);
 assert.equal(HOST.test('dbest4u.com'),false);
 assert.equal(HOST.test('some-fake-domain.vercel.app'),false);
 assert.equal(HOST.test('dbest-hotel-photo-preview.vercel.app.evil.net'),false);
});
test('a customer on photo preview can load public catalogue and marked-up selling references',()=>{
 for(const view of ['', 'offers-summary','offers']){
  const response=res();
  let called=false;
  const query=view?('?view='+view):'';
  forward({headers:{host:'dbest-hotel-photo-preview.vercel.app'},method:'GET',url:'/api/hotel-public-catalog'+query},response,'catalog',(req,r)=>{
   called=true;assert.equal(req.headers.host,'dbest-hotel-review-preview.vercel.app');
   assert.equal(req.url.endsWith(query),true);
   r.statusCode=200;
  });
  assert.equal(called,true);assert.equal(response.statusCode,200);
 }
});
test('owner/private catalogue view blocked even when host is valid',()=>{
 for(const view of ['owner','internal','admin']){
  const response=res();
  forward({headers:{host:'dbest-hotel-photo-preview.vercel.app'},method:'GET',url:'/api/hotel-public-catalog?view='+view},response,'catalog',()=>{throw Error('sensitive route invoked')});
  assert.equal(response.statusCode,403);assert.equal(response.body.status,'PUBLIC_CATALOGUE_ONLY');
 }
});
test('rejects host spoof, wrong method; allows OTA via public alias',()=>{
 for(const host of ['dbest4u.com','evil.example','dbest-hotel-photo-preview.vercel.app.attacker.net']){
  const response=res();forward({headers:{host},method:'GET',url:'/'},response,'google',()=>{throw Error('host spoof')});
  assert.equal(response.statusCode,403);
 }
 const blocked=res();forward({headers:{host:'dbest-hotel-photo-preview.vercel.app'},method:'POST',url:'/'},blocked,'google',()=>{throw Error('post')});assert.equal(blocked.statusCode,405);
 let invoked=false;forward({headers:{host:'dbest-hotel-photo-preview.vercel.app'},method:'GET',url:'/?hotelId=HOTEL-NANDAN-GHY'},res(),'google',()=>{invoked=true});
 assert.equal(invoked,true);
});
test('HTML pricing endpoints always use alias-compatible guest facade',()=>{
 const html=fs.readFileSync('hotel-simple-flow.html','utf8');
 assert.equal(html.includes('/api/hotel-catalog'),false);
 assert.equal(html.includes('/api/hotel-google-b2c'),false);
 assert.match(html,/\/api\/hotel-public-catalog\?view=offers-summary/);
 assert.match(html,/\/api\/hotel-public-google\?/);
});
