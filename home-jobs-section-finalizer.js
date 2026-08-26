(function(){
'use strict';
const VERSION='1.0.0';
const JOB_ID='jobs';
const HOME_SERVICES=['Maid / House Help','Electrician','Plumber','Refrigerator Mechanic','AC Mechanic'];
const PARTNER_LINKS=['Become Service Partner','Service Partner Portal'];
const BANNED=new Set(['job search','job application']);
const norm=v=>String(v||'').trim().toLowerCase();
function cleanList(existing){
  const source=Array.isArray(existing)?existing:[];
  const keep=[];
  for(const item of source){
    const n=norm(item);
    if(!n||BANNED.has(n))continue;
    if(HOME_SERVICES.some(x=>norm(x)===n))continue;
    if(!keep.some(x=>norm(x)===n))keep.push(String(item));
  }
  const partner=[];
  for(const p of PARTNER_LINKS){if(keep.some(x=>norm(x)===norm(p)))partner.push(p)}
  const other=keep.filter(x=>!PARTNER_LINKS.some(p=>norm(p)===norm(x)));
  return [...HOME_SERVICES,...other,...partner];
}
function apply(){
  try{
    if(typeof services!=='undefined'&&Array.isArray(services)){
      const s=services.find(x=>x&&x[0]===JOB_ID);
      if(s){
        s[1]='Home Jobs & Local Services';
        s[4]='Book trusted nearby home-service professionals and manage local service requests';
        s[5]=cleanList(s[5]);
      }
    }
    if(typeof serviceControl!=='undefined'&&serviceControl){
      const c=serviceControl[JOB_ID]||{};
      serviceControl[JOB_ID]={
        ...c,
        title:'Home Jobs & Local Services',
        description:'Book trusted nearby home-service professionals and manage local service requests',
        subsections:cleanList(c.subsections),
        visible:c.visible!==false
      };
    }
  }catch(e){console.warn('DBest Home Jobs finalizer',e)}
}
function wrapOwnerSync(){
  const fn=window.syncOwnerMasterConfig;
  if(typeof fn!=='function'||fn.__dbestHomeJobsFinalized)return;
  const wrapped=async function(){const r=await fn.apply(this,arguments);apply();setTimeout(apply,60);return r};
  wrapped.__dbestHomeJobsFinalized=true;
  window.syncOwnerMasterConfig=wrapped;
}
function wrapHyperRefresh(){
  const api=window.DBEST_HYPERLOCAL_HOME;
  if(!api||typeof api.refresh!=='function'||api.refresh.__dbestHomeJobsFinalized)return;
  const old=api.refresh;
  const wrapped=function(){const r=old.apply(this,arguments);apply();return r};
  wrapped.__dbestHomeJobsFinalized=true;
  api.refresh=wrapped;
}
function install(){apply();wrapOwnerSync();wrapHyperRefresh()}
[0,100,300,700,1400,2800,4500,6500,9000,12000].forEach(ms=>setTimeout(install,ms));
document.addEventListener('click',()=>setTimeout(install,40),true);
window.addEventListener('load',()=>setTimeout(install,120),{once:true});
window.DBEST_HOME_JOBS_FINALIZER={version:VERSION,apply,services:HOME_SERVICES.slice()};
})();
