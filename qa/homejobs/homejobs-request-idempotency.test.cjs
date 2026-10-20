'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{transformSync}=require('esbuild');
const source=fs.readFileSync('qa/homejobs/hyperlocal-service-live-candidate.ts','utf8');
const compiled=transformSync(source,{loader:'ts',format:'cjs',target:'es2022'}).code;
function context(overrides={}){
 const memberId='QA-MEMBER',transactionId='TX-HOME-QA-01',label='Electrician';
 const data={
  member_sessions_live:[{member_id:memberId,token_hash:'not-used',expires_at:'2099-01-01'}],
  onboarding_records:[{kind:'member',external_id:memberId,name:'QA Customer',email:'qa@example.test',mobile:'0000000000',status:'Active',deleted_at:null}],
  hyperlocal_jobs_live:overrides.job?[{transaction_id:transactionId,member_id:memberId,service_type:'electrician',status:'Completed',assigned_partner_member_id:'QA-PARTNER',...overrides.job}]:[],
  service_requests_live:overrides.noProof?[]:[{transaction_id:transactionId,member_id:memberId,section:'Home Jobs & Local Services',subsection:label}],
  transactions:overrides.noProof?[]:[{transaction_id:transactionId,actor_ref:memberId,section:'Home Jobs & Local Services',subsection:label,metadata:{flow:'hyperlocal_home_service'}}]
 };
 let insertion=0,cascade=0,updates=0,handler;
 function query(table,op='read'){
  const eqs=[],filters=[];let payload;
  const q={select(){return q},eq(a,b){eqs.push([a,b]);return q},gt(){return q},is(a,b){filters.push([a,b]);return q},limit(){return q},order(){return q},contains(){return q},
   insert(x){payload=x;op='insert';return q},update(x){payload=x;op='update';return q},upsert(x){payload=x;op='upsert';return q},
   async maybeSingle(){
    if(op==='insert'){insertion++;
     if(overrides.duplicateInsert)return {data:null,error:{code:'23505',message:'unique violation'}};
     const row={...payload};(data[table]||[]).push(row);return {data:row,error:null};
    }
    if(op==='update'||op==='upsert'){updates++;return {data:payload,error:null}}
    const rows=(data[table]||[]).filter(row=>eqs.every(([key,value])=>row[key]===value));
    return {data:rows[0]||null,error:null};
   }};
  return q;
 }
 const supabase={
   from:(name)=>query(name),
   rpc:async()=>({data:null,error:null})
 };
 const sandbox={
  module:{exports:{}},exports:{},console:{...console,error(){}},TextEncoder,Response,Request,URL,Promise,setTimeout,crypto:require('node:crypto').webcrypto,
  Deno:{env:{get:(key)=>key==='SUPABASE_URL'?'https://unused.invalid':key==='SUPABASE_SERVICE_ROLE_KEY'?'FAKE-ROLE-KEY':''},serve:(fn)=>{handler=fn}},
  require(id){if(id.includes('functions-js'))return {};if(id.includes('supabase-js'))return {createClient:()=>supabase};throw Error('Unexpected dependency '+id)},
  fetch:async(u)=>{cascade++;return {ok:true,json:async()=>({job:data.hyperlocal_jobs_live[0],partner:null})}}
 };
 vm.runInNewContext(compiled,sandbox,{timeout:2000});
 assert.equal(typeof handler,'function');
 return {data,run:async({token='synthetic-token',body={},action='sync_job'}={})=>{
  const req=new Request('https://unused.invalid',{method:'POST',headers:{'Content-Type':'application/json',...(token?{'x-dbest-member-token':token}:{})},
   body:JSON.stringify({action,transaction:{id:transactionId,section:'Home Jobs & Local Services',sub:label,meta:{flow:'hyperlocal_home_service',application:{name:'QA',address:'QA Address',city:'Test City',pincode:'000000'}}},...body})});
  const response=await handler(req);return {code:response.status,data:await response.json()};
 },stats:()=>({insertion,cascade,updates})};
}
test('Repeat Completed job cannot be reset to Open or dispatched again',async()=>{
 const q=context({job:{status:'Completed'}}),r=await q.run();
 assert.equal(r.code,200);assert.equal(r.data.job.status,'Completed');assert.equal(r.data.reused,true);assert.deepEqual(q.stats(),{insertion:0,cascade:0,updates:0});
});
test('Repeat Assigned job preserves partner and offer',async()=>{
 const q=context({job:{status:'Assigned',assigned_partner_member_id:'QA-PARTNER',offer_expires_at:'2099-10-20T00:00:00Z'}}),r=await q.run();
 assert.equal(r.data.job.status,'Assigned');assert.equal(r.data.job.assigned_partner_member_id,'QA-PARTNER');assert.equal(q.stats().insertion,0);assert.equal(q.stats().cascade,0);
});
test('Completed job belonging to another member is denied',async()=>{
 const q=context({job:{member_id:'OTHER-MEMBER'}}),r=await q.run();
 assert.equal(r.code,403);assert.equal(r.data.error,'service_job_not_owned');assert.equal(q.stats().updates,0);
});
test('A new job must have a persisted request or transaction matching the actor',async()=>{
 const q=context({noProof:true}),r=await q.run();
 assert.equal(r.code,409);assert.equal(r.data.error,'verified_home_service_request_required');assert.equal(q.stats().insertion,0);
});
test('New authenticated request enters the existing dispatch pipeline once',async()=>{
 const q=context(),r=await q.run();
 assert.equal(r.code,200,JSON.stringify(r.data));assert.equal(q.stats().insertion,1);assert.equal(q.stats().cascade,1);assert.equal(q.data.hyperlocal_jobs_live[0].status,'Open');
});
test('Concurrent same-transaction insert is not overwritten',async()=>{
 const q=context({duplicateInsert:true}),r=await q.run();
 assert.equal(r.code,409);assert.equal(q.stats().insertion,1);assert.equal(q.stats().updates,0);
});
test('Missing member session cannot create an arbitrary job',async()=>{
 const q=context(),r=await q.run({token:''});assert.equal(r.code,401);assert.equal(q.stats().insertion,0);
});
test('Unsupported service type cannot create an arbitrary job',async()=>{
 const q=context(),r=await q.run({body:{transaction:{id:'TX-HOME-QA-01',sub:'Unknown Service'}}});assert.equal(r.code,400);assert.equal(q.stats().insertion,0);
});
