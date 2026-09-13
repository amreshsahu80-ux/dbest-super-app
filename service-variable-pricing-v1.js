(function(){
'use strict';
const V='20260914-variable-service-pricing-v1';
if(window.DBEST_VARIABLE_SERVICE_PRICING?.version===V)return;
const VARIABLE=new Set(['govt','jobs','repair']);
const isVariable=id=>VARIABLE.has(String(id||'').toLowerCase());

function patchSchema(){
  const base=window.serviceSchema;
  if(typeof base!=='function'||base.__dbestVariablePricing)return;
  const wrapped=function(id,i){
    const s=base.apply(this,arguments);
    if(!isVariable(id)||!s)return s;
    return {...s,fee:0,variablePricing:true};
  };
  wrapped.__dbestVariablePricing=true;
  wrapped.__dbestOriginal=base;
  window.serviceSchema=wrapped;
  try{serviceSchema=wrapped}catch(_){ }
}

function decorateVariableForm(id){
  if(!isVariable(id))return;
  requestAnimationFrame(()=>{
    const page=document.querySelector('.serviceFormPage');
    if(!page)return;
    const fee=page.querySelector('.feeStrip');
    if(fee){
      fee.innerHTML='<div><small>Service Pricing</small><b>Quote after review</b></div><small>No pre-filled service rate. Final amount is confirmed only after requirement/partner review.</small>';
    }
    const hero=page.querySelector('.sectionHero small');
    if(hero)hero.textContent=hero.textContent.replace(/then continue to PayU\.?/i,'then submit for review and quotation.');
    const btn=page.querySelector('form.serviceFormCard button.btn');
    if(btn)btn.textContent='Submit Request for Review →';
  });
}

function patchOpen(){
  const base=window.openContentApplication;
  if(typeof base!=='function'||base.__dbestVariablePricing)return;
  const wrapped=function(id,i){
    const out=base.apply(this,arguments);
    decorateVariableForm(id);
    return out;
  };
  wrapped.__dbestVariablePricing=true;
  wrapped.__dbestOriginal=base;
  window.openContentApplication=wrapped;
  try{openContentApplication=wrapped}catch(_){ }
}

function patchSubmit(){
  const base=window.submitContentApplication;
  if(typeof base!=='function'||base.__dbestVariablePricing)return;
  const wrapped=async function(e,id,i){
    if(!isVariable(id))return base.apply(this,arguments);
    e?.preventDefault?.();
    if(typeof requireMember==='function'&&!requireMember())return;
    const s=(typeof services!=='undefined'&&Array.isArray(services))?services.find(x=>x&&x[0]===id):null;
    if(!s)return;
    try{
      if(typeof showPayTransition==='function')showPayTransition('Submitting your request for review…');
      const schema=typeof serviceSchema==='function'?serviceSchema(id,i):{title:'Service Request',fields:[],files:[]};
      const form=e?.target;
      const fd=new FormData(form);
      const data={};
      for(const f of (schema.fields||[]))data[f.name]=String(fd.get(f.name)||'').trim();
      const docs={};
      for(const f of (schema.files||[])){
        const file=form?.elements?.[f.name]?.files?.[0];
        if(file){
          if(typeof fileRecord==='function')docs[f.name]=await fileRecord(file);
          else docs[f.name]={name:file.name,size:file.size,type:file.type};
        }
      }
      const sub=(Array.isArray(s[5])&&s[5][i])||schema.title||'Service Request';
      const tx=typeof addTx==='function'?addTx(session.id,s[1],sub,0,'Application Submitted / Quote Pending','',{
        details:(schema.title||sub)+' request submitted for quotation',
        contactName:data.name||(typeof me==='function'?me()?.name:'')||'',
        contactMobile:data.mobile||(typeof me==='function'?me()?.mobile:'')||'',
        source:'Content-wise Service Form',sectionId:id,subIndex:Number(i),application:data,documents:docs,pricingMode:'quote_after_review'
      }):null;
      if(typeof save==='function')save();
      if(typeof hidePayTransition==='function')hidePayTransition();
      if(typeof toast==='function')toast('Request submitted. Final price will be confirmed after review.');
      if(tx&&typeof memberDash==='function')setTimeout(()=>memberDash(session.id),120);
      return tx;
    }catch(err){
      if(typeof hidePayTransition==='function')hidePayTransition();
      console.error('DBest variable pricing request',err);
      if(typeof toast==='function')toast('Could not submit request. Please retry.');
    }
  };
  wrapped.__dbestVariablePricing=true;
  wrapped.__dbestOriginal=base;
  window.submitContentApplication=wrapped;
  try{submitContentApplication=wrapped}catch(_){ }
}

function install(){patchSchema();patchOpen();patchSubmit()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
setTimeout(install,200);setTimeout(install,900);
window.DBEST_VARIABLE_SERVICE_PRICING={version:V,install,isVariable};
})();