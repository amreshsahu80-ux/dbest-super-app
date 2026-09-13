(function(){
'use strict';
const V='20260913-global-back-nav-v5-contact-emails';
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
  try{if(window.history.length>1){window.history.back();return;}}catch(_){}
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
function placeLanguageBesideLogo(){
  const nav=document.querySelector('.navin');
  const logo=nav&&nav.querySelector('.dbestTopLogo');
  const sel=[...document.querySelectorAll('select')].find(looksLikeLanguageSelect);
  if(!nav||!logo||!sel)return;

  let group=document.getElementById('dbestLogoLanguageGroup');
  if(!group){
    group=document.createElement('div');
    group.id='dbestLogoLanguageGroup';
    group.style.cssText='display:flex;align-items:center;gap:8px;min-width:0;flex:0 1 auto';
    logo.parentNode.insertBefore(group,logo);
    group.appendChild(logo);
  }
  if(sel.parentNode!==group)group.appendChild(sel);

  sel.classList.remove('dbestCenteredLanguageSelector');
  ['position','left','right','top','transform','z-index','margin'].forEach(function(p){sel.style.removeProperty(p)});
  sel.style.setProperty('position','static','important');
  sel.style.setProperty('transform','none','important');
  sel.style.setProperty('width','auto','important');
  sel.style.setProperty('min-width',window.innerWidth<=390?'76px':'88px','important');
  sel.style.setProperty('max-width',window.innerWidth<=390?'88px':'112px','important');
  sel.style.setProperty('height',window.innerWidth<=390?'34px':'36px','important');
  sel.style.setProperty('padding',window.innerWidth<=390?'0 17px 0 7px':'0 22px 0 9px','important');
  sel.style.setProperty('border','1px solid #e3e9f3','important');
  sel.style.setProperty('border-radius','11px','important');
  sel.style.setProperty('background-color','#fff','important');
  sel.style.setProperty('box-shadow','0 3px 10px rgba(24,39,75,.07)','important');
  sel.style.setProperty('font-size',window.innerWidth<=390?'10px':'11px','important');
  sel.style.setProperty('font-weight','800','important');
  sel.style.setProperty('color','#29415f','important');
  group.style.setProperty('gap',window.innerWidth<=390?'5px':'8px','important');
}

function ensureContactEmails(){
  if(document.getElementById('dbestContactEmailLinks'))return;
  const candidates=[...document.querySelectorAll('footer,.footer,[class*="footer"],[id*="footer"],section,div')];
  let target=null;
  for(const el of candidates){
    const tx=String(el.textContent||'').replace(/\s+/g,' ').trim();
    if(!tx||tx.length>1400)continue;
    if(/contact\s*us|contact|संपर्क|যোগাযোগ|ଯୋଗାଯୋଗ|సంప్రదించండి|தொடர்பு/i.test(tx)){target=el;break;}
  }
  if(!target)return;
  const wrap=document.createElement('div');
  wrap.id='dbestContactEmailLinks';
  wrap.style.cssText='margin-top:8px;display:flex;flex-wrap:wrap;gap:7px 14px;align-items:center;font-size:12px;line-height:1.5';
  const support=document.createElement('a');
  support.href='mailto:support@dbest4u.com';
  support.textContent='Support: support@dbest4u.com';
  support.style.cssText='color:inherit;text-decoration:none;font-weight:700';
  const complaints=document.createElement('a');
  complaints.href='mailto:complaints@dbest4u.com';
  complaints.textContent='Complaints: complaints@dbest4u.com';
  complaints.style.cssText='color:inherit;text-decoration:none;font-weight:700';
  wrap.appendChild(support);wrap.appendChild(complaints);
  target.appendChild(wrap);
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
function refresh(){requestAnimationFrame(function(){ensureButton();placeLanguageBesideLogo();ensureContactEmails()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
new MutationObserver(refresh).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});
window.addEventListener('popstate',refresh);window.addEventListener('pageshow',refresh);window.addEventListener('hashchange',refresh);window.addEventListener('resize',refresh,{passive:true});
window.DBEST_GLOBAL_BACK_NAV={version:V,back:goBack,refresh:refresh};
})();
