(function(){
'use strict';
const VERSION='1.0.0';
const cfg=window.DBEST_RUNTIME_CONFIG||{};
const BASE=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const KEY=cfg.supabasePublishableKey||'';
const REST=BASE+'/rest/v1/rpc/';
const TK='dbest_vaahak_live_token';
if(!BASE||!KEY)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'₹'+Math.round(Number(v||0)).toLocaleString('en-IN');
function token(){try{return localStorage.getItem(TK)||''}catch(e){return''}}
function ownerToken(){try{return window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.()||''}catch(e){return''}}
function headers(){const h={'apikey':KEY,'Content-Type':'application/json'};if(String(KEY).startsWith('eyJ'))h.Authorization='Bearer '+KEY;return h}
async function rpc(name,body={}){const r=await fetch(REST+name,{method:'POST',cache:'no-store',headers:headers(),body:JSON.stringify(body)});let d={};try{d=await r.json()}catch(e){}if(!r.ok){const msg=String(d.message||d.error||'request_failed');throw new Error(msg.includes('vaahak_session_invalid')?'vaahak_session_invalid':msg.includes('owner_session_invalid')?'owner_session_invalid':msg)}return d}
function notify(m){try{typeof toast==='function'?toast(m):alert(m)}catch(e){alert(m)}}

async function getStatus(){const t=token();if(!t)throw new Error('vaahak_session_invalid');return rpc('get_vaahak_freedom_status',{p_token:t})}
async function getModel(){return rpc('get_vaahak_economy_model',{})}

function driverHost(){
  const standalone=document.querySelector('#dash:not(.hidden)');
  if(standalone)return standalone;
  const sections=[...document.querySelectorAll('.sectionContent')].filter(x=>!x.classList.contains('ownerMasterPage'));
  return sections.find(x=>/Vaahak/i.test(x.textContent||'')&&(/ONLINE|OFFLINE|Live Ride|Delivery Requests/i.test(x.textContent||'')))||null;
}
function workModeLine(label,sub,id,checked){return `<label style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #e5ebf5"><span><b>${esc(label)}</b><small style="display:block;color:#64748b;margin-top:2px">${esc(sub)}</small></span><input id="${id}" type="checkbox" ${checked?'checked':''} style="width:20px;height:20px"></label>`}
function driverCard(d){const p=d.partner||{},t=d.today||{},s=d.services||{},m=d.model||{};return `<div id="dbestFreedomCard" class="card vhCard" style="margin:12px 0;border:1px solid #cfe0ff;border-radius:18px;padding:15px;background:linear-gradient(135deg,#f7fbff,#ffffff);box-shadow:0 8px 22px rgba(25,70,140,.07)">
  <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap"><div><small style="font-weight:900;color:#175cff">DBEST VAAHAK FREEDOM</small><h3 style="margin:4px 0 3px">100% Ride Fare • No Job, No Fee</h3><small style="color:#64748b">${esc(p.vehicle||'Vaahak')} active-day fee: <b>${money(d.dailyFee)}</b> • charged once only after the first completed Ride/Delivery of the day.</small></div><span style="background:#e8f8ef;color:#146b3d;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:900">0% RIDE COMMISSION</span></div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px"><div style="padding:10px;border-radius:12px;background:#f4f7fb"><small>Today Gross</small><b style="display:block;font-size:17px">${money(t.grossEarnings)}</b></div><div style="padding:10px;border-radius:12px;background:#f4f7fb"><small>DBest Fee</small><b style="display:block;font-size:17px">${money(t.platformFee)}</b></div><div style="padding:10px;border-radius:12px;background:#f4f7fb"><small>Today Net</small><b style="display:block;font-size:17px">${money(t.netEarnings)}</b></div></div>
  <div style="margin-top:12px"><b>Choose Work Mode</b>${workModeLine('Passenger Rides','Cab • Auto • Bike • E-Rickshaw • Rental / Intercity','dbestModeRides',s.rides!==false)}${workModeLine('Marketplace Delivery','Grocery • Food • Medicine • Marketplace orders','dbestModeDelivery',s.marketplace!==false)}</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="mini btn" type="button" onclick="saveDBestVaahakWorkModes()">Save Work Mode</button><button class="mini" type="button" onclick="DBEST_VAAHAK_FREEDOM.refresh()">Refresh Earnings</button></div>
  <small style="display:block;margin-top:9px;color:#64748b">One Vaahak account can work across rides and deliveries. Delivery payout remains separate from customer order value.</small>
</div>`}
async function injectDriver(force=false){const host=driverHost();if(!host||!token())return;let old=document.getElementById('dbestFreedomCard');if(old&&!force)return;try{const d=await getStatus();old?.remove();const wrap=document.createElement('div');wrap.innerHTML=driverCard(d);const card=wrap.firstElementChild;const anchor=host.querySelector('.vhStatus,.stat,.vhCard,.card');if(anchor&&anchor.parentElement===host)anchor.insertAdjacentElement('afterend',card);else host.prepend(card)}catch(e){if(e.message==='vaahak_session_invalid')document.getElementById('dbestFreedomCard')?.remove()}}
window.saveDBestVaahakWorkModes=async function(){const rides=!!document.getElementById('dbestModeRides')?.checked,delivery=!!document.getElementById('dbestModeDelivery')?.checked;try{await rpc('update_vaahak_work_modes',{p_token:token(),p_rides:rides,p_delivery:delivery});notify('Vaahak work mode saved.');await injectDriver(true)}catch(e){notify(e.message==='vaahak_session_invalid'?'Please login again.':'Unable to save work mode: '+e.message)}};

function ownerForm(model){const f=model.dailyFees||{};const field=(label,key,val)=>`<div class="f"><label>${esc(label)}</label><input name="${key}" type="number" min="0" max="1000" step="1" value="${Number(val||0)}"></div>`;return `<div id="dbestFreedomOwnerCard" class="ownerPanelCard" style="margin-bottom:14px"><h3>🚕 DBest Vaahak Freedom Model</h3><div class="notice" style="margin-bottom:10px"><b>100% ride fare goes to Vaahak.</b> DBest charges only one active-day fee after the first completed Ride/Delivery. If there is no completed job, platform fee is ₹0.</div><form class="form" onsubmit="saveDBestVaahakFreedomEconomy(event)"><div class="grid">${field('Bike / Scooty ₹ per active day','bike',f.bike)}${field('E-Rickshaw ₹ per active day','e_rickshaw',f.e_rickshaw)}${field('Auto ₹ per active day','auto',f.auto)}${field('Car / Cab ₹ per active day','car',f.car)}${field('SUV ₹ per active day','suv',f.suv)}<div class="f full"><button class="btn">Save Active-Day Fees</button></div></div></form><small style="display:block;margin-top:8px;color:#64748b">Ride commission is locked at 0%. Marketplace delivery payout is controlled separately in the existing Delivery Payout setting.</small></div>`}
async function injectOwner(force=false){const host=document.querySelector('.sectionContent.ownerMasterPage');if(!host||!ownerToken())return;let old=document.getElementById('dbestFreedomOwnerCard');if(old&&!force)return;try{const model=await getModel();old?.remove();const wrap=document.createElement('div');wrap.innerHTML=ownerForm(model);const card=wrap.firstElementChild;const anchor=document.getElementById('liveVaahakOwnerList')||host.firstElementChild;if(anchor)host.insertBefore(card,anchor);else host.prepend(card)}catch(e){console.warn('DBest freedom owner UI',e)}}
window.saveDBestVaahakFreedomEconomy=async function(e){e.preventDefault();const f=new FormData(e.target),fees={};for(const k of ['bike','e_rickshaw','auto','car','suv'])fees[k]=Number(f.get(k)||0);try{await rpc('owner_update_vaahak_economy',{p_owner_token:ownerToken(),p_daily_fees:fees});notify('DBest Vaahak active-day fees saved.');await injectOwner(true)}catch(err){notify(err.message==='owner_session_invalid'?'Owner security session expired. Please verify OTP.':'Unable to save Vaahak economy: '+err.message)}};

let wrappedOwner=null;
function wrapOwner(){const fn=window.ownerVaahakControl;if(typeof fn!=='function'||fn===wrappedOwner||fn.__dbestFreedomWrapped)return;const base=fn;const next=function(){const r=base.apply(this,arguments);Promise.resolve(r).finally(()=>setTimeout(()=>injectOwner(true),120));return r};next.__dbestFreedomWrapped=true;window.ownerVaahakControl=next;try{ownerVaahakControl=next}catch(e){}wrappedOwner=next;}
let lastDriverRefresh=0;
function scan(){wrapOwner();const h=driverHost();if(h&&token()&&Date.now()-lastDriverRefresh>5000){lastDriverRefresh=Date.now();injectDriver(false)}if(document.querySelector('.sectionContent.ownerMasterPage'))injectOwner(false)}
const obs=new MutationObserver(()=>setTimeout(scan,30));obs.observe(document.documentElement,{childList:true,subtree:true});
setInterval(scan,2500);setTimeout(scan,400);
window.DBEST_VAAHAK_FREEDOM={version:VERSION,refresh:()=>injectDriver(true),getModel,getStatus,injectOwner};
})();