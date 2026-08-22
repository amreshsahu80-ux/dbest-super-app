(function(){
'use strict';
const VERSION='1.0.0';
let pinFreeze=false,resumeTimer=null;

function isStable(){return !!document.getElementById('dbestVaahakStableRoot')}
function isPinInput(el){return !!(el&&el.matches&&el.matches('[data-vh-pin-input]'))}
function stopStable(){try{window.DBEST_VAAHAK_STABLE_DASHBOARD?.stop?.()}catch(e){}}
function resumeStable(){
  clearTimeout(resumeTimer);
  if(pinFreeze)return;
  try{if(isStable())window.vaahakDashboard?.()}catch(e){}
}
function freeze(){
  pinFreeze=true;
  clearTimeout(resumeTimer);
  stopStable();
  document.documentElement.dataset.dbestVaahakPinTyping='1';
}
function releaseWhenDone(){
  clearTimeout(resumeTimer);
  resumeTimer=setInterval(()=>{
    const input=document.querySelector('[data-vh-pin-input]');
    if(!input){
      clearInterval(resumeTimer);resumeTimer=null;
      pinFreeze=false;
      delete document.documentElement.dataset.dbestVaahakPinTyping;
      setTimeout(resumeStable,80);
    }
  },300);
}

// Block the older Vaahak live bridge from replacing the entire screen while
// the stable dashboard is active. The legacy bridge renders a .vhWrap without
// the dbestVaahakStableRoot id; the stable dashboard always includes the id.
const originalSectionScreen=window.sectionScreen;
if(typeof originalSectionScreen==='function'){
  window.sectionScreen=function(html){
    try{
      const s=String(html||'');
      const legacyVaahak=/Vaahak Live Dashboard/i.test(s)&&/class=["'][^"']*vhWrap/.test(s)&&!/dbestVaahakStableRoot/.test(s);
      if((isStable()||pinFreeze)&&legacyVaahak)return;
    }catch(e){}
    return originalSectionScreen.apply(this,arguments);
  };
}

// Freeze all dashboard list refreshes as soon as the driver touches/types in PIN.
document.addEventListener('pointerdown',e=>{if(isPinInput(e.target))freeze()},true);
document.addEventListener('touchstart',e=>{if(isPinInput(e.target))freeze()},{capture:true,passive:true});
document.addEventListener('focusin',e=>{if(isPinInput(e.target))freeze()},true);
document.addEventListener('input',e=>{if(isPinInput(e.target))freeze()},true);

// Keep the screen frozen during verification. Once the accepted PIN field
// disappears (ride has started), resume normal live refresh automatically.
document.addEventListener('click',e=>{
  const b=e.target?.closest?.('[data-vh-pin-submit]');
  if(!b)return;
  freeze();
  releaseWhenDone();
},true);
document.addEventListener('keydown',e=>{
  if(!isPinInput(e.target)||e.key!=='Enter')return;
  freeze();
  releaseWhenDone();
},true);

// If another renderer removes the stable root unexpectedly while PIN entry is
// frozen, do not let a legacy screen remain. Re-open the stable dashboard.
const mo=new MutationObserver(()=>{
  if(!pinFreeze)return;
  if(!isStable()){
    setTimeout(()=>{
      try{window.vaahakDashboard?.()}catch(e){}
      stopStable();
      const input=document.querySelector('[data-vh-pin-input]');
      if(input){try{input.focus({preventScroll:true})}catch(e){try{input.focus()}catch(_){}}}
    },40);
  }
});
mo.observe(document.documentElement,{childList:true,subtree:true});

window.DBEST_VAAHAK_PIN_FOCUS_GUARD={version:VERSION,freeze,release:()=>{pinFreeze=false;delete document.documentElement.dataset.dbestVaahakPinTyping;resumeStable()},isFrozen:()=>pinFreeze};
})();