(function(){
'use strict';
const VERSION='20261020-govt-assistance-fee-rules-v1';
if(window.DBEST_GOVT_SERVICE_FEES?.version===VERSION)return;
const TITLE='govt';
const FEE=Object.freeze({'PAN Application':140,'Driving Licence':150,'ITR Filing':150,
  'Certificates':30,'Passport Application':150,'GST Return':150});
const ADDITIONS=['Passport Application','GST Return'];
const contact=[
  {name:'name',label:'Full Name',type:'text',required:true,prefill:'name'},
  {name:'mobile',label:'Mobile',type:'tel',required:true,prefill:'mobile'},
  {name:'email',label:'Email ID',type:'email',required:true,prefill:'email'}
];
function staticSchema(name){
 if(name==='Passport Application')return {
  title:name,fee:FEE[name],
  fields:[...contact,
    {name:'applicationType',label:'Passport Assistance Type',type:'select',required:true,options:['Fresh Passport','Reissue / Renewal','Lost / Damaged Passport','Other']},
    {name:'dob',label:'Date of Birth',type:'date',required:true},
    {name:'appointmentCity',label:'Passport Seva Kendra / Appointment City',required:true},
    {name:'address',label:'Current Address',type:'textarea',full:true,required:true},
    {name:'notes',label:'Additional Details',type:'textarea',full:true}],
  files:[
    {name:'identity',label:'Identity Proof',accept:'image/*,.pdf',required:true},
    {name:'addressProof',label:'Address Proof',accept:'image/*,.pdf',required:true},
    {name:'dobProof',label:'DOB Proof',accept:'image/*,.pdf'},
    {name:'existingPassport',label:'Previous Passport (for reissue)',accept:'image/*,.pdf'}
  ]
 };
 if(name==='GST Return')return {
  title:name,fee:FEE[name],
  fields:[...contact,
    {name:'gstin',label:'GSTIN',required:true},
    {name:'returnType',label:'Return Type',type:'select',required:true,options:['GSTR-1','GSTR-3B','GSTR-9','Other']},
    {name:'filingPeriod',label:'Return Period (Month / Financial Year)',required:true},
    {name:'businessName',label:'Registered Business Name',required:true},
    {name:'state',label:'Registered State',required:true},
    {name:'notes',label:'Filing Notes / Queries',type:'textarea',full:true}],
  files:[
    {name:'salesSummary',label:'Sales / Outward Supply Summary',accept:'.pdf,image/*,.xlsx,.csv',required:true},
    {name:'purchaseSummary',label:'Purchase / ITC Summary',accept:'.pdf,image/*,.xlsx,.csv'},
    {name:'taxRecords',label:'Prior Return or Tax Summary',accept:'.pdf,image/*,.xlsx,.csv'}
  ]
 };
 return null;
}
function govtService(){
 try{return (typeof services!=='undefined'&&Array.isArray(services))?services.find(x=>x&&x[0]===TITLE):null}catch(_){return null}
}
function ensureGovtSubsections(){
 const s=govtService();if(!s||!Array.isArray(s[5]))return;
 for(const label of ADDITIONS)if(!s[5].includes(label))s[5].push(label);
}
function ownerFee(i){
 try{
  const v=(typeof serviceFeeOverrides!=='undefined'&&serviceFeeOverrides)?serviceFeeOverrides['govt:'+i]:undefined;
  if(v===undefined||v===null||String(v)==='')return null;
  const n=Number(v);return Number.isFinite(n)&&n>=0?n:null;
 }catch(_){return null}
}
function patchSchema(){
 const base=window.serviceSchema;if(typeof base!=='function'||base.__dbestGovtFees)return;
 const wrapped=function(id,i){
  if(String(id)!==TITLE)return base.apply(this,arguments);
  ensureGovtSubsections();
  const label=govtService()?.[5]?.[Number(i)];
  if(!Object.prototype.hasOwnProperty.call(FEE,label||''))return base.apply(this,arguments);
  const canonical={'PAN Application':0,'Driving Licence':1,'ITR Filing':2,'Certificates':3};
  const schema=Object.prototype.hasOwnProperty.call(canonical,label)?base.call(this,TITLE,canonical[label]):staticSchema(label);
  if(!schema)return base.apply(this,arguments);
  const explicit=ownerFee(i);
  return {...schema,fee:explicit===null?FEE[label]:explicit,title:label,dbestAssistanceFee:true};
 };
 wrapped.__dbestGovtFees=true;wrapped.__dbestOriginal=base;
 window.serviceSchema=wrapped;try{serviceSchema=wrapped}catch(_){}
}
function patchNavigation(){
 const base=window.openService;if(typeof base!=='function'||base.__dbestGovtFees)return;
 const wrapped=function(id){if(String(id)===TITLE)ensureGovtSubsections();return base.apply(this,arguments)};
 wrapped.__dbestGovtFees=true;wrapped.__dbestOriginal=base;
 window.openService=wrapped;try{openService=wrapped}catch(_){}
}
function patchForm(){
 const base=window.openContentForm;if(typeof base!=='function'||base.__dbestGovtFees)return;
 const wrapped=function(id,i){
  if(String(id)===TITLE)ensureGovtSubsections();
  const result=base.apply(this,arguments);
  if(String(id)===TITLE){
   const root=document.querySelector('.serviceFormPage');
   const strip=root?.querySelector('.feeStrip');
   if(strip){
    const note=strip.querySelector('small:last-child');
    if(note)note.textContent='DBest assistance charge only. Government statutory/portal fees, if applicable, are additional. Payment is required before processing.';
   }
  }
  return result;
 };
 wrapped.__dbestGovtFees=true;wrapped.__dbestOriginal=base;
 window.openContentForm=wrapped;try{openContentForm=wrapped}catch(_){}
}
function install(){patchSchema();patchNavigation();patchForm()}
install();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
setTimeout(install,200);setTimeout(install,900);
window.DBEST_GOVT_SERVICE_FEES={version:VERSION,install,fees:FEE};
})();