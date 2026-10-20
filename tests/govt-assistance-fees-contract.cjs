'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('govt-assistance-fees-v1.js','utf8');
const variable=fs.readFileSync('service-variable-pricing-v1.js','utf8');
const home=fs.readFileSync('index.html','utf8');
const names=['PAN Application','Driving Licence','ITR Filing','Certificates'];
const fees=[140,150,150,30];
function makeEnv(){
 let shown=0,submit=0,route=0;const feeNote={textContent:''};
 const ctx={
  services:[['govt','PAN, DL, ITR','📄','#6d58b7','Government assistance',[...names]],
    ['car','Cab','🚘','#aaa','Travel',['Book']]],
  serviceFeeOverrides:{},
  serviceSchema(id,i){if(id==='govt'&&i<4)return {title:names[i],fee:[149,249,499,199][i],fields:[{name:'name',required:true}],files:[{name:'identity',required:true}]};return {title:'Other Service',fee:49,fields:[],files:[]}},
  openService(id){route++;return id},
  openContentForm(id,i){shown++;const s=ctx.serviceSchema(id,i);return {id,index:i,title:s.title,fee:s.fee}},
  document:{readyState:'complete',querySelector(sel){return sel==='.serviceFormPage'?{querySelector(q){return q==='.feeStrip'?{querySelector(t){return t==='small:last-child'?feeNote:null}}:null}}:null}},
  setTimeout(){},console
 };
 ctx.window=ctx;
 vm.runInNewContext(code,ctx,{timeout:2000});
 return {ctx,feeNote,get counts(){return {shown,route,submit}}};
}
test('PAN, DL, ITR and Certificate service prices are as Owner requested',()=>{
 const x=makeEnv();for(let i=0;i<4;i++){const s=x.ctx.serviceSchema('govt',i);assert.equal(s.title,names[i]);assert.equal(s.fee,fees[i]);assert.equal(s.dbestAssistanceFee,true)}
});
test('Passport and GST returns appear under Government Services with complete tailored forms',()=>{
 const {ctx}=makeEnv();
 ctx.openService('govt');
 const list=ctx.services[0][5];
 assert.deepEqual(Array.from(list.slice(4)),['Passport Application','GST Return']);
 for(const [index,price] of [[4,150],[5,150]]){
  const s=ctx.serviceSchema('govt',index);
  assert.equal(s.title,list[index]);assert.equal(s.fee,price);
  assert(s.fields.length>=8);assert(s.files.length>=2);
  assert(s.fields.some(x=>x.required));assert(s.files.some(x=>x.required));
 }
 assert(ctx.serviceSchema('govt',5).fields.some(x=>x.name==='gstin'));
 assert(ctx.serviceSchema('govt',4).fields.some(x=>x.name==='appointmentCity'));
});
test('Owner-controlled fee overrides remain authoritative for all Govt Services',()=>{
 const {ctx}=makeEnv();ctx.openService('govt');
 ctx.serviceFeeOverrides['govt:0']=125;
 ctx.serviceFeeOverrides['govt:3']=35;
 ctx.serviceFeeOverrides['govt:5']=180;
 assert.equal(ctx.serviceSchema('govt',0).fee,125);
 assert.equal(ctx.serviceSchema('govt',3).fee,35);
 assert.equal(ctx.serviceSchema('govt',5).fee,180);
});
test('Unrelated frozen sections and variable-price sections are unmodified',()=>{
 const {ctx}=makeEnv();assert.equal(ctx.serviceSchema('car',0).fee,49);
 assert(!/const VARIABLE=new Set\(\['govt'/.test(variable));
 assert(variable.includes("'jobs','repair','insurance','travel'"));
 assert.equal(ctx.openService('car'),'car');
});
test('Customer form shows statutory-fees separate from DBest charge',()=>{
 const {ctx,feeNote}=makeEnv();
 const s=ctx.openContentForm('govt',0);
 assert.equal(s.fee,140);assert.match(feeNote.textContent,/statutory\/portal fees/i);
});
test('Production app retains one standalone GOVT fee script with unchanged core apps',()=>{
 assert.equal((home.match(/'govt-assistance-fees-v1.js'/g)||[]).length,1);
 assert(home.includes("'member-referral-share-v1.js'"));
 assert(home.includes("'cab-entry-capture-final-v1.js'"));
 assert(home.includes("'marketplace-secure-session-v1.js'"));
 assert(home.includes("'owner-deeplink-all-sections.js'"));
});
test('Never request OTP or government portal password for GST/Passport',()=>{
 const {ctx}=makeEnv();ctx.openService('govt');
 for(const i of [4,5]){const s=ctx.serviceSchema('govt',i);assert(!s.fields.some(x=>/otp|password|secret|portal.*login/i.test(x.name)))}
});
