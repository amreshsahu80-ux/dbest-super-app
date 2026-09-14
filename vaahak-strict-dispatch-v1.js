(function(){
'use strict';
if(!/\/vaahak-standalone-v2\.html\/?$/i.test(location.pathname))return;
if(window.DBEST_VAAHAK_STRICT_DISPATCH?.version==='1.1.0')return;
const C=window.DBEST_RUNTIME_CONFIG||{},B=String(C.supabaseUrl||'').replace(/\/$/,''),K=C.supabasePublishableKey||'';
const DIS=B+'/functions/v1/vaahak-dispatch-live',COM2=B+'/functions/v1/vaahak-commerce-live',LOC2=B+'/functions/v1/vaahak-location-live',TOK='dbest_vaahak_live_token';
let pollTimer=null,gpsId=null,lastGpsSend=0,actionBusy=false;
const tok=()=>{try{return localStorage.getItem(TOK)||''}catch(_){return''}};
function hdr(auth=true){const h={'apikey':K,'Content-Type':'application/json','Authorization':'Bearer '+K};if(auth&&tok())h['x-vaahak-token']=tok();return h}
async function post(url,action,body={}){const r=await fetch(url,{method:'POST',cache:'no-store',headers:hdr(true),body:JSON.stringify({action,...body})});const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.error||'Request failed');e.data=d;throw e}return d}
function clearJob(){try{currentJob=null}catch(_){ }try{renderJob(null)}catch(_){const h=document.getElementById('jobs');if(h){h.className='empty';h.textContent='No live requests.'}}}
function startWaitingGps(on){if(!on){if(gpsId!=null&&navigator.geolocation){try{navigator.geolocation.clearWatch(gpsId)}catch(_){ }gpsId=null}return}if(gpsId!=null||!navigator.geolocation)return;gpsId=navigator.geolocation.watchPosition(async p=>{const now=Date.now();if(now-lastGpsSend<4000)return;lastGpsSend=now;try{await post(LOC2,'update_location',{lat:p.coords.latitude,lng:p.coords.longitude,heading:p.coords.heading,speed:p.coords.speed,accuracy:p.coords.accuracy})}catch(_){ }},()=>{}, {enableHighAccuracy:true,timeout:15000,maximumAge:2000})}
async function strictLoad(force=false){
 clearTimeout(pollTimer);
 if(!tok()){clearJob();try{return show('login')}catch(_){return}}
 if(typeof pinModalOpen!=='undefined'&&pinModalOpen&&!force){pollTimer=setTimeout(()=>strictLoad(false),2000);return}
 try{
  const d=await post(COM2,'dashboard_status',{}),p=d.partner||{};
  try{current=p}catch(_){ }
  const by=id=>document.getElementById(id);
  if(by('vname'))by('vname').textContent='🛵 '+(p.name||'Vaahak');
  if(by('vmeta'))by('vmeta').textContent=(p.id||'')+' • '+(p.vehicle||'')+' '+(p.vehicle_no||'');
  if(by('approval'))by('approval').textContent=p.owner_approval||'—';
  if(by('online'))by('online').textContent=p.available?'ONLINE':'OFFLINE';
  if(by('toggleBtn'))by('toggleBtn').textContent=p.available?'Go Offline':'Go Online';
  if(by('globalStatus')){by('globalStatus').textContent=p.available?'ONLINE':'OFFLINE';by('globalStatus').classList.toggle('on',!!p.available)}
  startWaitingGps(!!p.available);
  let offer=null;
  if(p.available&&p.owner_approval==='Approved'){
   try{offer=await post(DIS,'my_offer',{})}catch(e){if(e.message==='vaahak_session_invalid')throw e}
  }
  const job=offer?.job||null;
  if(!job)clearJob();else try{renderJob(job)}catch(_){const host=by('jobs');if(host){host.className='empty';host.textContent='Live request available.'}}
  pollTimer=setTimeout(()=>strictLoad(false),2000);
 }catch(e){
  clearJob();
  if(/session/i.test(String(e.message||''))){try{localStorage.removeItem(TOK);show('login')}catch(_){}}
  else pollTimer=setTimeout(()=>strictLoad(false),3000);
 }
}
async function strictAction(id,action){if(actionBusy)return;actionBusy=true;try{const a=action==='accept'?'accept_offer':action==='reject'?'reject_offer':action;await post(DIS,a,{jobId:id});try{note(action==='accept'?'Job accepted.':'Request skipped.')}catch(_){ }await strictLoad(true)}catch(e){try{note('Job update failed: '+e.message,false)}catch(_){ }await strictLoad(true)}finally{actionBusy=false}}
try{window.loadStatus=strictLoad;window.jobAction=strictAction}catch(_){ }
setTimeout(()=>strictLoad(true),100);
window.addEventListener('dbest:vaahak-job-finished',()=>{clearJob();strictLoad(true)});
window.DBEST_VAAHAK_STRICT_DISPATCH={version:'1.1.0',refresh:()=>strictLoad(true),clear:clearJob};
})();