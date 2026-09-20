(function(){
'use strict';
const V='20260920-owner-floating-actions-v1';
if(window.DBEST_OWNER_FLOATING_ACTIONS?.version===V)return;

const rightStack=[
  ['dbestOwnerReportsFloatingV2',14],
  ['dbestOwnerWhatsAppSetup',72],
  ['dbestOwnerPushBtn',130],
  ['dbestOwnerDeployFloatingV2',188]
];

function isOwner(){
  try{
    return location.pathname.toLowerCase()==='/owner' &&
      !!(sessionStorage.getItem('dbest_owner_session_token') ||
         window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.() ||
         (typeof session!=='undefined'&&session?.role==='owner'));
  }catch(_){return false}
}

function apply(){
  if(!isOwner())return;
  rightStack.forEach(([id,bottom])=>{
    const el=document.getElementById(id);
    if(!el)return;
    Object.assign(el.style,{
      position:'fixed',
      right:'14px',
      left:'auto',
      bottom:bottom+'px',
      zIndex:'2147482000',
      maxWidth:'calc(100vw - 28px)',
      whiteSpace:'nowrap'
    });
  });
  const push=document.getElementById('dbestPushEnable');
  if(push){
    Object.assign(push.style,{
      position:'fixed',
      left:'12px',
      right:'auto',
      bottom:'14px',
      zIndex:'2147482000',
      maxWidth:'calc(50vw - 18px)',
      whiteSpace:'nowrap'
    });
  }

  // Remove known obsolete duplicate launchers if a newer launcher exists.
  if(document.getElementById('dbestOwnerReportsFloatingV2')){
    document.getElementById('dbestOwnerReportsFloating')?.remove();
    document.getElementById('dbestOwnerReportsProminent')?.remove();
  }
}

const mo=new MutationObserver(()=>requestAnimationFrame(apply));
mo.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style']});
window.addEventListener('resize',apply);
window.addEventListener('orientationchange',apply);
setInterval(apply,1200);
setTimeout(apply,100);
setTimeout(apply,500);
setTimeout(apply,1500);

window.DBEST_OWNER_FLOATING_ACTIONS={version:V,refresh:apply};
})();