(function(){
'use strict';
const VERSION='1.0.0',POLL=3500;
let customerTimer=null,vaahakTimer=null,currentTx='';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const digits=s=>String(s||'').replace(/\D/g,'');
function lang(){let x='en';try{x=localStorage.getItem('d2_lang')||'en'}catch(e){}if(x==='ta')x='te';return x}
const T={
 en:{callVaahak:'Call Vaahak',callCustomer:'Call Customer',vaahakMobile:'Vaahak Mobile',customerMobile:'Customer Mobile'},
 hi:{callVaahak:'Vaahak को कॉल करें',callCustomer:'ग्राहक को कॉल करें',vaahakMobile:'Vaahak मोबाइल',customerMobile:'ग्राहक मोबाइल'},
 bn:{callVaahak:'Vaahak-কে কল করুন',callCustomer:'গ্রাহককে কল করুন',vaahakMobile:'Vaahak মোবাইল',customerMobile:'গ্রাহক মোবাইল'},
 or:{callVaahak:'Vaahak କୁ କଲ୍ କରନ୍ତୁ',callCustomer:'ଗ୍ରାହକଙ୍କୁ କଲ୍ କରନ୍ତୁ',vaahakMobile:'Vaahak ମୋବାଇଲ୍',customerMobile:'ଗ୍ରାହକ ମୋବାଇଲ୍'},
 te:{callVaahak:'Vaahak కి కాల్ చేయండి',callCustomer:'కస్టమర్‌కు కాల్ చేయండి',vaahakMobile:'Vaahak మొబైల్',customerMobile:'కస్టమర్ మొబైల్'}
};
const tr=()=>T[lang()]||T.en;
function css(){if(document.getElementById('dbest-ride-contact-css'))return;const s=document.createElement('style');s.id='dbest-ride-contact-css';s.textContent=`
.dbestRideContact{margin-top:10px;padding:10px 12px;border:1px solid #dce7f4;border-radius:14px;background:#f8fbff;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.dbestRideContactInfo small{display:block;color:#6b778c;font-size:10px;font-weight:800}.dbestRideContactInfo b{display:block;margin-top:2px;font-size:15px;letter-spacing:.2px}
.dbestCallBtn{display:inline-flex;align-items:center;justify-content:center;gap:7px;text-decoration:none;background:#176b42;color:#fff!important;border-radius:12px;padding:10px 13px;font-weight:900;font-size:12px;box-shadow:0 5px 12px rgba(23,107,66,.18)}
`;document.head.appendChild(s)}
function contactHtml(mobile,label,button){const n=digits(mobile);if(n.length<10)return'';const display=String(mobile||n);return `<div class="dbestRideContact"><div class="dbestRideContactInfo"><small>${esc(label)}</small><b>${esc(display)}</b></div><a class="dbestCallBtn" href="tel:${esc(n)}">📞 ${esc(button)}</a></div>`}
function customerToken(tx){try{return window.DBEST_VAAHAK_SECURITY?.getCustomerToken?.(tx)||''}catch(e){return''}}
async function refreshCustomer(tx){if(!document.querySelector('.ridePage'))return;const tok=customerToken(tx),call=window.DBEST_VAAHAK_LIVE?.call;if(!tok||typeof call!=='function')return;try{const d=await call('ride_status',{txId:String(tx),customerToken:tok});const j=d?.job,p=d?.partner;if(!j||!p||!['Accepted','Trip Started'].includes(String(j.status)))return document.getElementById('dbestCustomerCallContact')?.remove();const n=digits(p.mobile);if(n.length<10)return;let host=document.getElementById('dbestRideLiveIdentityFinal')||document.getElementById('dbestCustomerLiveTrackingMeta')||document.querySelector('.ridePage .rideMap');if(!host)return;let box=document.getElementById('dbestCustomerCallContact');if(!box){box=document.createElement('div');box.id='dbestCustomerCallContact';host.insertAdjacentElement('afterend',box)}const l=tr();box.innerHTML=contactHtml(p.mobile,l.vaahakMobile,l.callVaahak)}catch(e){}}
function startCustomer(tx){currentTx=String(tx||'');if(customerTimer)clearInterval(customerTimer);if(!currentTx)return;setTimeout(()=>refreshCustomer(currentTx),180);customerTimer=setInterval(()=>{if(document.querySelector('.ridePage'))refreshCustomer(currentTx);else{clearInterval(customerTimer);customerTimer=null}},POLL)}
async function refreshVaahak(){if(!document.getElementById('dbestVaahakStableRoot'))return;const call=window.DBEST_VAAHAK_LIVE?.call;if(typeof call!=='function')return;try{const d=await call('status',{}, {vaahak:true}),v=d?.partner,jobs=d?.jobs||[],l=tr();if(!v)return;jobs.forEach(j=>{if(j.assigned_partner_id!==v.id||!['Accepted','Trip Started'].includes(String(j.status)))return;const n=digits(j.customer_mobile);if(n.length<10)return;const card=[...document.querySelectorAll('.vhJob')].find(x=>String(x.textContent||'').includes(String(j.id)));if(!card)return;let box=card.querySelector('[data-dbest-customer-call]');if(!box){box=document.createElement('div');box.dataset.dbestCustomerCall='1';const pin=card.querySelector('.vhPinBox');if(pin)pin.insertAdjacentElement('beforebegin',box);else card.appendChild(box)}box.innerHTML=contactHtml(j.customer_mobile,l.customerMobile,l.callCustomer)})}catch(e){}}
function startVaahak(){if(vaahakTimer)clearInterval(vaahakTimer);setTimeout(refreshVaahak,200);vaahakTimer=setInterval(()=>{if(document.getElementById('dbestVaahakStableRoot'))refreshVaahak();else{clearInterval(vaahakTimer);vaahakTimer=null}},POLL)}
css();
const oldRide=window.rideStatusScreen;if(typeof oldRide==='function')window.rideStatusScreen=function(tx){const r=oldRide.apply(this,arguments);startCustomer(tx);return r};
const oldDash=window.vaahakDashboard;if(typeof oldDash==='function')window.vaahakDashboard=function(){const r=oldDash.apply(this,arguments);startVaahak();return r};
const mo=new MutationObserver(()=>{if(document.getElementById('dbestVaahakStableRoot')&&!vaahakTimer)startVaahak();if(currentTx&&document.querySelector('.ridePage')&&!customerTimer)startCustomer(currentTx)});mo.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('change',e=>{if(e.target?.id==='lang'){if(currentTx)refreshCustomer(currentTx);refreshVaahak()}},true);
window.DBEST_RIDE_CONTACT_CALLS={version:VERSION,refreshCustomer:()=>currentTx&&refreshCustomer(currentTx),refreshVaahak};
})();