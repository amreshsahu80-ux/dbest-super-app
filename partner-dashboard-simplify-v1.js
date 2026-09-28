(function(){
'use strict';
const VERSION='20260929-simplified-guard-v3';
function text(x){return String(x?.textContent||'').replace(/\s+/g,' ').trim()}
function vendor(){
 const dash=document.getElementById('dash');if(!dash||dash.classList.contains('hidden'))return;
 document.body.classList.add('vendorDashMode');
 const top=document.querySelector('.top');if(top)top.style.display='none';
 document.querySelectorAll('.vendorQuick,.navTabs,#sectionTabs').forEach(x=>x.style.setProperty('display','none','important'));
 const hero=dash.querySelector('.vendorHero');if(hero&&dash.firstElementChild!==hero)dash.insertBefore(hero,dash.firstElementChild);
 const keep=new Set([hero,document.getElementById('vendorMenuShade'),document.getElementById('vendorMenu'),document.getElementById('vendorBottom'),
   document.getElementById('panel-current'),document.getElementById('panel-catalogue'),document.getElementById('panel-history'),document.getElementById('panel-account')]);
 const identity=dash.querySelector('.dashHead')?.closest('.card');if(identity)keep.add(identity);
 [...dash.children].forEach(el=>{
   if(keep.has(el))return;
   const t=text(el),btns=el.querySelectorAll?.('button')?.length||0;
   if(btns>=3&&/Dashboard/i.test(t)&&/History/i.test(t)&&/Earnings/i.test(t)&&/Profile/i.test(t))el.style.setProperty('display','none','important');
 });
 document.querySelectorAll('body.vendorDashMode main .wrap > div,body.vendorDashMode main.wrap > div').forEach(el=>{
   if(el.closest('#dash,#vendorMenu,#vendorBottom'))return;
   const t=text(el),btns=el.querySelectorAll?.('button')?.length||0;
   if(btns>=3&&/Dashboard/i.test(t)&&/History/i.test(t)&&/Earnings/i.test(t)&&/Profile/i.test(t))el.style.setProperty('display','none','important');
 });
}
function vaahak(){
 const dash=document.getElementById('dash');if(!dash||dash.classList.contains('hidden'))return;
 document.querySelectorAll('.vhQuick,#dbestVaahakTabs,.dbv-tabs').forEach(x=>x.style.setProperty('display','none','important'));
 const menu=document.getElementById('vaahakMenu');
 ['dbestActivationCard','dbestWalletCard'].forEach(id=>{const x=document.getElementById(id);if(x&&dash.contains(x)&&menu)menu.appendChild(x)});
 document.querySelectorAll('#dbestVaahakAgreementSection,#dbestVaahakVisualStatus,#dbestVaahakPhotoBtn,#vaahakPhotoPickerLive').forEach(x=>x.remove());
 const kyc=document.querySelector('[data-dbest-kyc-self="vaahak"]');if(kyc&&dash.contains(kyc)&&menu?.querySelector('.menuList'))menu.querySelector('.menuList').appendChild(kyc);
 const driver=dash.querySelector('.driverMini');
 if(driver){
   [...driver.querySelectorAll('button')].forEach(b=>{if(/KYC Documents|Agreement Signed|Sign Vaahak Agreement|Add Photo|Photo$/i.test(text(b)))b.remove()});
   [...driver.children].forEach(ch=>{if(ch.classList?.contains('driverMiniMain'))return;if(ch.querySelector?.('#approval')||ch.querySelector?.('#online')||ch.id==='approval'||ch.id==='online')return;const t=text(ch);if(/KYC|Agreement|Activation|Owner Sign|Vaahak OTP|Secure/i.test(t))ch.remove()});
 }
 [...dash.children].forEach(el=>{
   if(el.matches?.('.vhDashHero,.driverMini,.jobCard,.vhBottom'))return;
   if(el.id==='dbestVaahakTabPanels')return;
   const t=text(el);
   if(/Activation\s*&\s*Agreement|Secure KYC Documents|KYC Documents|Agreement Signed|Owner OTP Sign|Vaahak OTP Sign|Identity Proof|Driving Licence|Vehicle RC|Vehicle Insurance|PUC|Pollution Certificate/i.test(t))el.remove();
 });
}
function run(){vendor();vaahak()}
let q=false;const queue=()=>{if(q)return;q=true;requestAnimationFrame(()=>{q=false;run()})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
setInterval(run,1200);
window.DBEST_PARTNER_DASHBOARD_SIMPLIFY={version:VERSION,run};
})();