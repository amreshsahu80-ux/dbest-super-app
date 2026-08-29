(function(){
'use strict';
const VERSION='1.0.0';
if(window.DBEST_CAB_OTHER_RIDER?.version===VERSION)return;
const VEHICLE={id:'erickshaw',name:'E-Rickshaw',icon:'🛺',base:28,perKm:10,minFare:40,eta:4,seats:3};
const q=s=>document.querySelector(s);
const msg=m=>{try{typeof toast==='function'?toast(m):alert(m)}catch(e){alert(m)}};
function txById(id){try{if(Array.isArray(window.txs))return window.txs.find(x=>String(x.id)===String(id));if(typeof txs!=='undefined'&&Array.isArray(txs))return txs.find(x=>String(x.id)===String(id))}catch(e){}return null}
function riderFromTx(id){const x=txById(id),r=x?.ride||x?.meta?.ride||{};return r?.riderFor==='other'&&r?.riderName&&r?.riderMobile?{name:String(r.riderName),mobile:String(r.riderMobile)}:null}
function ensureVehicle(){
  try{
    if(typeof rideConfig==='undefined'||!rideConfig||!Array.isArray(rideConfig.vehicles))return false;
    if(!rideConfig.vehicles.some(v=>String(v.id).toLowerCase()==='erickshaw')){
      const autoIndex=rideConfig.vehicles.findIndex(v=>String(v.id).toLowerCase()==='auto');
      if(autoIndex>=0)rideConfig.vehicles.splice(autoIndex,0,{...VEHICLE});else rideConfig.vehicles.push({...VEHICLE});
      try{localStorage.setItem('d2_ride_config',JSON.stringify(rideConfig))}catch(e){}
      try{typeof save==='function'&&save()}catch(e){}
    }
    return true;
  }catch(e){return false}
}
function css(){if(q('#dbest-other-rider-css'))return;const s=document.createElement('style');s.id='dbest-other-rider-css';s.textContent=`
.dbestRiderCard{margin:12px 0;padding:11px;border:1px solid #dfe7f2;border-radius:15px;background:#f8faff}.dbestRiderTop{display:flex;justify-content:space-between;align-items:center;gap:8px}.dbestRiderTop b{font-size:13px}.dbestRiderToggle{display:flex;gap:5px}.dbestRiderToggle button{border:1px solid #dbe4f1;background:#fff;color:#52627a;border-radius:999px;padding:7px 10px;font-size:11px;font-weight:900}.dbestRiderToggle button.on{background:#175cff;color:#fff;border-color:#175cff}.dbestRiderFields{display:none;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.dbestRiderFields.show{display:grid}.dbestRiderFields input{width:100%;border:1px solid #d7e1ef;border-radius:11px;padding:10px 11px;font-size:13px;background:#fff}.dbestRiderHint{display:none;margin-top:7px;font-size:10px;color:#657389}.dbestRiderHint.show{display:block}@media(max-width:520px){.dbestRiderTop{align-items:flex-start;flex-direction:column}.dbestRiderToggle{width:100%}.dbestRiderToggle button{flex:1}.dbestRiderFields{grid-template-columns:1fr}}
`;document.head.appendChild(s)}
function setMode(card,mode){
  card.dataset.riderMode=mode;
  card.querySelectorAll('[data-rider-mode]').forEach(b=>b.classList.toggle('on',b.dataset.riderMode===mode));
  card.querySelector('.dbestRiderFields')?.classList.toggle('show',mode==='other');
  card.querySelector('.dbestRiderHint')?.classList.toggle('show',mode==='other');
  const m=card.querySelector('input[name="riderMode"]');if(m)m.value=mode;
}
function injectRider(){
  css();
  const form=q('.ridePage form[onsubmit*="bookRide"]');if(!form||form.querySelector('.dbestRiderCard'))return false;
  const card=document.createElement('div');card.className='dbestRiderCard';card.dataset.riderMode='self';
  let prev={};try{if(typeof rideDraft!=='undefined')prev=rideDraft||{}}catch(e){}
  card.innerHTML=`<input type="hidden" name="riderMode" value="${prev.riderFor==='other'?'other':'self'}"><div class="dbestRiderTop"><b>👤 Who is riding?</b><div class="dbestRiderToggle"><button type="button" data-rider-mode="self">Myself</button><button type="button" data-rider-mode="other">Someone else</button></div></div><div class="dbestRiderFields"><input name="riderName" autocomplete="name" placeholder="Rider name" value="${String(prev.riderName||'').replace(/"/g,'&quot;')}"><input name="riderMobile" inputmode="numeric" autocomplete="tel" placeholder="Rider mobile" value="${String(prev.riderMobile||'').replace(/"/g,'&quot;')}"></div><div class="dbestRiderHint">Share the Ride PIN with the rider after booking.</div>`;
  const payment=form.querySelector('.paymentChoice');form.insertBefore(card,payment||form.firstChild);
  card.querySelectorAll('[data-rider-mode]').forEach(b=>b.onclick=()=>setMode(card,b.dataset.riderMode));
  setMode(card,prev.riderFor==='other'?'other':'self');return true;
}
function normalizeMobile(v){let d=String(v||'').replace(/\D/g,'');if(d.length===12&&d.startsWith('91'))d=d.slice(2);return d}
let baseConfirm=null,baseBook=null,baseCreateJob=null;
function patchConfirm(){
  if(typeof window.confirmRide!=='function')return false;
  if(window.confirmRide.__dbestOtherRider)return true;
  baseConfirm=window.confirmRide;
  const wrap=function(){const out=baseConfirm.apply(this,arguments);[0,30,100].forEach(ms=>setTimeout(injectRider,ms));return out};
  wrap.__dbestOtherRider=true;window.confirmRide=wrap;return true;
}
function patchBook(){
  if(typeof window.bookRide!=='function')return false;
  if(window.bookRide.__dbestOtherRider)return true;
  baseBook=window.bookRide;
  const wrap=function(e,vehicleId){
    const form=e?.target,fd=form?new FormData(form):new FormData(),mode=String(fd.get('riderMode')||'self');
    let name='',mobile='';
    if(mode==='other'){
      name=String(fd.get('riderName')||'').trim();mobile=normalizeMobile(fd.get('riderMobile'));
      if(!name){e?.preventDefault?.();msg('Please enter the rider name.');return}
      if(mobile.length!==10){e?.preventDefault?.();msg('Please enter a valid 10-digit rider mobile number.');return}
    }
    try{if(typeof rideDraft!=='undefined'){rideDraft.riderFor=mode;rideDraft.riderName=name;rideDraft.riderMobile=mobile;rideDraft.bookedForOther=mode==='other'}}catch(err){}
    const oldAdd=window.addTx;
    if(typeof oldAdd==='function'){
      window.addTx=function(userId,service,item,amount,status,reference,meta){
        if(meta&&meta.flow==='ride')meta={...meta,ride:{...(meta.ride||{}),riderFor:mode,riderName:name,riderMobile:mobile,bookedForOther:mode==='other'}};
        return oldAdd.call(this,userId,service,item,amount,status,reference,meta);
      };
    }
    try{return baseBook.apply(this,arguments)}finally{if(typeof oldAdd==='function')window.addTx=oldAdd}
  };
  wrap.__dbestOtherRider=true;window.bookRide=wrap;return true;
}
function patchLocalJob(){
  if(typeof window.createVaahakJobFromTx!=='function')return false;
  if(window.createVaahakJobFromTx.__dbestOtherRider)return true;
  baseCreateJob=window.createVaahakJobFromTx;
  const wrap=function(txId,kind){const job=baseCreateJob.apply(this,arguments);try{const r=riderFromTx(txId);if(job&&r){job.customerName=r.name;job.customerMobile=r.mobile;typeof save==='function'&&save()}}catch(e){}return job};
  wrap.__dbestOtherRider=true;window.createVaahakJobFromTx=wrap;return true;
}
function patchFetch(){
  if(window.fetch.__dbestOtherRider)return;
  const raw=window.fetch.bind(window);
  const wrap=async function(input,init){
    try{
      const method=String(init?.method||'GET').toUpperCase();
      if(method==='POST'&&init?.body){const body=JSON.parse(String(init.body));if(body?.action==='create_ride'&&body?.txId){const r=riderFromTx(body.txId);if(r){body.customerName=r.name;body.customerMobile=r.mobile;body.bookedForOther=true;init={...init,body:JSON.stringify(body)}}}}
    }catch(e){}
    return raw(input,init);
  };
  wrap.__dbestOtherRider=true;window.fetch=wrap;
}
function mount(){ensureVehicle();patchConfirm();patchBook();patchLocalJob();patchFetch();injectRider()}
[0,100,300,700,1400,2600].forEach(ms=>setTimeout(mount,ms));setInterval(()=>{ensureVehicle();patchConfirm();patchBook();patchLocalJob()},2500);
new MutationObserver(()=>{if(q('.ridePage'))setTimeout(injectRider,0)}).observe(document.documentElement,{childList:true,subtree:true});
window.DBEST_CAB_OTHER_RIDER={version:VERSION,vehicle:VEHICLE,mount};
})();