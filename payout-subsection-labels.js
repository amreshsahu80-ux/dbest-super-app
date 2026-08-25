(function(){
'use strict';
const VERSION='1.0.0';
const DESIRED={
  insurance:['Health','Life','Motor','Travel'],
  flights:['Flight','Hotels','Package','Visa']
};
function patch(){
  const changed=[];
  try{
    if(typeof services==='undefined'||!Array.isArray(services))return changed;
    Object.entries(DESIRED).forEach(([id,subs])=>{
      const s=services.find(x=>Array.isArray(x)&&String(x[0])===id);
      if(!s)return;
      changed.push([s,Array.isArray(s[5])?s[5].slice():s[5]]);
      s[5]=subs.slice();
    });
  }catch(e){}
  return changed;
}
function restore(changed){
  (changed||[]).forEach(([s,old])=>{try{s[5]=Array.isArray(old)?old.slice():old}catch(e){}});
}
function install(){
  const api=window.DBEST_PAYOUT_PERCENT_MATRIX;
  if(!api||api.__dbestDesiredLabels)return false;
  const rawOpen=api.open, rawSave=api.save, rawServices=api.services;
  if(typeof rawOpen!=='function'||typeof rawSave!=='function')return false;
  const open=function(){const c=patch();try{return rawOpen.apply(this,arguments)}finally{restore(c)}};
  const save=async function(){const c=patch();try{return await rawSave.apply(this,arguments)}finally{restore(c)}};
  const list=function(){const c=patch();try{return typeof rawServices==='function'?rawServices.apply(this,arguments):[]}finally{restore(c)}};
  api.open=open;api.save=save;api.services=list;api.__dbestDesiredLabels=true;api.labelVersion=VERSION;
  window.ownerPayoutStudio=open;
  return true;
}
[0,120,350,900,1800].forEach(ms=>setTimeout(install,ms));
window.DBEST_PAYOUT_SUBSECTION_LABELS={version:VERSION,desired:DESIRED,refresh:install};
})();