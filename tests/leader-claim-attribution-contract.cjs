'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const ts=require('typescript');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync('supabase/functions/leader-partner-onboarding-live/index.ts','utf8');
const liveBackup=fs.readFileSync('audit/20261020-leader-partner-onboarding-live-v4-original.ts','utf8');
let compiled=source.replace(/^import[^\n]+;?\s*$/gm,'');
compiled=ts.transpileModule(compiled,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const defaultLaunch={leader_id:'DBEST-LEADER-01',partner_type:'Vendor',status:'Claimed',
  partner_id:'VDR-200',expires_at:'2099-12-31T00:00:00Z',incentive_amount:300,
  token_hash:'ignored' };
const defaultRow={id:'VDR-200',email:'partner@example.test',mobile:'9876543210',
  onboarding_leader_id:'DBEST-LEADER-01',onboarding_admin_id:null};
function createEnv(opts={}){
 const launch=opts.launch===undefined?{...defaultLaunch,...opts.launchPatch}:opts.launch;
 const row=opts.row===undefined?{...defaultRow,...opts.rowPatch}:opts.row;
 const mutations=[],reads=[];
 const fakeSb={
   from(name){
     const filters={};
     const chain={
       select(){return chain},
       eq(k,v){filters[k]=v;return chain},
       async maybeSingle(){
         reads.push({name,filters:{...filters}});
         if(name==='leader_partner_onboarding_launches')
           return {data:launch&&filters.token_hash===launch.token_hash?launch:null,error:null};
         if(['marketplace_vendors_live','vaahak_partners_live','service_partner_profiles_live'].includes(name))
           return {data:row&&Object.entries(filters).every(([key,v])=>String(row[key]||'')===String(v))?row:null,error:null};
         throw Error('Unexpected DB table '+name);
       },
       update(payload){mutations.push({name,payload});throw Error('Public claim attempted DB update!')}
     };return chain
   }
 };
 let handler=null;
 const context={console,Response,Request,URLSearchParams,TextEncoder,crypto:webcrypto,
    Deno:{env:{get(k){return k==='SUPABASE_URL'?'https://qa.invalid':'stub-service-key'}},serve(fn){handler=fn}},
    createClient(){return fakeSb}};
 vm.runInNewContext(compiled,context,{timeout:2000});
 assert.equal(typeof handler,'function');
 async function call(data={}){
   const body={action:'claim',token:'valid-test-token',email:'partner@example.test',mobile:'9876543210',...data};
   const res=await handler(new Request('https://qa.invalid/leader-partner-onboarding-live',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
   return {status:res.status,json:await res.json()}
 }
 return {call,mutations,reads};
}
function patchHash(){
 // SHA256 of fixed test token; real lookup must be by hash, never raw token
 return Buffer.from(new Uint8Array(webcrypto.getRandomValues(new Uint8Array(0)))).toString();
}
const testHash=''; // Set by async setup below; cannot weaken hashing checks.
async function withValidToken(patch={}){
 const buf=await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode('valid-test-token'));
 const sha=Buffer.from(buf).toString('hex');
 return createEnv({launchPatch:{token_hash:sha,...(patch.launchPatch||{})},
   ...(Object.prototype.hasOwnProperty.call(patch,'launch')?{launch:patch.launch}:{}),
   ...(Object.prototype.hasOwnProperty.call(patch,'row')?{row:patch.row}:{}),
   rowPatch:patch.rowPatch||{}});
}
test('existing verified Vendor registration can confirm claimed referral with ZERO writes',async()=>{
 const e=await withValidToken();const r=await e.call();
 assert.equal(r.status,200);assert.equal(r.json.claimed,true);
 assert.equal(r.json.partnerId,'VDR-200');assert.equal(r.json.incentiveAmount,300);
 assert.deepEqual(e.mutations,[]);
 assert.equal(e.reads.filter(x=>x.name==='marketplace_vendors_live').length,1);
});
test('one invitation cannot be attached to another Vendor by an attacker-supplied ID',async()=>{
 const e=await withValidToken();const r=await e.call({partnerId:'VDR-VICTIM'});
 assert.equal(r.status,409);assert.equal(r.json.error,'token_already_claimed');
 assert.deepEqual(e.mutations,[]);
});
test('actual registered email and mobile are required for claim confirmation',async()=>{
 for(const body of [{email:'hijack@example.test'},{mobile:'9999999999'},{email:'',mobile:''}]){
   const e=await withValidToken();const r=await e.call(body);
   assert.equal(r.status,body.email===''&&body.mobile===''?400:403,JSON.stringify(body));
   assert.deepEqual(e.mutations,[]);
 }
});
test('already-sourced Distributor and wrong Leader cannot be reattributed by claim',async()=>{
 for(const rowPatch of [{onboarding_admin_id:'TA-1'},{onboarding_leader_id:'DBEST-OTHER'}]){
   const e=await withValidToken({rowPatch});
   const r=await e.call();assert.equal(r.status,409);assert.equal(r.json.error,'partner_attribution_mismatch');
   assert.deepEqual(e.mutations,[]);
 }
});
test('registration not complete or token expired never writes a partner ID',async()=>{
 const pending=await withValidToken({launchPatch:{partner_id:null,status:'Launched'}});
 const a=await pending.call();assert.equal(a.status,202);assert.equal(a.json.pending,true);
 const expired=await withValidToken({launchPatch:{expires_at:'2026-01-01T00:00:00Z'}});
 const b=await expired.call();assert.equal(b.status,410);
 assert.deepEqual([...pending.mutations,...expired.mutations],[]);
});
test('Vaahak and Service Partner attribution confirmation uses same non-mutating claim guard',async()=>{
 for(const [kind,id,extra] of [
   ['Vaahak','VHK-008',{id:'VHK-008'}],
   ['Service Partner','SP-008',{service_partner_id:'SP-008',member_id:'M-SP-08'}]
 ]){
   const e=await withValidToken({launchPatch:{partner_type:kind,partner_id:id},row:{
     ...defaultRow,id:kind==='Vaahak'?id:undefined,...extra
   }});
   const a=await e.call();assert.equal(a.status,200,kind+JSON.stringify(a.json));
   assert.equal(a.json.partnerId,id);assert.deepEqual(e.mutations,[]);
 }
});
test('deployed registration and wallet triggers remain outside isolated modified claim block',()=>{
 const a=liveBackup.indexOf("  if(action==='claim'){"),b=liveBackup.indexOf("  if(action==='list'){",a);
 const c=source.indexOf("  if(action==='claim'){"),d=source.indexOf("  if(action==='list'){",c);
 assert(a>0&&b>a&&c>0&&d>c);
 assert.equal(source.slice(0,c),liveBackup.slice(0,a));
 assert.equal(source.slice(d),liveBackup.slice(b));
 assert(!source.slice(c,d).includes("onboarding_leader_id:x.leader_id"));
 assert(!source.slice(c,d).includes(".update("));
 assert(source.slice(c,d).includes("applicant_contact_mismatch"));
});
