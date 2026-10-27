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
 assert.match(html,/connect-src 'none'/);assert.match(html,/HOTEL RATE APPROVAL/);
 assert.match(html,/not<\/b> the authenticated DBest Owner Console/);
 assert.match(html,/hotel-review\/approval-gate\.js/);
 assert.match(html,/publication as HOLD/);
 assert.doesNotMatch(html,/source-test|4725|ND-01/);
 const js=html.match(/<script>\s*([\s\S]+?)<\/script>/);
 assert.ok(js);new vm.Script(js[1]);
});
