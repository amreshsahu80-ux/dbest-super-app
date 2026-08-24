(function(){
'use strict';
const VERSION='1.0.0';
let busy=false;
function q(s){return document.querySelector(s)}
function qa(s){return Array.from(document.querySelectorAll(s))}
function toastMsg(m){try{if(typeof toast==='function')toast(m);else alert(m)}catch(e){alert(m)}}
function hideTransactions(hide){
  const btn=qa('button,a,div').find(x=>/Transactions/i.test((x.textContent||'').trim()) && getComputedStyle(x).position==='fixed');
  if(btn)btn.style.display=hide?'none':'';
}
async function proceed(){
  if(busy)return;
  const p=q('#dcxPickup'),d=q('#dcxDrop');
  if(!p||!d)return;
  if(!p.value.trim()||!d.value.trim())return toastMsg('Please select both pickup and drop first.');
  const api=window.DBEST_CAB_MAPPLS_RENTAL;
  if(!api||typeof api.calculate!=='function')return toastMsg('Cab fare engine is still loading. Please try again in a moment.');
  busy=true;
  const b=q('#dbestCabContinue');if(b){b.disabled=true;b.textContent='Calculating route & fare…'}
  try{
    await api.calculate();
    setTimeout(()=>{
      const list=q('#dcxVehicles');
      if(list&&list.classList.contains('show')){
        list.scrollIntoView({behavior:'smooth',block:'start'});
        const first=q('.dcxVeh');
        if(first) first.focus({preventScroll:true});
      }else{
        toastMsg('Please choose a Mappls suggestion or set the exact point on the map, then tap Continue again.');
      }
    },250);
  }catch(e){toastMsg(e?.message||'Could not calculate this route. Please verify pickup/drop.');}
  finally{busy=false;if(b){b.disabled=false;b.textContent='Continue → Vehicle & Fare'}}
}
function mountMappls(){
  const root=q('.dcx');
  if(!root)return false;
  hideTransactions(true);
  if(q('#dbestCabContinue'))return true;
  const drop=q('#dcxDrop');
  const field=drop?.closest('.dcxField');
  if(!field)return true;
  const wrap=document.createElement('div');
  wrap.id='dbestCabContinueWrap';
  wrap.innerHTML='<button type="button" id="dbestCabContinue">Continue → Vehicle & Fare</button><small>After fare calculation, tap a vehicle to open the booking confirmation page.</small>';
  field.insertAdjacentElement('afterend',wrap);
  q('#dbestCabContinue').onclick=proceed;
  if(!q('#dbest-cab-booking-flow-css')){
    const s=document.createElement('style');s.id='dbest-cab-booking-flow-css';s.textContent=`#dbestCabContinueWrap{margin:10px 0 12px}#dbestCabContinue{width:100%;border:0;border-radius:14px;padding:14px 12px;background:#175cff;color:#fff;font-weight:900;font-size:15px;box-shadow:0 8px 18px rgba(23,92,255,.22)}#dbestCabContinue:disabled{opacity:.65}#dbestCabContinueWrap small{display:block;text-align:center;color:#64748b;font-size:10px;margin-top:6px}.dcxVehicles{scroll-margin-top:90px}@media(max-width:700px){#dbestCabContinue{position:sticky;bottom:8px;z-index:1100}}`;document.head.appendChild(s)
  }
  return true;
}
function mountLegacy(){
  const page=q('.ridePage');
  if(!page)return false;
  hideTransactions(true);
  return true;
}
function tick(){
  const cab=mountMappls()||mountLegacy();
  if(!cab)hideTransactions(false);
}
new MutationObserver(tick).observe(document.documentElement,{childList:true,subtree:true});
setInterval(tick,700);
tick();
window.DBEST_CAB_BOOKING_FLOW_FIX={version:VERSION,proceed};
})();