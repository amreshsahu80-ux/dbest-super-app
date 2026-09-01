(function(){
'use strict';
const VERSION='20260901-1540-v6';
const q=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const say=m=>{try{typeof toast==='function'?toast(m):alert(m)}catch(e){alert(m)}};
const VEHICLES=[
  {id:'bike',icon:'🏍️',name:'Bike',seats:1,base:35,perKm:8,min:45,eta:3},
  {id:'auto',icon:'🛺',name:'Auto / E-Rickshaw',seats:3,base:45,perKm:12,min:60,eta:4},
  {id:'mini',icon:'🚕',name:'Mini Cab',seats:4,base:65,perKm:15,min:90,eta:5},
  {id:'suv',icon:'🚙',name:'SUV',seats:6,base:110,perKm:22,min:150,eta:7}
];
function css(){if(q('#dbest-cab-v6-css'))return;const s=document.createElement('style');s.id='dbest-cab-v6-css';s.textContent=`.dbv6{max-width:760px;margin:auto;padding:14px 10px 34px}.dbv6Card{background:#fff;border:1px solid #dfe7f4;border-radius:18px;padding:14px;box-shadow:0 10px 28px rgba(20,50,100,.08)}.dbv6Route{padding:11px;border-radius:13px;background:#f7faff;border:1px solid #dce6f4;margin-bottom:12px}.dbv6Veh{width:100%;display:grid;grid-template-columns:44px 1fr auto;gap:10px;align-items:center;text-align:left;border:1px solid #dfe7f4;background:#fff;border-radius:15px;padding:12px;margin:8px 0}.dbv6Veh:active{transform:scale(.995)}.dbv6Icon{font-size:25px}.dbv6Fare{font-weight:950}.dbv6Btn{width:100%;border:0;border-radius:14px;padding:14px;background:#175cff;color:#fff;font-weight:900;margin-top:12px}.dbv6Back{width:100%;border:1px solid #d7e1ef;border-radius:14px;padding:12px;background:#fff;font-weight:850;margin-top:8px}.dbv6Row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.dbv6Box{padding:10px;border:1px solid #e0e7f2;border-radius:13px;background:#fafcff}.dbv6Box small{display:block;color:#728098;font-size:10px}.dbv6Box b{display:block;margin-top:3px}@media(max-width:560px){.dbv6Row{grid-template-columns:1fr}.dbv6Veh{grid-template-columns:40px 1fr auto}}`;document.head.appendChild(s)}
function km(){const d=Number(window.rideDraft&&window.rideDraft.distance);return Number.isFinite(d)&&d>0?d:6}
function fare(v,k){return Math.round(Math.max(v.min,v.base+v.perKm*k))}
function contextFromMappls(){
  const pickup=(q('#dmcPickup')?.value||'').trim();
  const drop=(q('#dmcDrop')?.value||'').trim();
  if(!pickup||!drop){say('Please select pickup and drop.');return null}
  const scheduleLater=q('[data-dmc-s="later"]')?.classList.contains('on');
  const scheduledAt=q('#dmcScheduleAt')?.value||'';
  const other=q('[data-dmc-r="other"]')?.classList.contains('on');
  const riderName=(q('#dmcRiderName')?.value||'').trim();
  const riderMobile=(q('#dmcRiderMobile')?.value||'').replace(/\D/g,'').slice(0,10);
  if(scheduleLater&&!scheduledAt){say('Please select schedule date and time.');return null}
  if(other&&(!riderName||riderMobile.length!==10)){say('Please enter rider name and 10-digit mobile.');return null}
  const rental=q('[data-dmc-tab="rental"]')?.classList.contains('on');
  const rp=(q('#dmcRentalPackage')?.value||'2|20').split('|').map(Number);
  const c={pickup,drop,rental,rentalHours:rp[0]||2,rentalKm:rp[1]||20,scheduleMode:scheduleLater?'later':'now',scheduledAt:scheduledAt||'',riderMode:other?'other':'self',riderName,riderMobile};
  window.DBEST_CAB_PREVIEW_CONTEXT=c;
  try{if(window.rideDraft){Object.assign(window.rideDraft,{pickup,drop,bookingType:rental?'Rental':'Ride',rental,rentalHours:c.rentalHours,rentalKm:c.rentalKm,scheduleMode:c.scheduleMode,scheduledAt:c.scheduledAt,riderFor:c.riderMode,bookedForOther:other,riderName,riderMobile,distance:rental?c.rentalKm:km()})}}catch(e){}
  return c;
}
function renderVehicles(c){css();const k=c.rental?c.rentalKm:km();sectionScreen(`${sectionTopBar('🚕 Choose Vehicle',c.rental?`${c.rentalHours} hr / ${c.rentalKm} km rental`:`${k.toFixed(1)} km estimated`,`DBEST_CAB_MAPPLS_CONSOLIDATED.open()`)}<div class="sectionContent"><div class="dbv6"><div class="dbv6Route"><b>${esc(c.pickup)}</b><div style="color:#718096;margin:4px 0">↓</div><b>${esc(c.drop)}</b></div><div class="dbv6Card"><b>Select your ride</b>${VEHICLES.map(v=>`<button type="button" class="dbv6Veh" data-db-v6="${v.id}"><span class="dbv6Icon">${v.icon}</span><span><b>${v.name}</b><small style="display:block;color:#718096">${v.seats} seat${v.seats>1?'s':''} • ${v.eta}–${v.eta+3} min</small></span><span class="dbv6Fare">₹${fare(v,k)}</span></button>`).join('')}</div></div></div>`);document.querySelectorAll('[data-db-v6]').forEach(b=>b.onclick=()=>renderConfirm(c,b.dataset.dbV6))}
function renderConfirm(c,id){const v=VEHICLES.find(x=>x.id===id);if(!v)return;const k=c.rental?c.rentalKm:km(),amt=fare(v,k);try{if(window.rideDraft)window.rideDraft.selected=id}catch(e){}sectionScreen(`${sectionTopBar(`${v.icon} Confirm ${v.name}`,`₹${amt} estimated`,`DBEST_CAB_PREVIEW_V6.renderVehicles()`)}<div class="sectionContent"><div class="dbv6"><div class="dbv6Card"><div class="dbv6Row"><div class="dbv6Box"><small>Pickup</small><b>${esc(c.pickup)}</b></div><div class="dbv6Box"><small>Drop</small><b>${esc(c.drop)}</b></div><div class="dbv6Box"><small>When</small><b>${c.scheduleMode==='later'?esc(new Date(c.scheduledAt).toLocaleString('en-IN')):'Ride Now'}</b></div><div class="dbv6Box"><small>Rider</small><b>${c.riderMode==='other'?esc(c.riderName+' • '+c.riderMobile):'Myself'}</b></div></div><div style="margin-top:14px;font-size:22px;font-weight:950">₹${amt}</div><small style="color:#718096">Estimated fare • final fare may vary by actual trip</small><button type="button" id="dbv6Book" class="dbv6Btn">Proceed to Book ${v.name}</button><button type="button" id="dbv6Change" class="dbv6Back">Change Vehicle</button></div></div></div>`);q('#dbv6Change').onclick=()=>renderVehicles(c);q('#dbv6Book').onclick=()=>{try{if(typeof window.bookRide==='function'){const f=document.createElement('form');f.innerHTML='<input name="payment" value="cash">';window.bookRide({preventDefault(){},target:f},id);return}}catch(e){}say('Booking screen is connected. Final ride submission is being linked next.')};}
function continueNow(e){const t=e.target&&e.target.closest?e.target.closest('#dmcGo'):null;if(!t)return;const c=contextFromMappls();if(!c)return;e.preventDefault();e.stopImmediatePropagation();renderVehicles(c)}
document.addEventListener('click',continueNow,true);
window.DBEST_CAB_PREVIEW_V6={version:VERSION,renderVehicles:function(){const c=window.DBEST_CAB_PREVIEW_CONTEXT;if(c)renderVehicles(c)},renderConfirm};
})();