(function(){
'use strict';
const VERSION='2.1.0',DISPATCH=BASE+'/functions/v1/vaahak-dispatch-live',POLL_MS=2500;
let hardStop=false,lastKey='',stickyOffer=null,countTimer=null;
async function dispatchCall(action,body={}){const r=await fetch(DISPATCH,{method:'POST',cache:'no-store',headers:headers(true),body:JSON.stringify({action,...body})});const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.error||'dispatch_failed');e.data=d;throw e}return d}
function liveOffer(j){return !!(j&&j.status==='Open'&&j.offer_expires_at&&new Date(j.offer_expires_at).getTime()>Date.now())}
function key(j){return j?`${j.id}|${j.status}|${j.assigned_partner_id||''}|${j.offered_partner_id||''}|${j.offer_expires_at||''}`:'none'}
function startCountdown(j){clearInterval(countTimer);if(!liveOffer(j))return;const tick=()=>{const el=document.getElementById('dbestOfferCountdown');if(!el){clearInterval(countTimer);return}const sec=Math.max(0,Math.ceil((new Date(j.offer_expires_at).getTime()-Date.now())/1000));el.textContent=sec>0?`${sec}s remaining`:'Offer expired';if(sec<=0)clearInterval(countTimer)};tick();countTimer=setInterval(tick,1000)}

const nativeStop=window.stopGps;
window.stopGps=function(){try{if(!hardStop&&typeof current!=='undefined'&&current?.available&&!document.getElementById('dash')?.classList.contains('hidden'))return}catch(e){}return nativeStop?.apply(this,arguments)};
try{stopGps=window.stopGps}catch(e){}
const nativeLogout=window.logout;
window.logout=function(){hardStop=true;clearInterval(countTimer);stickyOffer=null;lastKey='';try{return nativeLogout?.apply(this,arguments)}finally{setTimeout(()=>{hardStop=false},100)}};
try{logout=window.logout}catch(e){}

const nativeRender=window.renderJob;
window.renderJob=function(j){const r=nativeRender?.apply(this,arguments);try{const card=document.querySelector('#jobs .job');if(card&&liveOffer(j)){const km=j.dispatch_distance_km==null?'':` • ${Number(j.dispatch_distance_km).toFixed(1)} km from pickup`;card.insertAdjacentHTML('afterbegin',`<div style="padding:11px;margin-bottom:10px;border-radius:12px;background:#fff5df;border:1px solid #f0d79b;color:#79530a;font-weight:850">📍 New request${km}<br><small>This request is reserved for you while the timer runs. <b id="dbestOfferCountdown"></b></small></div>`);startCountdown(j)}if(!j&&typeof current!=='undefined'&&current?.available){const host=document.getElementById('jobs');if(host)host.innerHTML='<div class="gps">📍 ONLINE • Ready for the nearest eligible Ride / Delivery request.</div>'}}catch(e){}return r};
try{renderJob=window.renderJob}catch(e){}

function renderStable(j,force=false){if(liveOffer(j))stickyOffer=j;else if(j&&['Accepted','Trip Started'].includes(String(j.status)))stickyOffer=null;else if(!j&&stickyOffer&&!liveOffer(stickyOffer))stickyOffer=null;const show=j||((stickyOffer&&liveOffer(stickyOffer))?stickyOffer:null);const k=key(show);if(force||k!==lastKey||(!document.querySelector('#jobs .job')&&show)){lastKey=k;renderJob(show)}else if(!show&&lastKey!=='none'){lastKey='none';renderJob(null)}}

window.loadStatus=async function(force=false){
 clearTimeout(timer);if(!token())return show('login');if(pinModalOpen&&!force){timer=setTimeout(()=>loadStatus(false),POLL_MS);return}
 try{
  const d=await comCall('dashboard_status',{},true);current=d.partner;document.getElementById('vname').textContent='🛵 '+(current.name||'Vaahak');document.getElementById('vmeta').textContent=current.id+' • '+(current.vehicle||'')+' '+(current.vehicle_no||'');document.getElementById('approval').textContent=current.owner_approval||'—';document.getElementById('online').textContent=current.available?'ONLINE':'OFFLINE';document.getElementById('toggleBtn').textContent=current.available?'Go Offline':'Go Online';
  if(current.available)try{ensureGps()}catch(e){}
  let j=(d.jobs||[]).find(x=>x.assigned_partner_id===current.id&&['Accepted','Trip Started'].includes(String(x.status)))||null;
  if(!j&&current.available){try{const o=await dispatchCall('my_offer');j=o.job||null}catch(e){console.warn('Vaahak offer refresh',e)}}
  renderStable(j,force);if(current.available)try{ensureGps()}catch(e){};timer=setTimeout(()=>loadStatus(false),POLL_MS);
 }catch(x){if(/session/i.test(String(x.message||''))){localStorage.removeItem(TK);hardStop=true;nativeStop?.();hardStop=false;show('login');note('Session expired. Please login again.',false)}else{note('Dashboard update failed: '+x.message,false);timer=setTimeout(()=>loadStatus(false),4000)}}
};
try{loadStatus=window.loadStatus}catch(e){}

window.jobAction=async function(id,action){if(busy)return;busy=true;const buttons=[...document.querySelectorAll('#jobs button')];buttons.forEach(b=>b.disabled=true);try{if(action==='accept'){await dispatchCall('accept_offer',{jobId:id});stickyOffer=null;lastKey='';note('Request accepted. It is now locked to you.')}else if(action==='reject'){await dispatchCall('reject_offer',{jobId:id});stickyOffer=null;lastKey='';note('Request skipped. It has moved to the next-nearest eligible Vaahak.')}else return;await loadStatus(true)}catch(x){const m=String(x.message||'');note(m==='offer_expired'?'This offer expired and moved to the next Vaahak.':m==='job_not_offered_to_this_vaahak'?'This job is no longer in your offer queue.':'Job update failed: '+m,false);stickyOffer=null;lastKey='';await loadStatus(true)}finally{busy=false;buttons.forEach(b=>b.disabled=false)}};
try{jobAction=window.jobAction}catch(e){}

clearTimeout(timer);if(token())setTimeout(()=>loadStatus(true),80);
window.DBEST_VAAHAK_NEAREST_DISPATCH={version:VERSION,offerSeconds:90};
})();