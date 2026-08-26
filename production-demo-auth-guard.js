(function(){
'use strict';
const DEMO_VENDORS=new Set(['VGR001','VRS001','VDG001','VMD001']);
const DEMO_VAAHAK=new Set(['VHK1001','VHK1002','VHK1003','VHK1004']);
const msg=m=>{try{typeof toast==='function'?toast(m):alert(m)}catch(e){alert(m)}};
function value(form,names){try{const f=new FormData(form);for(const n of names){const v=String(f.get(n)||'').trim().toUpperCase();if(v)return v}}catch(e){}return ''}
function installVendor(){
  const fn=window.vendorLogin;if(typeof fn!=='function'||fn.__dbestDemoGuard)return;
  const wrapped=async function(e){const id=value(e?.target,['vendorId','login','id']);if(DEMO_VENDORS.has(id)){e?.preventDefault?.();msg('Demo Vendor accounts are disabled on the live platform. Please use a registered Vendor account.');return false}return fn.apply(this,arguments)};
  wrapped.__dbestDemoGuard=true;window.vendorLogin=wrapped;
}
function installVaahak(){
  const fn=window.vaahakPortalLogin;if(typeof fn!=='function'||fn.__dbestDemoGuard)return;
  const wrapped=async function(e){const id=value(e?.target,['id','login','vaahakId']);if(DEMO_VAAHAK.has(id)){e?.preventDefault?.();msg('Demo Vaahak accounts are disabled on the live platform. Please use a registered Vaahak account.');return false}return fn.apply(this,arguments)};
  wrapped.__dbestDemoGuard=true;window.vaahakPortalLogin=wrapped;
}
function scrubDemoSessions(){
  try{const s=JSON.parse(localStorage.getItem('d2_vendor_session')||'null');if(s&&DEMO_VENDORS.has(String(s.vendorId||'').toUpperCase()))localStorage.removeItem('d2_vendor_session')}catch(e){}
}
function install(){installVendor();installVaahak();scrubDemoSessions()}
[0,250,700,1500,3000].forEach(ms=>setTimeout(install,ms));
document.addEventListener('click',()=>setTimeout(install,20),true);
window.DBEST_PRODUCTION_DEMO_AUTH_GUARD={version:'1.0.0',install};
})();