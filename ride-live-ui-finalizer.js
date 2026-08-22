(function(){
'use strict';
const POLL=3000;
let timer=null,currentTx='';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function lang(){let x='en';try{x=localStorage.getItem('d2_lang')||'en'}catch(e){}if(x==='ta')x='te';return x}
const labels={
 en:{pin:'Ride PIN',waiting:'Waiting for an approved Vaahak…',assigned:'Assigned Vaahak',vehicle:'Vehicle',status:'Status'},
 hi:{pin:'राइड PIN',waiting:'स्वीकृत Vaahak का इंतज़ार है…',assigned:'नियुक्त Vaahak',vehicle:'वाहन',status:'स्थिति'},
 bn:{pin:'রাইড PIN',waiting:'অনুমোদিত Vaahak-এর অপেক্ষায়…',assigned:'নিযুক্ত Vaahak',vehicle:'যানবাহন',status:'স্ট্যাটাস'},
 or:{pin:'ରାଇଡ୍ PIN',waiting:'ଅନୁମୋଦିତ Vaahak ପାଇଁ ଅପେକ୍ଷା…',assigned:'ନିଯୁକ୍ତ Vaahak',vehicle:'ଯାନ',status:'ସ୍ଥିତି'},
 te:{pin:'రైడ్ PIN',waiting:'ఆమోదిత Vaahak కోసం వేచి ఉంది…',assigned:'కేటాయించిన Vaahak',vehicle:'వాహనం',status:'స్థితి'}
};
function t(){return labels[lang()]||labels.en}
function token(tx){try{return window.DBEST_VAAHAK_SECURITY?.getCustomerToken?.(tx)||''}catch(e){return''}}
function api(){return window.DBEST_VAAHAK_LIVE?.call}
function fallbackRename(){document.querySelectorAll('.ridePage .driverCard small').forEach(x=>{if(/^OTP$/i.test((x.textContent||'').trim()))x.textContent=t().pin});}
function setSteps(status){const steps=[...document.querySelectorAll('.ridePage .tripSteps .tripStep')];if(!steps.length)return;const s=String(status||'');let active=0;if(s==='Accepted')active=1;else if(s==='Trip Started')active=2;else if(s==='Completed')active=3;steps.forEach((el,i)=>{el.classList.toggle('done',i<active);el.classList.toggle('active',i===active&&s!=='Completed')});if(s==='Completed')steps.forEach(el=>el.classList.add('done'))}
function liveCard(d){const page=document.querySelector('.ridePage');if(!page||!d?.job)return;const L=t(),j=d.job,p=d.partner||null,pin=j.otp&&['Accepted','Trip Started'].includes(String(j.status))?String(j.otp):'';let box=document.getElementById('dbestRideLiveIdentityFinal');if(!box){box=document.createElement('div');box.id='dbestRideLiveIdentityFinal';box.style.cssText='margin:14px 0;background:#fff;border:1px solid #dfe7f2;border-radius:20px;padding:15px;box-shadow:0 10px 26px rgba(20,50,100,.08)';const map=page.querySelector('.rideMap');(map?.parentNode||page).insertBefore(box,map?.nextSibling||page.firstChild)}
 box.innerHTML=p?`<div style="display:grid;grid-template-columns:54px 1fr auto;gap:12px;align-items:center"><div style="width:54px;height:54px;border-radius:17px;background:#eef4ff;display:grid;place-items:center;font-size:28px">🛵</div><div><small style="display:block;color:#6b778c;font-weight:800">${esc(L.assigned)}</small><b style="display:block;font-size:19px;margin-top:2px">${esc(p.name||'Vaahak')}</b><small style="display:block;color:#687386;margin-top:4px">${esc(p.vehicle||'')} ${esc(p.vehicle_no||'')} ${p.rating?'• ⭐ '+esc(p.rating):''}</small><small style="display:block;color:#687386;margin-top:3px">${esc(L.status)}: ${esc(j.status||'')}</small></div>${pin?`<div style="text-align:right;min-width:82px"><small style="display:block;color:#687386;font-weight:800">${esc(L.pin)}</small><b style="display:block;font-size:28px;letter-spacing:2px;margin-top:2px">${esc(pin)}</b></div>`:''}</div>`:`<div style="font-weight:800">${esc(L.waiting)}</div><small style="display:block;color:#687386;margin-top:4px">${esc(L.status)}: ${esc(j.status||'Open')}</small>`;
 document.querySelectorAll('.ridePage .driverCard,.ridePage .vaahakStatusList,.ridePage .dispatchPending').forEach(x=>x.style.display='none');
 const old=document.getElementById('dbestLiveRideStatus');if(old)old.style.display='none';setSteps(j.status)
}
async function refresh(tx){fallbackRename();const tok=token(tx),call=api();if(!tok||typeof call!=='function')return;try{const d=await call('ride_status',{txId:String(tx),customerToken:tok});if(d?.job)liveCard(d);if(['Completed','Cancelled'].includes(String(d?.job?.status||'')))stop()}catch(e){fallbackRename()}}
function stop(){if(timer){clearInterval(timer);timer=null}}
function start(tx){stop();currentTx=String(tx||'');if(!currentTx)return;[80,350,900].forEach(ms=>setTimeout(()=>refresh(currentTx),ms));timer=setInterval(()=>refresh(currentTx),POLL)}
const old=window.rideStatusScreen;if(typeof old==='function')window.rideStatusScreen=function(tx){const r=old.apply(this,arguments);start(tx);return r};
const mo=new MutationObserver(()=>{if(document.querySelector('.ridePage'))fallbackRename();else stop()});mo.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('change',e=>{if(e.target?.id==='lang'&&currentTx)setTimeout(()=>refresh(currentTx),60)},true);
window.DBEST_RIDE_LIVE_UI_FINALIZER={version:'1.0.0',refresh:()=>currentTx&&refresh(currentTx)};
})();