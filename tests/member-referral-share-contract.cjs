'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
const code=fs.readFileSync('member-referral-share-v1.js','utf8');
function env({id='M-1',role='leader',token='TOKEN-APPROVED',serverId=id,referralCode='DB12345',tier=role,paymentStatus='Approved',activeStatus='Active',fetchStatus=200}={}){
 const session={id,role},calls=[];
 const win={DBEST_RUNTIME_CONFIG:{supabaseUrl:'https://qa.supabase.co',supabasePublishableKey:'pub-test'},DBEST_SESSION_COMPAT:{read:()=>session},DBEST_MEMBER_LIVE:{getToken:()=>token}};
 const body={ok:true,viewerId:serverId,members:[{id:serverId,tier,status:activeStatus,paymentStatus,ref:referralCode}]};
 const fakeFetch=async(url,opts)=>{calls.push({url,opts});return {ok:fetchStatus===200,status:fetchStatus,json:async()=>body}};
 const sandbox={window:win,localStorage:{getItem:()=>token},fetch:fakeFetch,
   document:{documentElement:{},addEventListener:()=>{},querySelectorAll:()=>[],getElementById:()=>null},
   MutationObserver:class{observe(){}},setTimeout:()=>{},console,Date,URLSearchParams};
 vm.runInNewContext(code,sandbox,{timeout:2000});
 return {share:win.DBEST_MEMBER_REFERRAL_SHARE,calls,session,body,win};
}
test('Approved Leader, Prime and Promoter members receive only their live referral ID',async()=>{
 for(const tier of ['leader','prime','promoter']){
  const e=env({role:tier,tier});
  const got=await e.share.verify();assert.equal(got.code,'DB12345');assert.equal(got.id,'M-1');
  assert.equal(e.calls.length,1);
  assert.match(e.calls[0].url,/\/functions\/v1\/member-network-live$/);
  assert.equal(e.calls[0].opts.headers['x-dbest-member-token'],'TOKEN-APPROVED');
 }
});
test('Guest, Starter, visitor, unapproved, absent-code and mismatched viewer cannot generate a link',async()=>{
 const rejected=[
  {role:'guest',tier:'guest'}, {role:'starter',tier:'starter'},{role:'visitor',tier:'leader'},
  {paymentStatus:'Pending Verification'},{activeStatus:'Pending'},{referralCode:''},
  {serverId:'M-OTHER'},{fetchStatus:401}
 ];
 for(const variant of rejected){
  const e=env(variant);
  assert.equal(await e.share.verify(),null,JSON.stringify(variant));
 }
});
test('Referral URL opens existing chooser and URL-encodes code without replacement',()=>{
 const e=env(),url=e.share.buildUrl('db12345');
 assert.equal(url,'https://dbest4u.com/membership-choose.html?ref=DB12345');
 const p=new URL(url);
 assert.equal(p.searchParams.get('ref'),'DB12345');
 assert.throws(()=>e.share.buildUrl('DB123&x=owner'));
 assert.throws(()=>e.share.buildUrl(''));
});
test('Client cannot use spoofed member details or another session after fetch',async()=>{
 const e=env();
 e.body.viewerId='M-OTHER';
 assert.equal(await e.share.verify(),null);
 const f=env();const {share,session}=f;session.id='M-OTHER';
 assert.equal(await share.verify(),null);
});
test('Existing paid and Starter join pages already propagate query referral ID',()=>{
 const chooser=fs.readFileSync('membership-choose.html','utf8');
 const paid=fs.readFileSync('join-v2.html','utf8');
 const starter=fs.readFileSync('starter-join.html','utf8');
 assert(chooser.includes("q.set('tier',tier)"));
 assert(chooser.includes("const q=new URLSearchParams(location.search)"));
 assert(chooser.includes("q.set('ref',ref)"));
 assert(paid.includes("qs.get('ref')"));
 assert(paid.includes('initialRef||'));
 assert(paid.includes('referral:ref'));
 assert(starter.includes("qs.get('ref')")||starter.includes("get('ref')"),'Starter must accept the propagated reference');
});
test('Existing core flows and modules remain identical to golden source',()=>{
 const baseline='f7305e05d2bedc50760062316dc98ebb7dbe7c31';
 for(const f of ['join-v2.html','membership-choose.html','starter-join.html','razorpay-integration-v1.js','member-live-login-bridge.js','member-dashboard-controller-v1.js','owner-deeplink-all-sections.js']){
  const expected=cp.execFileSync('git',['rev-parse',baseline+':'+f],{encoding:'utf8'}).trim();
  const actual=cp.execFileSync('git',['hash-object',f],{encoding:'utf8'}).trim();
  assert.equal(actual,expected,f+' was modified');
 }
});
