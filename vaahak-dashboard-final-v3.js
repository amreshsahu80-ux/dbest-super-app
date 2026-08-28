(function(){
'use strict';
const VERSION='3.0.0';
const cfg=window.DBEST_RUNTIME_CONFIG||{};
const BASE_URL=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const KEY=cfg.supabasePublishableKey||'';
const DISPATCH=BASE_URL+'/functions/v1/vaahak-dispatch-live';
const COM_URL=BASE_URL+'/functions/v1/vaahak-commerce-live';
const TK2='dbest_vaahak_live_token';
const POLL_MS=2500;
let lastKey='',sticky=null,countTimer=null,historyOpen=false,historyFilter='ride',historyCache=null,historyBusy=false;

function tok(){try{return localStorage.getItem(TK2)||''}catch(e){return''}}
function esc2(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function money(v){return '₹'+Math.round(Number(v||0)).toLocaleString('en-IN')}
function when(v){try{return v?new Date(v).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'—'}catch(e){return String(v||'—')}}
function hdr(){const h={'apikey':KEY,'Content-Type':'application/json','x-vaahak-token':tok()};if(String(KEY).startsWith('eyJ'))h.Authorization='Bearer '+KEY;return h}
async function dispatch(action,body={}){const r=await fetch(DISPATCH,{method:'POST',cache:'no-store',headers:hdr(),body:JSON.stringify({action,...body})});const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.error||'dispatch_failed');e.data=d;throw e}return d}
async function historyApi(){const r=await fetch(COM_URL,{method:'POST',cache:'no-store',headers:hdr(),body:JSON.stringify({action:'history',limit:100})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Unable to load history');return d}
function liveOffer(j){return !!(j&&j.status==='Open'&&j.offer_expires_at&&new Date(j.offer_expires_at).getTime()>Date.now())}
function jobKey(j){return j?`${j.id}|${j.status}|${j.assigned_partner_id||''}|${j.offered_partner_id||''}|${j.offer_expires_at||''}`:'none'}

function installCompactUi(){
 document.documentElement.classList.remove('dbestVaahakBooting');
 if(document.getElementById('dbestVaahakCompactStyle'))return;
 const s=document.createElement('style');s.id='dbestVaahakCompactStyle';s.textContent=`
 body .top{padding:10px 14px!important} body .top h2{font-size:20px!important;margin:0!important} body .top .wrap>div:not(:first-child){display:none!important}
 #dash>.card{padding:12px!important;margin:9px 0!important;border-radius:16px!important} #dash>.card:nth-of-type(2)>p.muted{display:none!important}
 #dash .stat{gap:6px!important;margin-top:8px!important} #dash .stat>div{padding:7px 9px!important} #dash .row{gap:6px!important;margin-top:8px!important}
 #dash .btn{padding:10px 12px!important;font-size:14px!important} #jobs .job{padding:11px!important} #jobs .rideMap{height:190px!important;margin-top:8px!important}
 #dbestVaahakHistoryCard{display:none;margin-top:9px!important} #dbestVaahakHistoryCard.open{display:block!important}
 #dbestVaahakHistoryList .job{margin-top:8px!important;padding:10px!important}
 @media(max-width:650px){#dash .row .btn{flex:1 1 auto}.top .wrap{padding:0!important}.wrap{padding:10px!important}}
 `;document.head.appendChild(s);
 const dash=document.getElementById('dash');if(!dash)return;
 const top=dash.querySelector('.card');const row=top?.querySelector('.row');
 if(row&&!document.getElementById('dbestRideHistoryBtn')){
   const ride=document.createElement('button');ride.type='button';ride.id='dbestRideHistoryBtn';ride.className='btn soft';ride.textContent='🚕 Rides';ride.onclick=()=>openHistory('ride');
   const del=document.createElement('button');del.type='button';del.id='dbestDeliveryHistoryBtn';del.className='btn soft';del.textContent='📦 Deliveries';del.onclick=()=>openHistory('delivery');
   const logout=[...row.querySelectorAll('button')].find(b=>/logout/i.test(b.textContent||''));row.insertBefore(ride,logout||null);row.insertBefore(del,logout||null);
 }
 if(!document.getElementById('dbestVaahakHistoryCard')){
   const card=document.createElement('div');card.id='dbestVaahakHistoryCard';card.className='card';card.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><h3 id="dbestHistoryTitle" style="margin:0">Ride History</h3><button type="button" class="btn soft" id="dbestHistoryClose">Close</button></div><div id="dbestVaahakHistoryList" style="margin-top:8px"></div>`;dash.appendChild(card);card.querySelector('#dbestHistoryClose').onclick=closeHistory;
 }
}

function startCountdown(j){clearInterval(countTimer);if(!liveOffer(j))return;const tick=()=>{const el=document.getElementById('dbestOfferCountdown');if(!el){clearInterval(countTimer);return}const sec=Math.max(0,Math.ceil((new Date(j.offer_expires_at).getTime()-Date.now())/1000));el.textContent=sec>0?`${sec}s`:'Expired';if(sec<=0)clearInterval(countTimer)};tick();countTimer=setInterval(tick,1000)}
const renderBase=typeof window.renderJob==='function'?window.renderJob:null;
function renderStable(j,force=false){
 if(liveOffer(j))sticky=j;else if(j&&['Accepted','Trip Started'].includes(String(j.status)))sticky=null;else if(!j&&sticky&&!liveOffer(sticky))sticky=null;
 const show=j||((sticky&&liveOffer(sticky))?sticky:null),k=jobKey(show);
 if(!force&&k===lastKey&&((show&&document.querySelector('#jobs .job'))||(!show&&!document.querySelector('#jobs .job'))))return;
 lastKey=k;
 if(renderBase)renderBase(show);else if(typeof renderJob==='function')renderJob(show);
 if(show&&liveOffer(show)){
   const card=document.querySelector('#jobs .job');if(card&&!document.getElementById('dbestOfferBanner')){
     const km=show.dispatch_distance_km==null?'':` • ${Number(show.dispatch_distance_km).toFixed(1)} km`;
     card.insertAdjacentHTML('afterbegin',`<div id="dbestOfferBanner" style="padding:9px 10px;margin-bottom:8px;border-radius:11px;background:#fff5df;border:1px solid #f0d79b;color:#79530a;font-weight:850">New ${show.kind==='delivery'?'Delivery':'Ride'}${km} <span style="float:right" id="dbestOfferCountdown"></span></div>`);
   }
   startCountdown(show);
 }
 if(!show&&typeof current!=='undefined'&&current?.available){const host=document.getElementById('jobs');if(host)host.innerHTML='<div class="gps">🟢 ONLINE • Waiting for a new request</div>'}
}

window.loadStatus=async function(force=false){
 try{clearTimeout(timer)}catch(e){}
 if(!tok())return typeof show==='function'&&show('login');
 if(typeof pinModalOpen!=='undefined'&&pinModalOpen&&!force){timer=setTimeout(()=>loadStatus(false),POLL_MS);return}
 try{
   const d=await comCall('dashboard_status',{},true);current=d.partner;
   installCompactUi();
   const n=document.getElementById('vname'),m=document.getElementById('vmeta'),a=document.getElementById('approval'),o=document.getElementById('online'),t=document.getElementById('toggleBtn');
   if(n)n.textContent='🛵 '+(current.name||'Vaahak');if(m)m.textContent=(current.vehicle||'')+(current.vehicle_no?' • '+current.vehicle_no:'');if(a)a.textContent=current.owner_approval||'—';if(o)o.textContent=current.available?'ONLINE':'OFFLINE';if(t)t.textContent=current.available?'Go Offline':'Go Online';
   if(current.available)try{ensureGps()}catch(e){}
   let j=(d.jobs||[]).find(x=>x.assigned_partner_id===current.id&&['Accepted','Trip Started'].includes(String(x.status)))||null;
   if(!j&&current.available){try{const r=await dispatch('my_offer');j=r.job||null}catch(e){console.warn('Vaahak dispatch',e)}}
   renderStable(j,force);
   timer=setTimeout(()=>loadStatus(false),POLL_MS);
 }catch(e){
   if(/session/i.test(String(e.message||''))){try{localStorage.removeItem(TK2)}catch(_){};typeof show==='function'&&show('login');typeof note==='function'&&note('Session expired. Please login again.',false)}
   else{typeof note==='function'&&note('Dashboard update failed: '+e.message,false);timer=setTimeout(()=>loadStatus(false),4000)}
 }
};
try{loadStatus=window.loadStatus}catch(e){}

window.jobAction=async function(id,action){
 if(typeof busy!=='undefined'&&busy)return;try{busy=true}catch(e){}
 const buttons=[...document.querySelectorAll('#jobs button')];buttons.forEach(b=>b.disabled=true);
 try{
   if(action==='accept'){await dispatch('accept_offer',{jobId:id});sticky=null;lastKey='';typeof note==='function'&&note('Accepted.')}else if(action==='reject'){await dispatch('reject_offer',{jobId:id});sticky=null;lastKey='';typeof note==='function'&&note('Skipped.')}else return;
   await loadStatus(true);
 }catch(e){const m=String(e.message||'');typeof note==='function'&&note(m==='offer_expired'?'Offer expired.':m==='job_not_offered_to_this_vaahak'?'This request moved to another Vaahak.':'Could not update: '+m,false);sticky=null;lastKey='';await loadStatus(true)}
 finally{try{busy=false}catch(e){};buttons.forEach(b=>b.disabled=false)}
};
try{jobAction=window.jobAction}catch(e){}

async function openHistory(type){historyFilter=type;historyOpen=true;installCompactUi();const card=document.getElementById('dbestVaahakHistoryCard');if(!card)return;card.classList.add('open');document.getElementById('dbestHistoryTitle').textContent=type==='delivery'?'📦 Delivery History':'🚕 Ride History';await loadHistory();setTimeout(()=>card.scrollIntoView({behavior:'smooth',block:'start'}),30)}
function closeHistory(){historyOpen=false;document.getElementById('dbestVaahakHistoryCard')?.classList.remove('open')}
async function loadHistory(){if(!historyOpen||historyBusy)return;historyBusy=true;const list=document.getElementById('dbestVaahakHistoryList');if(list)list.textContent='Loading…';try{historyCache=await historyApi();renderHistory()}catch(e){if(list)list.innerHTML='<div class="bad" style="padding:9px;border-radius:10px">'+esc2(e.message||'Unable to load history')+'</div>'}finally{historyBusy=false}}
function renderHistory(){const list=document.getElementById('dbestVaahakHistoryList');if(!list)return;const jobs=(Array.isArray(historyCache?.jobs)?historyCache.jobs:[]).filter(j=>j.kind===historyFilter);list.innerHTML=jobs.length?jobs.map(j=>`<div class="job"><div style="display:flex;justify-content:space-between;gap:8px"><b>${historyFilter==='delivery'?'📦 Delivery':'🚕 Ride'}</b><b style="color:#17633f">${money(j.partner_earning||0)}</b></div><div style="font-size:13px;margin-top:5px">${esc2(j.pickup)} → ${esc2(j.dropoff)}</div><div class="muted" style="font-size:11px;margin-top:4px">${when(j.completed_at||j.updated_at)}</div></div>`).join(''):'<div class="muted">No past '+(historyFilter==='delivery'?'deliveries':'rides')+'.</div>'}

installCompactUi();
try{clearTimeout(timer)}catch(e){}
setTimeout(()=>{installCompactUi();if(tok())loadStatus(true)},80);
window.DBEST_VAAHAK_FINAL={version:VERSION,offerSeconds:90,openHistory};
})();