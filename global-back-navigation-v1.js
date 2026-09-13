(function(){
'use strict';
const V='20260913-global-back-nav-v3-centered-language';
if(window.DBEST_GLOBAL_BACK_NAV&&window.DBEST_GLOBAL_BACK_NAV.version===V)return;

function visible(el){
  if(!el||!el.isConnected)return false;
  const s=getComputedStyle(el),r=el.getBoundingClientRect();
  return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)!==0&&r.width>0&&r.height>0;
}
function isRootPath(){
  const p=String(location.pathname||'/').replace(/\/+$/,'')||'/';
  return p==='/'||p==='/index.html'||p==='/index-26.html';
}
function nativeBackControl(){
  const els=[...document.querySelectorAll('button,a,[role="button"]')];
  return els.find(function(el){
    if(el.id==='dbestGlobalBack'||!visible(el))return false;
    const tx=String(el.textContent||el.getAttribute('aria-label')||el.title||'').replace(/\s+/g,' ').trim().toLowerCase();
    if(!tx)return false;
    return /^(←|‹|❮|back|go back|home|←\s*back|←\s*home|back\s*to\s*home|होम|वापस|হোম|ପଛକୁ|హోమ్|பின்|முகப்பு)/i.test(tx);
  })||null;
}
function deepView(){
  if(!isRootPath())return true;
  const candidates=[...document.querySelectorAll('.sectionContent,.shopPage,.servicePage,.checkoutCard,.payCard,.orderStatusCard,.ownerPanelCard,[data-page],[data-view]')];
  if(candidates.some(visible))return true;
  const modal=document.querySelector('#dbestVisitorAccessGate');
  if(modal&&visible(modal))return true;
  return false;
}
function shouldShowArrow(){return deepView()&&!nativeBackControl()}
function canSwipeBack(){return deepView()}

function goBack(){
  try{
    if(window.history.length>1){window.history.back();return;}
  }catch(_){}
  location.href='/';
}

function ensureButton(){
  let b=document.getElementById('dbestGlobalBack');
  if(!b){
    b=document.createElement('button');
    b.id='dbestGlobalBack';b.type='button';b.setAttribute('aria-label','Back');b.title='Back';b.textContent='←';
    b.style.cssText='position:fixed;left:12px;top:74px;z-index:99990;width:40px;height:40px;border:1px solid rgba(23,92,255,.14);border-radius:14px;background:rgba(255,255,255,.96);color:#175cff;box-shadow:0 8px 22px rgba(24,39,75,.13);font:900 23px/1 system-ui,-apple-system,Segoe UI,Arial,sans-serif;place-items:center;padding:0;cursor:pointer;backdrop-filter:blur(8px);-webkit-tap-highlight-color:transparent';
    b.addEventListener('click',goBack);document.body.appendChild(b);
  }
  b.style.display=shouldShowArrow()?'grid':'none';
}

function looksLikeLanguageSelect(s){
  if(!s||s.tagName!=='SELECT')return false;
  const values=[...s.options].map(o=>String(o.value||'').toLowerCase());
  const text=[...s.options].map(o=>String(o.textContent||'').toLowerCase()).join(' ');
  const hits=['en','hi','bn','or','od','te','ta'].filter(v=>values.includes(v)).length;
  return hits>=2||/english|hindi|bengali|bangla|odia|oriya|telugu|tamil|हिंदी|বাংলা|ଓଡ଼ିଆ|తెలుగు|தமிழ்/.test(text);
}
function centerLanguageSelector(){
  const nav=document.querySelector('.navin');
  if(!nav)return;
  nav.style.setProperty('position','relative','important');
  const sel=[...document.querySelectorAll('select')].find(looksLikeLanguageSelect);
  if(!sel)return;
  sel.style.setProperty('position','absolute','important');
  sel.style.setProperty('left','50%','important');
  sel.style.setProperty('top','50%','important');
  sel.style.setProperty('transform','translate(-50%,-50%)','important');
  sel.style.setProperty('z-index','8','important');
  sel.style.setProperty('width','auto','important');
  sel.style.setProperty('min-width',window.innerWidth<=390?'78px':'92px','important');
  sel.style.setProperty('max-width',window.innerWidth<=390?'86px':'118px','important');
  sel.style.setProperty('height',window.innerWidth<=390?'34px':'36px','important');
  sel.style.setProperty('padding',window.innerWidth<=390?'0 18px 0 7px':'0 24px 0 9px','important');
  sel.style.setProperty('border','1px solid #e3e9f3','important');
  sel.style.setProperty('border-radius','11px','important');
  sel.style.setProperty('background-color','#fff','important');
  sel.style.setProperty('box-shadow','0 3px 10px rgba(24,39,75,.07)','important');
  sel.style.setProperty('font-size',window.innerWidth<=390?'10px':'11px','important');
  sel.style.setProperty('font-weight','800','important');
  sel.style.setProperty('color','#29415f','important');
}

let sx=0,sy=0,st=0,tracking=false,blocked=false;
function isBlockedTarget(t){
  if(!t||!t.closest)return false;
  return !!t.closest('input,textarea,select,[contenteditable="true"],.tabs,[data-horizontal-scroll],.carousel,.slider,[role="slider"]');
}
function start(e){
  if(!canSwipeBack()||!e.touches||e.touches.length!==1)return;
  blocked=isBlockedTarget(e.target);tracking=!blocked;if(!tracking)return;
  sx=e.touches[0].clientX;sy=e.touches[0].clientY;st=Date.now();
}
function end(e){
  if(!tracking){tracking=false;return;}tracking=false;
  if(!e.changedTouches||!e.changedTouches.length)return;
  const ex=e.changedTouches[0].clientX,ey=e.changedTouches[0].clientY,dx=ex-sx,dy=Math.abs(ey-sy),dt=Date.now()-st;
  if(dx>=76&&dy<=Math.max(46,dx*.55)&&dt<=900)goBack();
}

document.addEventListener('touchstart',start,{passive:true,capture:true});
document.addEventListener('touchend',end,{passive:true,capture:true});
function refresh(){requestAnimationFrame(function(){ensureButton();centerLanguageSelector()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
new MutationObserver(refresh).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});
window.addEventListener('popstate',refresh);window.addEventListener('pageshow',refresh);window.addEventListener('hashchange',refresh);window.addEventListener('resize',refresh,{passive:true});
window.DBEST_GLOBAL_BACK_NAV={version:V,back:goBack,refresh:refresh};
})();
