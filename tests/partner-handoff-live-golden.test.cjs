'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const locked=require('../partner-handoff-golden-lock.json');
const files=locked.protected_source_git_blob_sha1;
const sections={
 insurance:['insurance','All Insurance',['Health Insurance','Motor Insurance','Life / Term Insurance']],
 flights:['flights','Flights Hotels Packages',['Flight Booking','Flight + Hotel']],
 travel:['travel','Hotels n Packages',['Hotel Booking','Tour Package']],
 mf:['mf','Mutual Funds',['Mutual Fund Investment']]
};
function setup({authenticated=true,linkOverride=null}={}){
 const redirects=[],transactions=[],messages=[];
 const links=structuredClone(locked.approved_live_owner_link_snapshot);
 if(linkOverride)Object.assign(links,linkOverride);
 const session=authenticated?{id:'TEST-MEMBER',role:'prime'}:{id:'',role:'visitor'};
 const location={href:'https://dbest4u.com/',pathname:'/',search:'',assign:u=>redirects.push(u)};
 const win={DBEST_PUBLIC_LINKS:links,session,location};
 const ctx={window:win,session,URL,links:{},services:Object.values(sections).map(([id,title,subs])=>[id,title,'🔗','#fff','handoff',subs]),
  localStorage:{getItem:k=>k==='d2_session'?JSON.stringify(session):null},location,
  toast:x=>messages.push(String(x)),addTx:(uid,section,sub,amount,status,partner,meta)=>{
    const row={id:'DBEST-QA-TX',uid,section,sub,status,partner,meta};
    transactions.push(row);return row;
  },save:()=>{},console:{warn:()=>{},error:()=>{},log:()=>{}},
  document:{querySelectorAll:()=>[]},setTimeout:()=>{},clearTimeout:()=>{},getComputedStyle:()=>({})};
 vm.runInNewContext(fs.readFileSync('owner-deeplink-all-sections.js','utf8'),ctx,{timeout:2500});
 return {win,redirects,transactions,messages};
}
test('freeze source hashes and deployed version match the production golden manifest',()=>{
 assert.equal(locked.production_frontend_git_commit,'f7305e05d2bedc50760062316dc98ebb7dbe7c31');
 for(const [file,hash] of Object.entries(files)){
  assert.equal(execFileSync('git',['hash-object',file],{encoding:'utf8'}).trim(),hash,'Unexpected change to frozen file '+file);
 }
 const env=setup();
 assert.equal(env.win.DBEST_UNIVERSAL_DEEPLINKS.version,locked.live_handoff_script_version);
 assert.equal(locked.candidate_upgrade_separate.status,'PREVIEW_ONLY_NOT_IN_THIS_LIVE_FREEZE');
});
test('snapshot captures the four approved Owner-controlled live destinations',()=>{
 const expected={
  insurance:'https://www.insurancedekho.com/?source=PARTNER&sub-source=BESTSERVICES_B2C',
  flights:'https://dbestfly.com',
  travel:'https://dbestfly.com',
  mf:'https://p.njw.bz/13879'
 };
 for(const [id,url] of Object.entries(expected)){
  assert.equal(locked.approved_live_owner_link_snapshot[id]?.url,url);
  assert.equal(locked.approved_live_owner_link_snapshot[id]?.enabled,true);
  const e=setup();
  assert.equal(e.win.DBEST_UNIVERSAL_DEEPLINKS.linkFor(id).url,url);
 }
});
test('freeze authenticated Insurance, Flights, Hotels and NJ Wealth handoffs and referral parameters',()=>{
 for(const id of Object.keys(sections)){
  const e=setup();
  e.win.dbestUniversalExternalGo(id);
  assert.equal(e.redirects.length,1,'Expected one partner navigation for '+id);
  assert.equal(e.transactions.length,1,'Expected pending transaction for '+id);
  const got=new URL(e.redirects[0]),target=new URL(locked.approved_live_owner_link_snapshot[id].url);
  assert.equal(got.origin,target.origin);assert.equal(got.pathname,target.pathname);
  for(const [k,v] of target.searchParams)assert.equal(got.searchParams.get(k),v,'Owner referral value lost '+k);
  assert.equal(got.searchParams.get('dbest_user_id'),'TEST-MEMBER');
  assert.equal(got.searchParams.get('dbest_tx_id'),'DBEST-QA-TX');
  assert.equal(got.searchParams.get('dbest_section'),id);
  assert.equal(got.searchParams.get('dbest_subsection'),'External Partner Transaction');
  assert.equal(e.transactions[0].status,'Redirected / Pending');
  assert.equal(e.transactions[0].meta.source,'Partner Deeplink');
 }
});
test('freeze subsection labels and member referral handoff',()=>{
 for(const id of Object.keys(sections)){
  const e=setup(),sub=sections[id][2][0];
  e.win.dbestUniversalExternalGo(id,0);
  assert.equal(e.transactions.length,1);
  assert.equal(e.transactions[0].sub,sub);
  assert.equal(new URL(e.redirects[0]).searchParams.get('dbest_subsection'),sub);
 }
});
test('guests and Owner-disabled links do not navigate or create fake transaction',()=>{
 const guest=setup({authenticated:false});guest.win.dbestUniversalExternalGo('mf');
 assert.equal(guest.redirects.length,0);assert.equal(guest.transactions.length,0);
 const disabled=setup({linkOverride:{insurance:{...locked.approved_live_owner_link_snapshot.insurance,enabled:false}}});
 disabled.win.dbestUniversalExternalGo('insurance');
 assert.equal(disabled.redirects.length,0);assert.equal(disabled.transactions.length,0);
});
