(function(){
'use strict';
const VERSION='1.0.0';
function patch(){
  document.querySelectorAll('.notice').forEach(n=>{
    const t=String(n.textContent||'');
    if(/Actual file bytes are not yet stored in DBest secure storage/i.test(t)){
      n.innerHTML='<b>Secure document status:</b> Actual submitted files are stored in DBest private secure storage when secure upload completes. Use the <b>🔐 Secure Documents</b> option on the request to open time-limited private links. Older legacy requests may contain filename/metadata only.';
    }
  });
}
function install(){
  const raw=window.openServiceRequestQueue;
  if(typeof raw==='function'&&!raw.__dbestSecureDocWording){
    const wrapped=async function(){const out=await raw.apply(this,arguments);setTimeout(patch,60);setTimeout(patch,300);return out};
    wrapped.__dbestSecureDocWording=true;wrapped.__dbestOriginal=raw;window.openServiceRequestQueue=wrapped;
  }
  patch();
}
[0,250,900].forEach(ms=>setTimeout(install,ms));
window.DBEST_SERVICE_SECURE_DOC_STATUS={version:VERSION,install,patch};
})();