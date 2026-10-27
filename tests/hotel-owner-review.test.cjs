'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const q=require('../hotel-review/approval-gate.js');
const fields=['Rate ID','Hotel ID','Hotel / Property','Room Category','Occupancy','Supplier Quote INR','Taxes / GST','Meal Plan','Validity','Cancellation','Source Email ID','Original Review Status','Owner Decision','Publication Gate'];
const header=fields.join(',');
const fixture=[header,'ND-01,HOTEL-01,"Sample, Test Hotel",Deluxe,Double,4725,"GST rate pending",Breakfast,"Valid until confirmation",72h,source-test,Quoted,APPROVED,PUBLISH'].join('\n');
test('strict expected columns and valid quoted CSV cell',()=>{
 const a=q.importQueue(fixture);
 assert.equal(a.records.length,1);assert.equal(a.records[0].hotel,'Sample, Test Hotel');assert.equal(a.records[0].amount,4725);
 assert.equal(a.publicationEnabled,false);assert.equal(a.records[0].decision,'HOLD');assert.equal(q.summary(a.records).publishable,0);
 assert.equal(a.records[0].sourceDecision,'APPROVED');
 assert.throws(()=>q.importQueue('Rate ID,Hotel ID\n1,2'),/Missing review queue columns/);
});
test('malformed inputs rejected and duplicates quarantined',()=>{
 assert.throws(()=>q.parseCSV('"unclosed'),/Unclosed/);
 assert.throws(()=>q.parseCSV('hello,"stray"xx'),/Malformed quote/);
 const a=q.importQueue(fixture+'\n'+fixture.split('\n')[1]);
 assert.equal(a.records.length,1);assert.equal(a.warnings.length,1);assert.match(a.warnings[0],/duplicate/);
});
test('review suggestions never enable publication, even if source says approved',()=>{
 const a=q.importQueue(fixture),r=a.records[0];
 assert.throws(()=>q.decide(r,'APPROVE','good','owner'),/Invalid/);
 assert.throws(()=>q.decide(r,'VERIFY','short','owner'),/at least 12/);
 q.decide(r,'VERIFY','Please reconfirm GST, room and policy','owner-01','2026-10-27T12:00:00Z');
 assert.equal(q.summary(a.records).VERIFY,1);assert.equal(q.summary(a.records).publishable,0);
 const out=q.exportDecisions(a.records);
 assert.match(out,/HOLD - AUTHENTICATED SERVER APPROVAL REQUIRED/);
 assert.match(out,/owner-01/);
 assert.doesNotMatch(out,/4725/); // no confidential price in decision export
});
test('CSV export escapes spreadsheet-formula cells',()=>{
 const a=q.importQueue(fixture);const r=a.records[0];q.decide(r,'REJECT','=HYPERLINK("evil")','-MAL','2026-10-27T12:00:00Z');
 const out=q.exportDecisions([r]);
 assert.match(out,/'=HYPERLINK/);assert.match(out,/"'-MAL"/);
});
test('owner review page has no external assets/network, no included supplier records',()=>{
 const html=fs.readFileSync('hotel-owner-rate-review.html','utf8');
 assert.match(html,/connect-src 'self'/);assert.match(html,/HOTEL RATE APPROVAL/);
 assert.match(html,/not<\/b> the live DBest Owner Console/);
 assert.match(html,/hotel-review\/approval-gate\.js/);
 assert.match(html,/publication as HOLD/);
 assert.doesNotMatch(html,/source-test|4725|ND-01/);
 const scripts=[...html.matchAll(/<script>\s*([\s\S]+?)<\/script>/g)];
 assert.ok(scripts.length>=2);for(const script of scripts)new vm.Script(script[1]);
 assert.match(html,/id="hotelOwnerWorkbench" hidden/);
 assert.match(html,/id="hotelOwnerAuth"/);
 assert.match(html,/api\/hotel-review-owner-auth/);
});

const gate=require('../api/hotel-review-owner-auth.js');
function responseStub(){
 const headers={},res={statusCode:200,setHeader(k,v){headers[k.toLowerCase()]=v},end(body){res.body=JSON.parse(body);return res}};
 return {res,headers};
}
test('Owner API defaults closed on missing branch-only preview configuration',async()=>{
 const original=process.env;
 try{
  process.env={VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:'main'};
  const {res}=responseStub();
  await gate({method:'GET',headers:{}},res);
  assert.equal(res.statusCode,503);
  assert.equal(res.body.error,'preview_owner_login_not_configured');
 }finally{process.env=original}
});
test('Owner API requires exact preview branch, public key, URL and matching POST Origin',()=>{
 const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feat/hotel-rate-compare-isolated-20261027',HOTEL_REVIEW_SUPABASE_URL:'https://demo.supabase.co',HOTEL_REVIEW_PUBLISHABLE_KEY:'sb_publishable_sandbox123456789ABCDEFGHIJKLM'};
 assert.equal(gate._test.usableEnvironment(env),true);
 assert.equal(gate._test.usableEnvironment({...env,VERCEL_ENV:'production'}),false);
 assert.equal(gate._test.usableEnvironment({...env,VERCEL_GIT_COMMIT_REF:'main'}),false);
 assert.equal(gate._test.usableEnvironment({...env,HOTEL_REVIEW_PUBLISHABLE_KEY:''}),false);
 assert.equal(gate._test.allowedOrigin({headers:{origin:'https://preview.vercel.app',host:'preview.vercel.app'}}),true);
 assert.equal(gate._test.allowedOrigin({headers:{origin:'https://hostile.tld',host:'preview.vercel.app'}}),false);
});
test('Owner opaque token is never returned from authentication metadata and cookie is HttpOnly',()=>{
 const {res,headers}=responseStub();
 gate._test.writeCookie(res,'opaque-session-token-abcdefghijklmnop');
 assert.match(headers['set-cookie'],/HttpOnly; Secure; SameSite=Strict/);
 const req={headers:{cookie:headers['set-cookie'].split(';')[0]}};
 assert.equal(gate._test.cookieToken(req),'opaque-session-token-abcdefghijklmnop');
 const blank=responseStub();
 gate._test.clearCookie(blank.res);
 assert.match(blank.headers['set-cookie'],/Max-Age=0/);
});

test('Owner validation proxies only read-only session-check action and never returns remote config',async()=>{
 const auth=fs.readFileSync('api/hotel-review-owner-auth.js','utf8');
 assert.match(auth,/action:'get_owner'/);
 assert.match(auth,/owner-control-live/);
 assert.doesNotMatch(auth,/save_snapshot/);
 assert.doesNotMatch(auth,/SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/);
 assert.match(auth,/discarded/);
});
