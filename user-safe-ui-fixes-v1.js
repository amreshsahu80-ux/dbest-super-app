(function(){
'use strict';
const VERSION='20260920-user-safe-ui-fixes-v1';
if(window.DBEST_USER_SAFE_UI_FIXES?.version===VERSION)return;

function ensureFlightTiles(){
  const root=document.querySelector('#m .sectionOverlay');
  if(!root)return;
  const title=String(root.querySelector('.sectionTitle b,.sectionHero b')?.textContent||'').toLowerCase();
  const isFlights=/flight/.test(title)||!!root.querySelector('[onclick*="openContentForm(\'flights\'"]');
  if(!isFlights)return;
  let subs=root.querySelector('.subs');
  if(!subs)return;
  subs.style.setProperty('display','grid','important');
  subs.style.setProperty('visibility','visible','important');
  subs.style.setProperty('opacity','1','important');
  subs.style.setProperty('content-visibility','visible','important');
  const defs=[
    ['Flight Booking',0],
    ['Flight + Hotel',1],
    ['Visa Assistance',2]
  ];
  defs.forEach(([label,i])=>{
    let b=subs.querySelector('[onclick*="openContentForm(\'flights\','+i+')"]');
    if(!b){
      b=document.createElement('button');
      b.className='sub';
      b.setAttribute('onclick',"openContentForm('flights',"+i+")");
      b.innerHTML='<b>'+label+'</b><small>Open this service →</small>';
      subs.appendChild(b);
    }
    b.style.setProperty('display','block','important');
    b.style.setProperty('visibility','visible','important');
    b.style.setProperty('opacity','1','important');
  });
}

let queued=false;
function sync(){
  queued=false;
  ensureFlightTiles();
  try{window.DBEST_USER_I18N?.apply?.()}catch(_){}
}
function queue(){if(queued)return;queued=true;requestAnimationFrame(sync)}
const mo=new MutationObserver(queue);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{mo.observe(document.body,{childList:true,subtree:true});sync()},{once:true});
else{mo.observe(document.body,{childList:true,subtree:true});sync()}
window.addEventListener('pageshow',queue);
window.DBEST_USER_SAFE_UI_FIXES={version:VERSION,sync,ensureFlightTiles};
})();