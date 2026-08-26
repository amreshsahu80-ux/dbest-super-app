(function(){
'use strict';
const VERSION='1.0.0';
const cfg=window.DBEST_RUNTIME_CONFIG||{};
const BASE=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const KEY=String(cfg.supabasePublishableKey||'');
if(!BASE||!KEY)return;
const HOME='Home Jobs & Local Services';
const SERVICE_LABELS=new Set(['Maid / House Help','Electrician','Plumber','Refrigerator Mechanic','AC Mechanic']);
const text=v=>String(v??'').trim();
const notify=m=>{try{typeof toast==='function'?toast(m):console.log(m)}catch(_){console.log(m)}};
const memberToken=()=>{try{return text(window.DBEST_MEMBER_LIVE?.getToken?.()||localStorage.getItem('dbest_member_live_token'))}catch(_){return''}};
const ownerToken=()=>{try{return text(window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.()||sessionStorage.getItem('dbest_owner_session_token'))}catch(_){return''}};
async function api(body,headers={}){
 const r=await fetch(BASE+'/functions/v1/hyperlocal-service-live',{method:'POST',cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',...headers},body:JSON.stringify(body||{})});
 let d={};try{d=await r.json()}catch(_){}
 if(!r.ok)throw new Error(d.error||d.detail||('HTTP '+r.status));return d;
}
function latestTx(flow){try{return (Array.isArray(txs)?txs:[]).filter(x=>x?.meta?.flow===flow).sort((a,b)=>new Date(b.createdISO||b.created||0)-new Date(a.createdISO||a.created||0))[0]||null}catch(_){return null}}
function locationFrom(fd){return {lat:Number(fd.get('lat'))||null,lng:Number(fd.get('lng'))||null,accuracy:Number(fd.get('accuracy'))||null}}
async function syncRegistration(form){
 const token=memberToken();if(!token)return;
 const fd=new FormData(form),services=fd.getAll('service').map(String),loc=locationFrom(fd);
 await new Promise(r=>setTimeout(r,650));const tx=latestTx('service_partner_registration');
 try{await api({action:'register',transactionId:tx?.id||'',name:text(fd.get('name')),mobile:text(fd.get('mobile')),email:text(fd.get('email')),address:text(fd.get('address')),city:text(fd.get('city')),pincode:text(fd.get('pincode')),serviceTypes:services,experienceYears:Number(fd.get('experience')||0),radiusKm:Number(fd.get('radiusKm')||10),serviceArea:text(fd.get('serviceArea')),lat:loc.lat,lng:loc.lng,accuracy:loc.accuracy},{'x-dbest-member-token':token});}
 catch(e){console.warn('DBest hyperlocal registration sync',e)}
}
async function saveBackendAvailability(form){
 const token=memberToken();if(!token)return notify('Secure member session required. Please login again.');
 const fd=new FormData(form),loc=locationFrom(fd),status=text(fd.get('status'))==='Available'?'Available':'Offline';
 try{
  const d=await api({action:'availability',status,radiusKm:Number(fd.get('radiusKm')||10),lat:loc.lat,lng:loc.lng,accuracy:loc.accuracy},{'x-dbest-member-token':token});
  try{const id=String(session?.id||'');if(id&&typeof addTx==='function'){const tx=addTx(id,HOME,'Service Partner Availability',0,status,'',{details:'Secure backend availability update',meta:{}});tx.meta={...(tx.meta||{}),flow:'service_partner_availability',source:'DBest Hyperlocal Backend',serviceTypes:d.partner?.service_types||[],radiusKm:d.partner?.radius_km||Number(fd.get('radiusKm')||10),workLocation:{lat:d.partner?.lat||loc.lat,lng:d.partner?.lng||loc.lng,accuracy:d.partner?.location_accuracy_m||loc.accuracy}};if(typeof save==='function')save()}}catch(_){}
  notify('Availability updated securely.');setTimeout(()=>window.DBEST_SERVICE_PARTNERS?.openPortal?.(),150);
 }catch(e){notify(e.message==='owner_approval_required'?'Owner approval is required before going Available.':'Availability could not be updated: '+e.message)}
}
async function enhancePortal(){
 const form=document.getElementById('dbestSpAvailability');if(!form)return;
 const token=memberToken();if(!token)return;
 try{
  const d=await api({action:'me'},{'x-dbest-member-token':token}),p=d.partner;if(!p)return;
  const notices=[...document.querySelectorAll('.sectionContent .notice')];const statusBox=notices.find(x=>/KYC \/ Owner Status/i.test(x.textContent||''));
  if(statusBox)statusBox.innerHTML='<b>KYC / Owner Status:</b> '+(p.approval_status==='Approved'?'✅ Approved / Active':p.approval_status)+'<br><small>Secure backend profile • '+(p.availability_status||'Offline')+'</small>';
  if(p.approval_status==='Approved'&&p.active){
   form.querySelectorAll('select,input,button').forEach(el=>{if(el.type!=='hidden')el.disabled=false});
   form.onsubmit=function(e){e.preventDefault();saveBackendAvailability(form)};
  }
  const old=[...notices].find(x=>/Nearby job dispatch/i.test(x.textContent||''));if(old)old.innerHTML='<b>Nearby job dispatch:</b> ✅ Secure backend matching is enabled. Approved Available partners are matched by service, radius and location.';
  let jobs=document.getElementById('dbestHyperAssignedJobs');if(!jobs){jobs=document.createElement('div');jobs.id='dbestHyperAssignedJobs';jobs.className='ownerPanelCard';jobs.style.marginTop='12px';form.closest('.sectionContent')?.appendChild(jobs)}
  const rows=Array.isArray(d.jobs)?d.jobs:[];jobs.innerHTML='<h3>Assigned Home Jobs</h3>'+(rows.length?'<div class="ownerQueue">'+rows.slice(0,20).map(j=>'<div class="ownerQueueRow"><b>'+String(j.service_type||'Home Service').replace(/</g,'&lt;')+'</b><small>'+String(j.city||j.pincode||'Nearby')+' • '+String(j.status||'Assigned')+'</small></div>').join('')+'</div>':'<div class="notice">No assigned jobs yet.</div>');
 }catch(e){console.warn('DBest hyperlocal portal backend',e)}
}
function installPortalPatch(){const sp=window.DBEST_SERVICE_PARTNERS;if(!sp||sp.__backendLive)return;const old=sp.openPortal;if(typeof old==='function'){sp.openPortal=function(){const r=old.apply(this,arguments);setTimeout(enhancePortal,300);return r}}sp.__backendLive=true}
function installJobWrap(){const fn=window.submitContentApplication;if(typeof fn!=='function'||fn.__hyperBackendLive)return;const wrapped=async function(){let before=[];try{before=(Array.isArray(txs)?txs:[]).map(x=>String(x.id||''))}catch(_){}const r=await fn.apply(this,arguments);setTimeout(async()=>{try{const all=Array.isArray(txs)?txs:[];const tx=[...all].reverse().find(x=>!before.includes(String(x.id||''))&&((x.meta?.flow==='hyperlocal_home_service')||(String(x.section||'')===HOME&&SERVICE_LABELS.has(String(x.sub||x.subsection||'')))));if(tx&&memberToken())await api({action:'sync_job',transaction:tx},{'x-dbest-member-token':memberToken()})}catch(e){console.warn('DBest hyperlocal job sync',e)}},500);return r};wrapped.__hyperBackendLive=true;window.submitContentApplication=wrapped}
function approvalClick(btn){const row=btn.closest('.ownerQueueRow');if(!row)return;const label=text(btn.textContent);if(!/Approve Service Partner|Reject/.test(label))return;const raw=text(row.textContent),m=raw.match(/TX[A-Za-z0-9_-]+/i);if(!m)return;const approval=/Approve Service Partner/.test(label)?'Approved':'Rejected';setTimeout(()=>api({action:'owner_set_approval',transactionId:m[0],approval},{'x-dbest-owner-token':ownerToken()}).then(()=>notify('Service Partner '+approval+' in secure backend.')).catch(e=>console.warn('DBest hyperlocal approval sync',e)),250)}
document.addEventListener('submit',e=>{const f=e.target;if(f instanceof HTMLFormElement&&f.id==='dbestServicePartnerForm')syncRegistration(f)},false);
document.addEventListener('click',e=>{const b=e.target?.closest?.('button');if(b)approvalClick(b)},false);
[50,250,700,1500,3000].forEach(ms=>setTimeout(()=>{installPortalPatch();installJobWrap();enhancePortal()},ms));
new MutationObserver(()=>{installPortalPatch();installJobWrap()}).observe(document.documentElement,{childList:true,subtree:true});
window.DBEST_HYPERLOCAL_BACKEND={version:VERSION,api,enhancePortal};
})();