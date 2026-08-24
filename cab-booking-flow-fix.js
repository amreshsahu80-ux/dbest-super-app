(function(){
'use strict';
const VERSION='2.0.0';
let busy=false;
const CFG=window.DBEST_RUNTIME_CONFIG||{};
function q(s){return document.querySelector(s)}
function qa(s){return Array.from(document.querySelectorAll(s))}
function toastMsg(m){try{if(typeof toast==='function')toast(m);else alert(m)}catch(e){alert(m)}}
function delay(ms){return new Promise(r=>setTimeout(r,ms))}
function hideTransactions(hide){
  const btn=qa('button,a,div').find(x=>/Transactions/i.test((x.textContent||'').trim()) && getComputedStyle(x).position==='fixed');
  if(btn)btn.style.display=hide?'none':'';
}
function currentMode(){
  return String(window.__DBEST_CAB_MODE||q('.dcxTabs [data-dcx-tab].on')?.dataset.dcxTab||'ride').toLowerCase()==='rental'?'rental':'ride';
}
function rentalPack(){
  const id=q('.dbestStablePack.on')?.dataset.pkg||q('.dcxPack.on')?.dataset.pkg||'4h40';
  const packs={
    '2h20':{id:'2h20',label:'2 Hours / 20 km',hours:2,km:20},
    '4h40':{id:'4h40',label:'4 Hours / 40 km',hours:4,km:40},
    '8h80':{id:'8h80',label:'8 Hours / 80 km',hours:8,km:80},
    '12h120':{id:'12h120',label:'12 Hours / 120 km',hours:12,km:120}
  };
  return packs[id]||packs['4h40'];
}
async function fetchWithTimeout(url,opt={},ms=6500){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
  try{return await fetch(url,{...opt,signal:c.signal})}finally{clearTimeout(t)}
}
async function resolveLocation(text){
  text=String(text||'').trim();
  if(!text)throw new Error('Location is blank.');
  const supa=String(CFG.supabaseUrl||'').replace(/\/$/,''),key=String(CFG.supabasePublishableKey||'');
  if(supa&&key){
    try{
      const r=await fetchWithTimeout(supa+'/functions/v1/location-search-live',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({q:text})},5000);
      const j=await r.json().catch(()=>({}));
      const x=Array.isArray(j.results)?j.results[0]:null;
      const lat=Number(x?.lat),lng=Number(x?.lon??x?.lng);
      if(Number.isFinite(lat)&&Number.isFinite(lng))return{lat,lng,label:x.label||x.name||text};
    }catch(e){}
  }
  try{
    const u=new URL('https://nominatim.openstreetmap.org/search');
    u.searchParams.set('format','jsonv2');u.searchParams.set('countrycodes','in');u.searchParams.set('limit','1');u.searchParams.set('q',text);
    const r=await fetchWithTimeout(u.toString(),{headers:{'Accept-Language':'en'}},5000);
    const a=await r.json();const x=a?.[0],lat=Number(x?.lat),lng=Number(x?.lon);
    if(Number.isFinite(lat)&&Number.isFinite(lng))return{lat,lng,label:x.display_name||text};
  }catch(e){}
  throw new Error('Could not resolve this location. Please select a suggestion or set the point on map.');
}
function haversine(a,b){
  const R=6371,rad=x=>x*Math.PI/180,dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng);
  const z=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(z),Math.sqrt(1-z));
}
async function fallbackRoute(a,b){
  try{
    const u=`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`;
    const r=await fetchWithTimeout(u,{},6500),j=await r.json(),x=j?.routes?.[0];
    if(r.ok&&x){const km=Math.max(.3,Number(x.distance||0)/1000);return{km,min:Math.max(2,Math.round(Number(x.duration||0)/60)),source:'Road route fallback'}}
  }catch(e){}
  const km=Math.max(.5,haversine(a,b)*1.25);
  return{km,min:Math.max(3,Math.round(km/28*60+5)),source:'Estimated road route'};
}
function vehicles(){try{return typeof rideConfig!=='undefined'&&Array.isArray(rideConfig.vehicles)?rideConfig.vehicles:[]}catch(e){return[]}}
function fare(v,km){try{return typeof rideFare==='function'?rideFare(v,km):Math.round(Math.max(v?.minFare||0,(v?.base||45)+(v?.perKm||14)*km))}catch(e){return Math.round(45+14*km)}}
function syncDraftFallback(pText,dText,p,d,r){
  try{
    if(typeof rideDraft==='undefined')return;
    const mode=currentMode(),pk=rentalPack();
    rideDraft.pickup=pText;rideDraft.drop=dText;
    rideDraft.pickupCoords={lat:p.lat,lng:p.lng};rideDraft.dropCoords={lat:d.lat,lng:d.lng};
    rideDraft.bookingType=mode==='rental'?'Rental':'Ride';rideDraft.rental=mode==='rental';
    rideDraft.rentalPackage=mode==='rental'?{id:pk.id,label:pk.label,hours:pk.hours,includedKm:pk.km}:null;
    rideDraft.distance=mode==='rental'?pk.km:r.km;
    rideDraft.estimatedMinutes=mode==='rental'?pk.hours*60:r.min;
  }catch(e){}
}
function renderFallbackVehicles(pText,dText,p,d,r){
  const box=q('#dcxVehicles'),list=q('#dcxList');if(!box||!list)return false;
  const vs=vehicles(),mode=currentMode(),pk=rentalPack(),billKm=mode==='rental'?pk.km:r.km;
  if(!vs.length){list.innerHTML='<div class="dcxHint">Vehicle options are loading. Please tap Continue again.</div>';box.classList.add('show');return false}
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  list.innerHTML=vs.map(v=>`<button type="button" class="dcxVeh" data-fallback-v="${esc(v.id)}"><span class="dcxIcon">${esc(v.icon||'🚕')}</span><span><b>${esc(v.name||v.id)}</b><small>${mode==='rental'?esc(pk.label)+' included':'Road trip • '+r.min+' min estimated'}</small></span><span class="dcxFare">₹${Math.round(fare(v,billKm))}</span></button>`).join('');
  list.querySelectorAll('[data-fallback-v]').forEach(b=>b.onclick=()=>{
    syncDraftFallback(pText,dText,p,d,r);
    try{if(typeof rideDraft!=='undefined')rideDraft.selected=b.dataset.fallbackV}catch(e){}
    if(typeof confirmRide==='function')return confirmRide(b.dataset.fallbackV);
    toastMsg('Booking confirmation is temporarily unavailable.');
  });
  const distance=q('#dcxDistance'),travel=q('#dcxTravel'),from=q('#dcxFare'),type=q('#dcxRouteType');
  if(distance)distance.textContent=mode==='rental'?r.km.toFixed(1)+' km route':r.km.toFixed(1)+' km';
  if(travel)travel.textContent=mode==='rental'?pk.hours+' hr package':r.min+' min';
  if(from)from.textContent='₹'+Math.round(Math.min(...vs.map(v=>fare(v,billKm))));
  if(type)type.textContent=mode==='rental'?pk.km+' km included':r.source;
  q('#dcxStats')?.classList.add('show');box.classList.add('show');
  syncDraftFallback(pText,dText,p,d,r);
  return true;
}
async function robustFallback(pText,dText){
  const [p,d]=await Promise.all([resolveLocation(pText),resolveLocation(dText)]);
  const r=await fallbackRoute(p,d);
  if(!renderFallbackVehicles(pText,dText,p,d,r))throw new Error('Vehicle options are still loading. Please tap Continue again.');
  return true;
}
async function proceed(){
  if(busy)return;
  const p=q('#dcxPickup'),d=q('#dcxDrop');
  if(!p||!d)return;
  const pText=p.value.trim(),dText=d.value.trim();
  if(!pText||!dText)return toastMsg('Please select both pickup and drop first.');
  busy=true;
  const b=q('#dbestCabContinue');if(b){b.disabled=true;b.textContent='Calculating route & fare…'}
  try{
    const api=window.DBEST_CAB_MAPPLS_RENTAL;
    if(api&&typeof api.calculate==='function'){
      try{await Promise.race([Promise.resolve(api.calculate()),delay(4500)])}catch(e){}
      await delay(250);
    }
    let list=q('#dcxVehicles');
    if(!(list&&list.classList.contains('show')&&q('.dcxVeh'))){
      if(b)b.textContent='Using backup road route…';
      await robustFallback(pText,dText);
      list=q('#dcxVehicles');
    }
    if(list&&list.classList.contains('show')){
      list.scrollIntoView({behavior:'smooth',block:'start'});
      const first=q('.dcxVeh');if(first)first.focus({preventScroll:true});
      toastMsg('Fare calculated. Select a vehicle to continue to booking.');
    }else throw new Error('Could not load vehicle options. Please try again.');
  }catch(e){toastMsg(e?.message||'Could not calculate this route. Please verify pickup/drop.');}
  finally{busy=false;if(b){b.disabled=false;b.textContent='Continue → Vehicle & Fare'}}
}
function mountMappls(){
  const root=q('.dcx');
  if(!root)return false;
  hideTransactions(true);
  let b=q('#dbestCabContinue');
  if(!b){
    const drop=q('#dcxDrop'),field=drop?.closest('.dcxField');
    if(!field)return true;
    const wrap=document.createElement('div');wrap.id='dbestCabContinueWrap';
    wrap.innerHTML='<button type="button" id="dbestCabContinue">Continue → Vehicle & Fare</button><small>We will calculate the route, show vehicle fares, then open booking confirmation after vehicle selection.</small>';
    field.insertAdjacentElement('afterend',wrap);b=q('#dbestCabContinue');
  }
  if(b&&!b.dataset.robustBound){b.dataset.robustBound='1';b.onclick=proceed}
  if(!q('#dbest-cab-booking-flow-css')){
    const s=document.createElement('style');s.id='dbest-cab-booking-flow-css';s.textContent=`#dbestCabContinueWrap{margin:10px 0 12px}#dbestCabContinue{width:100%;border:0;border-radius:14px;padding:14px 12px;background:#175cff;color:#fff;font-weight:900;font-size:15px;box-shadow:0 8px 18px rgba(23,92,255,.22)}#dbestCabContinue:disabled{opacity:.65}#dbestCabContinueWrap small{display:block;text-align:center;color:#64748b;font-size:10px;margin-top:6px}.dcxVehicles{scroll-margin-top:90px}@media(max-width:700px){#dbestCabContinue{position:sticky;bottom:8px;z-index:1100}}`;document.head.appendChild(s)
  }
  return true;
}
function mountLegacy(){const page=q('.ridePage');if(!page)return false;hideTransactions(true);return true}
function tick(){const cab=mountMappls()||mountLegacy();if(!cab)hideTransactions(false)}
new MutationObserver(tick).observe(document.documentElement,{childList:true,subtree:true});
setInterval(tick,500);tick();
window.DBEST_CAB_BOOKING_FLOW_FIX={version:VERSION,proceed};
})();