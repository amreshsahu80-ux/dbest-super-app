'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const handler=require('./exchange.cjs');

const fakeKey='test-only-not-a-real-key';
const allowedOrigin='https://dbest-jansathi-staging.vercel.app';
const vars={
 JANSATHI_BRIDGE_ENABLED:'true',
 DBEST_PRO_SUPABASE_URL:'https://ydedmotbacnllkijzmvp.supabase.co',
 DBEST_PRO_SERVICE_ROLE_KEY:fakeKey,
 JANSATHI_SUPABASE_URL:'https://zgjkzqfabbvctcjspvfd.supabase.co',
 JANSATHI_SERVICE_ROLE_KEY:fakeKey,
 JANSATHI_ALLOWED_ORIGIN:allowedOrigin
};
Object.assign(process.env,vars);
let mode='valid',lastWrite=null,dbHits=0;
const realFetch=global.fetch;
global.fetch=async function(url,options){
 dbHits++;
 const pathname=new URL(url).pathname;
 let result;
 if(pathname==='/rest/v1/member_sessions_live'){
  result=mode==='revoked'?[]:[{member_id:'DB-MOCK-123'}];
 }else if(pathname==='/rest/v1/onboarding_records'){
  result=[{external_id:'DB-MOCK-123',email:'mock@example.invalid',category:'promoter',
   status:'Active',payment_status:'Approved',email_verified:true,deleted_at:null,
   payload:{kyc_status:mode==='pending-kyc'?'Pending':'Approved'}}];
 }else if(pathname==='/auth/v1/admin/generate_link'){
  result={user:{id:'00000000-0000-4000-8000-000000000001',
    app_metadata:mode==='conflict'?{dbest_member_id:'DIFFERENT'}:{preserve_me:true}},
   properties:{hashed_token:'example-test-hash'}};
 }else if(pathname==='/rest/v1/jansathi_member_entitlements'){
  result=[];
  if(options.method==='POST')lastWrite=JSON.parse(options.body);
 }else if(pathname.startsWith('/auth/v1/admin/users/')){
  const body=JSON.parse(options.body);assert.equal(body.app_metadata.preserve_me,true);result={};
 }else if(pathname==='/auth/v1/verify'){
  assert.equal(JSON.parse(options.body).token_hash,'example-test-hash');
  result={access_token:'synthetic-access',refresh_token:'synthetic-refresh',expires_in:3600};
 }else throw Error('Unexpected test endpoint: '+pathname);
 return{ok:true,status:200,json:async()=>result};
};
async function request({method='POST',origin=allowedOrigin,contentType='application/json',
 body={dbestMemberToken:'A'.repeat(64)}}={}){
 const response={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v},
   end(x){this.body=x?JSON.parse(x):null}};
 await handler({method,headers:{origin,'content-type':contentType},body},response);
 return response;
}
test('SSO handoff preflight and entitlement gates — synthetic responses only',async()=>{
 try{
  process.env.JANSATHI_BRIDGE_ENABLED='false';
  let r=await request();assert.equal(r.statusCode,503);
  process.env.JANSATHI_BRIDGE_ENABLED='true';
  const baseline=dbHits;
  r=await request({origin:'https://attacker.example'});assert.equal(r.statusCode,403);
  assert.equal(r.headers['Access-Control-Allow-Origin'],undefined);
  r=await request({method:'OPTIONS'});assert.equal(r.statusCode,204);
  assert.equal(r.headers['Access-Control-Allow-Origin'],allowedOrigin);
  r=await request({method:'GET'});assert.equal(r.statusCode,405);
  r=await request({contentType:'text/plain'});assert.equal(r.statusCode,415);
  r=await request({body:{dbestMemberToken:'bad'}});assert.equal(r.statusCode,401);
  r=await request({body:{dbestMemberToken:'A'.repeat(64),filler:'x'.repeat(6000)}});
  assert.equal(r.statusCode,413);
  assert.equal(dbHits,baseline,'Malformed requests never hit either database');
  mode='revoked';r=await request();assert.equal(r.statusCode,401);
  mode='valid';r=await request();assert.equal(r.statusCode,200);
  assert.equal(r.body.session.news_publishing_verified,true);
  assert.equal(lastWrite.kyc_verified,true);
  mode='pending-kyc';r=await request();assert.equal(r.statusCode,200);
  assert.equal(r.body.session.news_publishing_verified,false);
  assert.equal(lastWrite.kyc_verified,false);
  mode='conflict';r=await request();assert.equal(r.statusCode,409);
 }finally{
  global.fetch=realFetch;
  for(const key of Object.keys(vars))delete process.env[key];
 }
});
