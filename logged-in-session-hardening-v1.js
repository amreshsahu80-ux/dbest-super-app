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

/* DBest session policy: lock the shared logged-in shell after 5 minutes of inactivity.
   This uses one resettable timeout and no polling loop. */
const IDLE_MS=5*60*1000;
let idleTimer=0;
function idleLogout(){
  if(!isLoggedIn())return;
  try{localStorage.setItem('d2_session',JSON.stringify({role:'visitor',id:''}))}catch(_){}
  try{window.dispatchEvent(new CustomEvent('dbest:idle-logout'))}catch(_){}
  try{window.dispatchEvent(new CustomEvent('dbest:member-session-invalid'))}catch(_){}
  try{location.href='/'}catch(_){}
}
function resetIdle(){
  if(idleTimer)clearTimeout(idleTimer);
  if(isLoggedIn())idleTimer=setTimeout(idleLogout,IDLE_MS);
}
for(const ev of ['pointerdown','keydown','touchstart'])window.addEventListener(ev,resetIdle,{passive:true});
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'){hideBuildBadges();resetIdle()}
});
window.addEventListener('storage',e=>{
  if(e.key==='d2_session'){hideBuildBadges();resetIdle()}
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
resetIdle();
window.DBEST_SESSION_HARDENING={version:'3.0.0',idleLogout:true,idleMs:IDLE_MS,reset:resetIdle};
})();