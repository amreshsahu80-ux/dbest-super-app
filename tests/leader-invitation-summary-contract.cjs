'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const path='supabase/functions/leader-partner-onboarding-live/index.ts';
const original=fs.readFileSync('audit/20261020-leader-onboarding-live-v5-source.ts','utf8');
const source=fs.readFileSync(path,'utf8');
function loadSummary(){
 const src=source.replace(/^import[^\n]+;?\s*$/gm,'');
 const code=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const context={Deno:{serve:()=>{}},TextEncoder,Response,URLSearchParams,console,Date,crypto:require('node:crypto').webcrypto};
 vm.runInNewContext(code+';globalThis.__testFn=summarizeLaunchRows;',context,{timeout:1500});
 return context.__testFn;
}
test('expired Launched invitations are not counted as pending',()=>{
 const f=loadSummary(),now=Date.parse('2026-10-20T10:00:00Z');
 const rows=Array.from({length:27},()=>({status:'Launched',expires_at:'2026-10-20T09:00:00Z'}));
 const r=f(rows,now);
 assert.equal(r.started,27);assert.equal(r.pending,0);assert.equal(r.expired,27);assert.equal(r.activated,0);assert.equal(r.earned,0);
});
test('unexpired Launched and previously Claimed partners remain pending',()=>{
 const f=loadSummary(),now=Date.parse('2026-10-20T10:00:00Z');
 const rows=[
   {status:'Launched',expires_at:'2026-10-20T13:00:00Z'},
   {status:'Launched',expires_at:'2026-10-20T09:00:00Z'},
   {status:'Claimed',expires_at:'2026-10-20T09:00:00Z'},
   {status:'Credited',expires_at:'2026-10-20T09:00:00Z',incentive_amount:300},
   {status:'Credited',incentive_amount:200}
 ];
 const r=f(rows,now);
 assert.equal(r.started,5);assert.equal(r.pending,2);assert.equal(r.expired,1);assert.equal(r.activated,2);assert.equal(r.earned,500);
});
test('empty or malformed list cannot falsely count pending links',()=>{
 const f=loadSummary(),now=Date.now();
 assert.equal(f([],now).pending,0);
 const v=f([{status:'Launched'},{status:'Launched',expires_at:'junk'},{status:'Rejected'}],now);
 assert.equal(v.pending,0);assert.equal(v.expired,2);
});
test('every other live action and security check remains byte identical',()=>{
 const oldAnchor="Deno.serve(async(req:Request)=>{";
 const start=source.indexOf("function summarizeLaunchRows(rows:any[]");
 assert(start>0);
 assert.equal(source.slice(0,start),original.slice(0,original.indexOf(oldAnchor)));
 const originalRest=original.slice(original.indexOf(oldAnchor));
 const newRest=source.slice(source.indexOf(oldAnchor));
 const origSummary="    const summary={started:rows.length,pending:rows.filter((x:any)=>['Launched','Claimed'].includes(String(x.status))).length,activated:rows.filter((x:any)=>x.status==='Credited').length,earned:rows.filter((x:any)=>x.status==='Credited').reduce((s:number,x:any)=>s+Number(x.incentive_amount||0),0)};";
 const nextSummary="    const summary=summarizeLaunchRows(rows);";
 assert(originalRest.includes(origSummary));
 assert.equal(newRest,originalRest.replace(origSummary,nextSummary));
 assert(source.includes("if(action==='claim')")&&source.includes("if(action==='launch')")&&source.includes("if(action==='validate')"));
 assert(!source.slice(source.indexOf("if(action==='claim')"),source.indexOf("if(action==='list')")).includes(".update("));
});
