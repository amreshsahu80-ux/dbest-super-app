'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('leader-partner-onboarding-v1.js','utf8');
function ctx(){
 const win={DBEST_RUNTIME_CONFIG:{supabaseUrl:'https://qa.invalid',supabasePublishableKey:'test-public-key'}};
 const sandbox={window:win,console,document:{documentElement:{},getElementById:()=>null},MutationObserver:class{observe(){}},setTimeout:()=>{},location:{},localStorage:{getItem:()=>null},Date,URLSearchParams,alert:()=>{}};
 vm.runInNewContext(source,sandbox,{timeout:1800});
 return win.DBEST_LEADER_PARTNER_ONBOARDING;
}
test('all expired launched links are excluded from Pending',()=>{
 const a=ctx(),now=Date.parse('2026-10-20T09:30:00Z');
 const rows=Array.from({length:27},()=>({status:'Launched',expires_at:'2026-10-20T08:00:00Z'}));
 const counts=a.launchCounts({summary:{started:27,pending:27,activated:0,earned:0},rows},now);
 assert.equal(counts.pending,0);assert.equal(counts.expired,27);assert.equal(counts.started,27);
});
test('unexpired Launched and Claim-linked records remain Pending, not Expired',()=>{
 const a=ctx(),now=Date.parse('2026-10-20T09:30:00Z');
 const rows=[
  {status:'Launched',expires_at:'2026-10-20T13:30:00Z'},
  {status:'Claimed',expires_at:'2026-10-20T08:00:00Z'},
  {status:'Launched',expires_at:'2026-10-20T08:00:00Z'},
  {status:'Credited',expires_at:'2026-10-20T08:00:00Z'}
 ];
 const counts=a.launchCounts({summary:{started:4,activated:1,earned:300,pending:3},rows},now);
 assert.equal(counts.pending,2);assert.equal(counts.expired,1);assert.equal(counts.activated,1);assert.equal(counts.earned,300);
});
test('invalid and missing expiration timestamps cannot appear pending',()=>{
 const a=ctx(),now=Date.now();
 const counts=a.launchCounts({summary:{started:2,pending:2},rows:[{status:'Launched',expires_at:'bad'},{status:'Launched'}]},now);
 assert.equal(counts.pending,0);assert.equal(counts.expired,2);
});
test('leader API, OTP and bonus amounts have not changed',()=>{
 assert(source.includes('/functions/v1/leader-partner-onboarding-live'));
 assert(source.includes("call({action:'launch',partnerType:type})"));
 assert(source.includes("call({action:'list'})"));
 assert(source.includes('₹300')&&source.includes('₹200')&&source.includes('₹100'));
 assert(!source.includes('localStorage.clear()'));
});
