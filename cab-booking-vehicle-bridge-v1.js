(function(){
'use strict';
const UPI_ID='7004630311@icici';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const q=s=>document.querySelector(s);
const say=m=>{try{typeof toast==='function'?toast(m):alert(m)}catch(e){alert(m)}};
function vehicles(){try{return typeof rideConfig!=='undefined'&&Array.isArray(rideConfig.vehicles)?rideConfig.vehicles:[]}catch(e){return[]}}
function fare(v,km){try{return typeof rideFare==='function'?rideFare(v,km):Math.round(Math.max(v.minFare||0,(v.base||45)+(v.perKm||14)*km))}catch(e){return Math.round(45+14*km)}}
function riderLabel(){try{if(typeof rideDraft==='undefined')return'Myself';return rideDraft.bookedForOther?`${rideDraft.riderName||'Rider'} • ${rideDraft.riderMobile||''}`:'Myself'}catch(e){return'Myself'}}
function whenLabel(){try{if(typeof rideDraft==='undefined'||rideDraft.scheduleMode!=='later'||!rideDraft.scheduledAt)return'Ride Now';return new Date(rideDraft.scheduledAt).toLocaleString('en-IN')}catch(e){return'Ride Now'}}
function renderVehicles(){
  const km=Number((typeof rideDraft!=='undefined'&&rideDraft.distance)||6),vs=vehicles();
  if(typeof sectionScreen!=='function'||typeof sectionTopBar!=='function')return say('Booking screen unavailable.');
  sectionScreen(`${sectionTopBar('🚕 Choose Vehicle',`${km.toFixed(1)} km estimated`,`openRidePlatform()`)}<div class="sectionContent"><div style="max-width:760px;margin:auto;padding-bottom:36px"><div style="background:#fff;border:1px solid #dfe7f4;border-radius:20px;padding:14px;box-shadow:0 10px 28px rgba(20,50,100,.08)">${vs.map(v=>`<button type="button" data-dbest-cab-v="${esc(v.id)}" style="width:100%;display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:9px;border:1px solid #dfe7f4;background:#fff;border-radius:15px;padding:11px;text-align:left;margin-bottom:8px"><span style="font-size:23px">${esc(v.icon||'🚕')}</span><span><b>${esc(v.name||v.id)}</b><small style="display:block;color:#718096">${Number(v.seats||4)} seats • est. pickup ${Number(v.eta||5)}–${Number(v.eta||5)+3} min</small></span><span style="font-weight:950">₹${Math.round(fare(v,km))}</span></button>`).join('')||'<div>No vehicles configured.</div>'}</div></div></div>`);
  document.querySelectorAll('[data-dbest-cab-v]').forEach(b=>b.onclick=()=>renderConfirm(b.dataset.dbestCabV));
}
function upiUri(amount){const p=new URLSearchParams({pa:UPI_ID,pn:'Sarwashreshth Services OPC Pvt. Ltd.',am:Number(amount).toFixed(2),cu:'INR',tn:'DBest Cab Booking'});return'upi://pay?'+p.toString()}
function renderConfirm(id){
  const v=vehicles().find(x=>String(x.id)===String(id));if(!v)return;
  try{if(typeof rideDraft!=='undefined')rideDraft.selected=id}catch(e){}
  const km=Number((typeof rideDraft!=='undefined'&&rideDraft.distance)||6),amt=Math.round(fare(v,km));
  sectionScreen(`${sectionTopBar(`${esc(v.icon||'🚗')} Confirm ${esc(v.name)}`,`${km.toFixed(1)} km • ₹${amt}`,`DBEST_CAB_STABLE.renderVehicles()`)}<div class="sectionContent"><div style="max-width:760px;margin:auto"><div style="background:#fff;border:1px solid #dfe7f4;border-radius:20px;padding:14px"><div><b>Pickup</b><div>${esc((typeof rideDraft!=='undefined'&&rideDraft.pickup)||'')}</div></div><div style="margin-top:8px"><b>Drop</b><div>${esc((typeof rideDraft!=='undefined'&&rideDraft.drop)||'')}</div></div><div style="margin-top:8px"><b>When</b><div>${esc(whenLabel())}</div></div><div style="margin-top:8px"><b>Rider</b><div>${esc(riderLabel())}</div></div><div style="margin:12px 0;padding:13px;border:1px solid #c9dcff;border-radius:15px;background:#f5f9ff"><b>📲 Direct UPI Payment</b><div style="margin:6px 0">Pay <b>₹${amt}</b> to <b>${UPI_ID}</b></div><button type="button" id="dbestCabUpi" style="width:100%;border:0;border-radius:13px;padding:13px;background:#175cff;color:#fff;font-weight:900">Pay ₹${amt} with UPI App</button><small style="display:block;margin-top:7px;color:#687386">Booking remains payment-pending until the credit is verified.</small></div><button type="button" id="dbestCabCash" style="width:100%;border:1px solid #d9e2ef;border-radius:13px;padding:12px;background:#fff;color:#233653;font-weight:900">Book & Pay on Trip</button></div></div></div>`);
  q('#dbestCabUpi').onclick=()=>{location.href=upiUri(amt)};
  q('#dbestCabCash').onclick=()=>{try{const f=document.createElement('form');f.innerHTML='<input name="payment" value="cash">';if(typeof bookRide==='function')return bookRide({preventDefault(){},target:f},id)}catch(e){}say('Could not confirm ride. Please try again.')};
}
window.DBEST_CAB_STABLE={version:'preview-booking-bridge-v1',upiId:UPI_ID,renderVehicles,renderConfirm};
})();