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

const gate=require('../hotel-review/owner-auth-handler.cjs');
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
 assert.equal(gate._test.usableEnvironment({...env,VERCEL_GIT_COMMIT_REF:undefined}),true);
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
 const auth=fs.readFileSync('hotel-review/owner-auth-handler.cjs','utf8');
 assert.match(auth,/action:'get_owner'/);
 assert.match(auth,/owner-control-live/);
 assert.doesNotMatch(auth,/save_snapshot/);
 assert.doesNotMatch(auth,/SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/);
 assert.match(auth,/discarded/);
});

const standalone=require('../hotel-review/standalone-owner-auth.cjs');
test('standalone hotel pilot requires explicit isolated deployment config and never uses the live DBest hostname',async()=>{
 const e={VERCEL_ENV:'production',HOTEL_REVIEW_DEPLOYMENT_MODE:'isolated-preview',HOTEL_REVIEW_SUPABASE_URL:'https://demo.supabase.co',HOTEL_REVIEW_PUBLISHABLE_KEY:'sb_publishable_abcdefghijklmnopqrstuvxyz'};
 assert.equal(standalone._test.usableEnvironment(e),true);
 assert.equal(standalone._test.usableEnvironment({...e,VERCEL_ENV:'preview'}),false);
 assert.equal(standalone._test.usableEnvironment({...e,HOTEL_REVIEW_DEPLOYMENT_MODE:''}),false);
 const {res}=responseStub();
 await standalone({method:'GET',headers:{host:'dbest4u.com'}},res);
 assert.equal(res.statusCode,403);
 assert.equal(res.body.error,'isolated_pilot_only');
 const src=fs.readFileSync('hotel-review/standalone-owner-auth.cjs','utf8');
 assert.match(src,/owner-control-live/);
 assert.doesNotMatch(src,/save_snapshot/);
 assert.doesNotMatch(src,/SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/);
});

test('hotel review parser runs before inline workbench startup',()=>{
 const page=fs.readFileSync('hotel-owner-rate-review.html','utf8');
 const match=page.match(/<script([^>]*)src="\/hotel-review\/approval-gate\.js"([^>]*)><\/script>/);
 assert.ok(match,'parser script present');
 assert.doesNotMatch(match[0],/\bdefer\b|\basync\b|type="module"/);
 assert.ok(page.indexOf(match[0])<page.indexOf('DBestTariffReview.summary'));
 assert.match(page,/id="hotelOwnerWorkbench" hidden/);
});


test('direct Rate History CSV import maps contracting source to HOLD-only review',()=>{
 const headers=['Rate ID','Hotel ID','Hotel Name','Email Message ID','Date Received','Room Category','Occupancy','Rate INR','Taxes','Meal Plan','Extra Bed','Child Policy','Cancellation','Payment Terms','Validity','Group Rates','Confidence / Review Status','Notes'];
 const cells=['SAMPLE-R1','TEST-HOTEL-1','Fictional Test Property','test-msg-ref','2026-10-27','Standard','Double','4567','Taxes pending','Breakfast','','','','','Subject to confirmation','','Quoted; verification needed',''];
 const csv=headers.join(',')+'\n'+cells.join(',');
 const imported=q.importQueue(csv);
 assert.equal(imported.sourceType,'hotel_rate_history');
 assert.equal(imported.records.length,1);
 assert.equal(imported.records[0].amount,4567);
 assert.equal(imported.records[0].hotel,'Fictional Test Property');
 assert.equal(imported.records[0].sourceReference,'test-msg-ref');
 assert.equal(imported.records[0].sourceReview,'Quoted; verification needed');
 assert.equal(imported.records[0].sourceGate,'HOLD');
 assert.equal(imported.records[0].decision,'HOLD');
 assert.equal(imported.publicationEnabled,false);
 assert.equal(q.summary(imported.records).publishable,0);
 assert.doesNotMatch(q.exportDecisions(imported.records),/4567/);
});
test('Rate History cannot mark quoted supplier rates publishable even with unsound source data',()=>{
 const h=q.rateHistoryRequired;
 const base=h.map(x=>x==='Rate ID'?'SANDBOX-R2':x==='Hotel ID'?'TEST-HOTEL':x==='Hotel Name'?'Demo Hotel':x==='Rate INR'?'not a number':x==='Confidence / Review Status'?'Approved by source':'').join(',');
 const parsed=q.importQueue(h.join(',')+'\n'+base);
 assert.equal(parsed.records[0].amount,null);
 assert.equal(parsed.records[0].decision,'HOLD');
 assert.ok(parsed.warnings.some(x=>x.includes('nonnumeric')));
 assert.equal(q.summary(parsed.records).publishable,0);
});

