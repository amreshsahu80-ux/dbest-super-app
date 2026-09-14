(()=>{
'use strict';
function readSession(){
  try{return JSON.parse(localStorage.getItem('d2_session')||'{"role":"visitor","id":""}')||{role:'visitor',id:''}}
  catch{return {role:'visitor',id:''}}
}
function isLoggedIn(){
  const s=readSession();
  return !!(s&&s.role&&s.role!=='visitor'&&s.id);
}
function hideBuildBadges(root=document){
  if(!isLoggedIn())return;
  if(root?.matches?.('.buildBadge'))root.style.setProperty('display','none','important');
  root?.querySelectorAll?.('.buildBadge').forEach(b=>b.style.setProperty('display','none','important'));
}

/* DBest session policy: no inactivity-based logout.
   A valid logged-in user remains signed in until the user explicitly chooses Logout
   or the application's authentication/session itself becomes invalid for another reason. */

document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible')hideBuildBadges();
});
window.addEventListener('storage',e=>{
  if(e.key==='d2_session')hideBuildBadges();
});

const observer=new MutationObserver(records=>{
  if(!isLoggedIn())return;
  for(const r of records){
    for(const n of r.addedNodes){
      if(n.nodeType!==1)continue;
      if(n.matches?.('.buildBadge')||n.querySelector?.('.buildBadge'))hideBuildBadges(n);
    }
  }
});
observer.observe(document.body||document.documentElement,{childList:true,subtree:true});
hideBuildBadges();
window.DBEST_SESSION_HARDENING={version:'2.0.0',idleLogout:false,reset:()=>{}};
})();