(function(){
'use strict';
const V='20260906-cab-ui-cleanup-v1';
if(window.DBEST_CAB_UI_CLEANUP?.version===V)return;
function apply(){
  const b=document.getElementById('cab6Gps');
  if(!b)return;
  b.textContent='◎';
  b.setAttribute('aria-label','Use current location');
  b.setAttribute('title','Use current location');
  b.style.flex='0 0 44px';
  b.style.width='44px';
  b.style.padding='8px';
  b.style.fontSize='18px';
}
new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',()=>setTimeout(apply,0),true);
[0,100,300,700,1500,3000].forEach(ms=>setTimeout(apply,ms));
window.DBEST_CAB_UI_CLEANUP={version:V,apply};
})();