test('standalone Owner API: unauthenticated GET and cross-origin POST stay denied',async()=>{
 const prior=process.env;
 process.env={VERCEL_ENV:'production',HOTEL_REVIEW_DEPLOYMENT_MODE:'isolated-preview',
 HOTEL_REVIEW_SUPABASE_URL:'https://example.supabase.co',
 HOTEL_REVIEW_PUBLISHABLE_KEY:'sb_publishable_abcdefghijklmnopqrstuvwxyz0123456789'};
 try {
   const host='dbest-hotel-review-preview.vercel.app';
   let x=responseStub();
   await standalone({method:'GET',headers:{host}},x.res);
   assert.equal(x.res.statusCode,401,'Missing HttpOnly session fails closed');
   assert.deepEqual(x.res.body,{ok:false,authenticated:false});
   assert.match(x.headers['set-cookie'],/Max-Age=0/);
   x=responseStub();
   await standalone({method:'POST',headers:{host,origin:'https://attacker.example', 'content-length':'20'},body:{action:'logout'}},x.res);
   assert.equal(x.res.statusCode,403,'Cross-origin POST never reaches session operation');
   assert.equal(x.res.body.error,'origin_not_allowed');
   x=responseStub();
   await standalone({method:'POST',headers:{host,origin:'https://'+host, 'content-length':'99999'},body:{action:'verify_otp'}},x.res);
   assert.equal(x.res.statusCode,413,'Oversize requests are rejected before OTP handling');
 }finally{process.env=prior;}
});

test('owner OTP UI keeps an existing code usable and throttles resend without weakening verification',()=>{
 const html=fs.readFileSync('hotel-owner-rate-review.html','utf8');
 assert.match(html,/id="ownerOtpInput"/);
 assert.doesNotMatch(html,/id="ownerOtpInput" hidden/);
 assert.match(html,/Already have a valid Owner OTP\?/);
 assert.match(html,/sessionStorage\.setItem\(cooldownKey/);
 assert.match(html,/sendButton\.disabled=sending\|\|seconds>0/);
 assert.match(html,/startCooldown\(65\)/);
 assert.match(html,/e\.httpStatus===429/);
 assert.match(html,/five incorrect attempts require requesting a new code/i);
 assert.match(html,/e\.httpStatus===401\?'Please sign in/);
 assert.match(html,/OTP sending is limited to one request per Owner email every 60 seconds/);
 const scripts=[...html.matchAll(/<script>\s*([\s\S]+?)<\/script>/g)];
 scripts.forEach(m=>new vm.Script(m[1]));
});

test('hotel Owner validation accepts verified session even with >16KB server settings',async()=>{
 const env={HOTEL_REVIEW_SUPABASE_URL:'https://example.supabase.co',HOTEL_REVIEW_PUBLISHABLE_KEY:'sb_publishable_abcdefghijklmnopqrstuvwxyz0123456789'};
 const saved=global.fetch;
 let calls=0;
 try {
  global.fetch=async(url,opts)=>{
   calls++;
   assert.match(String(url),/\/functions\/v1\/owner-control-live$/);
   assert.equal(opts.method,'POST');
   assert.equal(opts.headers['x-dbest-owner-token'],'opaque-owner-session-123456789');
   assert.equal(JSON.parse(opts.body).action,'get_owner');
   return new Response(JSON.stringify({ok:true,config:{oversizedValue:'x'.repeat(23000)}}),
     {status:200,headers:{'content-type':'application/json'}});
  };
  assert.equal(await standalone._test.validateOwner(env,'opaque-owner-session-123456789'),true);
  assert.equal(calls,1);
  global.fetch=async()=>new Response(JSON.stringify({error:'owner_session_invalid'}),
    {status:401,headers:{'content-type':'application/json'}});
  assert.equal(await standalone._test.validateOwner(env,'fake-owner-token-123456789'),false);
  assert.equal(await standalone._test.validateOwner(env,''),false);
 }finally{global.fetch=saved}
});
test('hotel OTP verification returns HttpOnly session without forwarding DBest settings',async()=>{
 const env={VERCEL_ENV:'production',HOTEL_REVIEW_DEPLOYMENT_MODE:'isolated-preview',
   HOTEL_REVIEW_SUPABASE_URL:'https://example.supabase.co',
   HOTEL_REVIEW_PUBLISHABLE_KEY:'sb_publishable_abcdefghijklmnopqrstuvwxyz0123456789'};
 const savedEnv=process.env,savedFetch=global.fetch;
 process.env=env;
 const routes=[];
 try{
  global.fetch=async(url,opts)=>{
   const path=String(url);routes.push(path);
   if(path.endsWith('/verify-owner-otp'))return new Response(JSON.stringify({ok:true,ownerToken:'opaque-owner-session-123456789'}),
     {status:200,headers:{'content-type':'application/json'}});
   if(path.endsWith('/owner-control-live'))return new Response(JSON.stringify({ok:true,config:'s'.repeat(25000)}),
     {status:200,headers:{'content-type':'application/json'}});
   throw Error('Unexpected endpoint');
  };
  const {res,headers}=responseStub();
  const host='dbest-hotel-review-preview.vercel.app';
  await standalone({method:'POST',url:'/api/hotel-review-owner-auth',headers:{host,origin:'https://'+host},
    body:{action:'verify_otp',email:'owner@example.com',code:'123456'}},res);
  assert.equal(res.statusCode,200);
  assert.deepEqual(res.body,{ok:true,authenticated:true,expiresIn:7200});
  assert.match(headers['set-cookie'],/HttpOnly; Secure; SameSite=Strict/);
  assert.equal(JSON.stringify(res.body).includes('config'),false);
  assert.equal(routes.length,2);
 }finally{process.env=savedEnv;global.fetch=savedFetch}
});
