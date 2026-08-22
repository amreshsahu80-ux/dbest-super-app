(function(){
'use strict';
const VERSION='1.0.0',DISPATCH=BASE+'/functions/v1/vaahak-dispatch-live';
let hardStop=false;
async function dispatchCall(action,body={}){const r=await fetch(DISPATCH,{method:'POST',headers:headers(true),body:JSON.stringify({action,...body})});const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.error||'dispatch_failed');e.data=d;throw e}return d}

const nativeStop=window.stopGps;
window.stopGps=function(){try{if(!hardStop&&typeof current!=='undefined'&&current?.available&&!document.getElementById('dash')?.classList.contains('hidden'))return}catch(e){}return nativeStop?.apply(this,arguments)};
try{stopGps=window.stopGps}catch(e){}
const nativeLogout=window.logout;
window.logout=function(){hardStop=true;try{return nativeLogout?.apply(this,arguments)}finally{setTimeout(()=>{hardStop=false},100)}};
try{logout=window.logout}catch(e){}

const nativeRender=window.renderJob;
window.renderJob=function(j){const r=nativeRender?.apply(this,arguments);try{const card=document.querySelector('#jobs .job');if(card&&j?.status==='Open'&&j?.offer_expires_at){const sec=Math.max(0,Math.ceil((new Date(j.offer_expires_at).getTime()-Date.now())/1000)),km=j.dispatch_distance_km==null?'':` • ${Number(j.dispatch_distance_km).toFixed(1)} km from pickup`;card.insertAdjacentHTML('afterbegin',`<div style="padding:10px 11px;margin-bottom:10px;border-radius:12px;background:#fff5df;border:1px solid #f0d79b;color:#79530a;font-weight:850">📍 Nearest-Vaahak offer${km}<br><small>Accept within about ${sec}s or this request moves automatically to the next-nearest Vaahak.</small></div>`)}if(!j&&typeof current!=='undefined'&&current?.available){const host=document.getElementById('jobs');if(host)host.innerHTML='<div class="gps">📍 ONLINE • Your location is being used only to match you with the nearest available Cab/Delivery request.</div><div class="muted" style="margin-top:10px">Waiting for the nearest eligible request…</div>'}}catch(e){}return r};
try{renderJob=window.renderJob}catch(e){}

window.loadStatus=async function(force=false){
 clearTimeout(timer);if(!token())return show('login');if(pinModalOpen&&!force){timer=setTimeout(()=>loadStatus(false),3000);return}
 try{
  const d=await comCall('dashboard_status',{},true);current=d.partner;document.getElementById('vname').textContent='🛵 '+(current.name||'Vaahak');document.getElementById('vmeta').textContent=current.id+' • '+(current.vehicle||'')+' '+(current.vehicle_no||'');document.getElementById('approval').textContent=current.owner_approval||'—';document.getElementById('online').textContent=current.available?'ONLINE':'OFFLINE';document.getElementById('toggleBtn').textContent=current.available?'Go Offline':'Go Online';
  if(current.available)try{ensureGps()}catch(e){}
  let j=(d.jobs||[]).find(x=>x.assigned_partner_id===current.id&&['Accepted','Trip Started'].includes(String(x.status)))||null;
  if(!j&&current.available){try{const o=await dispatchCall('my_offer');j=o.job||null}catch(e){}}
  renderJob(j);if(current.available)try{ensureGps()}catch(e){};timer=setTimeout(()=>loadStatus(false),3000);
 }catch(x){if(/session/i.test(String(x.message||''))){localStorage.removeItem(TK);hardStop=true;nativeStop?.();hardStop=false;show('login');note('Session expired. Please login again.',false)}else{note('Dashboard update failed: '+x.message,false);timer=setTimeout(()=>loadStatus(false),4000)}}
};
try{loadStatus=window.loadStatus}catch(e){}

window.jobAction=async function(id,action){if(busy)return;busy=true;try{if(action==='accept'){await dispatchCall('accept_offer',{jobId:id});note('Nearest request accepted. It is now locked to you.')}else if(action==='reject'){await dispatchCall('reject_offer',{jobId:id});note('Request skipped. It has moved to the next-nearest eligible Vaahak.')}else return;loadStatus(true)}catch(x){const m=String(x.message||'');note(m==='offer_expired'?'This offer expired and has already moved to the next Vaahak.':m==='job_not_offered_to_this_vaahak'?'This job is no longer assigned to your offer queue.':'Job update failed: '+m,false);loadStatus(true)}finally{busy=false}};
try{jobAction=window.jobAction}catch(e){}

clearTimeout(timer);if(token())setTimeout(()=>loadStatus(true),80);
window.DBEST_VAAHAK_NEAREST_DISPATCH={version:VERSION,offerSeconds:20};
})();