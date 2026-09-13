(()=>{
'use strict';
const IDLE_MS=5*60*1000;
const ACTIVITY_THROTTLE_MS=1500;
let idleTimer=null;
let lastActivity=Date.now();
let lastHandledActivity=0;

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
function doLogout(){
  if(!isLoggedIn())return;
  try{
    if(typeof window.logout==='function')window.logout();
    else{
      localStorage.setItem('d2_session',JSON.stringify({role:'visitor',id:''}));
      location.href='/';
    }
  }catch(e){
    try{localStorage.setItem('d2_session',JSON.stringify({role:'visitor',id:''}))}catch(_){}
    location.href='/';
  }
}
function arm(){
  clearTimeout(idleTimer);
  if(!isLoggedIn())return;
  const remaining=Math.max(0,IDLE_MS-(Date.now()-lastActivity));
  idleTimer=setTimeout(doLogout,remaining);
}
function activity(force=false){
  if(!isLoggedIn())return;
  const now=Date.now();
  if(!force&&now-lastHandledActivity<ACTIVITY_THROTTLE_MS)return;
  lastHandledActivity=now;
  lastActivity=now;
  arm();
}
['pointerdown','touchstart','keydown','input','change'].forEach(evt=>{
  window.addEventListener(evt,()=>activity(false),{passive:true,capture:true});
});
let scrollTick=false;
window.addEventListener('scroll',()=>{
  if(scrollTick)return;
  scrollTick=true;
  setTimeout(()=>{scrollTick=false;activity(false)},800);
},{passive:true,capture:true});

document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'){
    if(isLoggedIn()&&Date.now()-lastActivity>=IDLE_MS)doLogout();
    else arm();
    hideBuildBadges();
  }
});
window.addEventListener('storage',e=>{
  if(e.key==='d2_session'){
    lastActivity=Date.now();
    arm();
    hideBuildBadges();
  }
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
arm();
window.DBEST_SESSION_HARDENING={version:'1.2.0',idleMs:IDLE_MS,reset:()=>activity(true)};
})();