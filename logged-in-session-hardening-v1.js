(()=>{
'use strict';
const IDLE_MS=5*60*1000;
let idleTimer=null;
let lastActivity=Date.now();

function readSession(){
  try{return JSON.parse(localStorage.getItem('d2_session')||'{"role":"visitor","id":""}')||{role:'visitor',id:''}}
  catch{return {role:'visitor',id:''}}
}
function isLoggedIn(){
  const s=readSession();
  return !!(s&&s.role&&s.role!=='visitor'&&s.id);
}
function hideVersionBadge(){
  document.querySelectorAll('.sectionTop').forEach(top=>{
    const title=String(top.querySelector('.sectionTitle b')?.textContent||'').trim().toLowerCase();
    if(title.includes('my account')){
      const badge=top.querySelector('.buildBadge');
      if(badge)badge.style.setProperty('display','none','important');
    }
  });
}
function doLogout(){
  if(!isLoggedIn())return;
  try{
    if(typeof window.logout==='function'){
      window.logout();
    }else{
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
  const elapsed=Date.now()-lastActivity;
  const remaining=Math.max(0,IDLE_MS-elapsed);
  idleTimer=setTimeout(doLogout,remaining);
}
function activity(){
  if(!isLoggedIn())return;
  lastActivity=Date.now();
  arm();
}
['pointerdown','touchstart','keydown','input','change','scroll'].forEach(evt=>{
  window.addEventListener(evt,activity,{passive:true,capture:true});
});
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'){
    if(isLoggedIn()&&Date.now()-lastActivity>=IDLE_MS)doLogout();
    else arm();
  }
});
window.addEventListener('storage',e=>{if(e.key==='d2_session')arm()});

const observer=new MutationObserver(()=>{hideVersionBadge();arm()});
observer.observe(document.documentElement,{childList:true,subtree:true});
hideVersionBadge();
arm();
window.DBEST_SESSION_HARDENING={version:'1.0.0',idleMs:IDLE_MS,reset:activity};
})();
