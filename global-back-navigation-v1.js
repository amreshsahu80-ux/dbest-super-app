(function(){
'use strict';
const V='20260913-global-back-nav-v7-full-footer';
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
  return [...document.querySelectorAll('button,a,[role="button"]')].find(function(el){
    if(el.id==='dbestGlobalBack'||!visible(el))return false;
    const tx=String(el.textContent||el.getAttribute('aria-label')||el.title||'').replace(/\s+/g,' ').trim().toLowerCase();
    return /^(←|‹|❮|back|go back|home|←\s*back|←\s*home|back\s*to\s*home|होम|वापस|হোম|ପଛକୁ|హోమ్|பின்|முகப்பு)/i.test(tx);
  })||null;
}
function deepView(){
  if(!isRootPath())return true;
  const candidates=[...document.querySelectorAll('.sectionContent,.shopPage,.servicePage,.checkoutCard,.payCard,.orderStatusCard,.ownerPanelCard,[data-page],[data-view]')];
  if(candidates.some(visible))return true;
  const modal=document.querySelector('#dbestVisitorAccessGate');
  return !!(modal&&visible(modal));
}
function goBack(){try{if(window.history.length>1){window.history.back();return;}}catch(_){}location.href='/';}
function ensureButton(){
  let b=document.getElementById('dbestGlobalBack');
  if(!b){b=document.createElement('button');b.id='dbestGlobalBack';b.type='button';b.setAttribute('aria-label','Back');b.title='Back';b.textContent='←';b.style.cssText='position:fixed;left:12px;top:74px;z-index:99990;width:40px;height:40px;border:1px solid rgba(23,92,255,.14);border-radius:14px;background:rgba(255,255,255,.96);color:#175cff;box-shadow:0 8px 22px rgba(24,39,75,.13);font:900 23px/1 system-ui,-apple-system,Segoe UI,Arial,sans-serif;place-items:center;padding:0;cursor:pointer;backdrop-filter:blur(8px);-webkit-tap-highlight-color:transparent';b.addEventListener('click',goBack);document.body.appendChild(b)}
  b.style.display=deepView()&&!nativeBackControl()?'grid':'none';
}
function looksLikeLanguageSelect(s){
  if(!s||s.tagName!=='SELECT')return false;
  const values=[...s.options].map(o=>String(o.value||'').toLowerCase());
  const text=[...s.options].map(o=>String(o.textContent||'').toLowerCase()).join(' ');
  return ['en','hi','bn','or','od','te','ta'].filter(v=>values.includes(v)).length>=2||/english|hindi|bengali|bangla|odia|oriya|telugu|tamil|हिंदी|বাংলা|ଓଡ଼ିଆ|తెలుగు|தமிழ்/.test(text);
}
function placeLanguageBesideLogo(){
  const nav=document.querySelector('.navin'),logo=nav&&nav.querySelector('.dbestTopLogo'),sel=[...document.querySelectorAll('select')].find(looksLikeLanguageSelect);
  if(!nav||!logo||!sel)return;
  let group=document.getElementById('dbestLogoLanguageGroup');
  if(!group){group=document.createElement('div');group.id='dbestLogoLanguageGroup';group.style.cssText='display:flex;align-items:center;gap:8px;min-width:0;flex:0 1 auto';logo.parentNode.insertBefore(group,logo);group.appendChild(logo)}
  if(sel.parentNode!==group)group.appendChild(sel);
  ['position','left','right','top','transform','z-index','margin'].forEach(p=>sel.style.removeProperty(p));
  sel.style.setProperty('position','static','important');sel.style.setProperty('transform','none','important');sel.style.setProperty('width','auto','important');sel.style.setProperty('min-width',window.innerWidth<=390?'76px':'88px','important');sel.style.setProperty('max-width',window.innerWidth<=390?'88px':'112px','important');sel.style.setProperty('height',window.innerWidth<=390?'34px':'36px','important');sel.style.setProperty('padding',window.innerWidth<=390?'0 17px 0 7px':'0 22px 0 9px','important');sel.style.setProperty('border','1px solid #e3e9f3','important');sel.style.setProperty('border-radius','11px','important');sel.style.setProperty('background-color','#fff','important');sel.style.setProperty('box-shadow','0 3px 10px rgba(24,39,75,.07)','important');sel.style.setProperty('font-size',window.innerWidth<=390?'10px':'11px','important');sel.style.setProperty('font-weight','800','important');sel.style.setProperty('color','#29415f','important');group.style.setProperty('gap',window.innerWidth<=390?'5px':'8px','important');
}
function openFooterPanel(type){
  let old=document.getElementById('dbestFooterPanel');if(old)old.remove();
  const ov=document.createElement('div');ov.id='dbestFooterPanel';ov.style.cssText='position:fixed;inset:0;z-index:100020;background:rgba(10,23,49,.48);display:grid;place-items:center;padding:18px';
  const card=document.createElement('div');card.style.cssText='width:min(92vw,520px);max-height:82vh;overflow:auto;background:#fff;border-radius:20px;padding:20px;box-shadow:0 24px 70px rgba(10,23,49,.24);font:500 13px/1.6 system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#31425f';
  const close=document.createElement('button');close.type='button';close.textContent='✕';close.style.cssText='float:right;border:0;background:#eef3ff;color:#175cff;border-radius:10px;width:34px;height:34px;font-weight:900;cursor:pointer';close.onclick=()=>ov.remove();
  const h=document.createElement('h2');h.style.cssText='margin:0 44px 12px 0;color:#172a49;font-size:20px';
  const body=document.createElement('div');
  if(type==='about'){h.textContent='About Us';body.innerHTML='<p>DBest Super Platform brings multiple everyday services together in one convenient digital platform.</p>'}
  else if(type==='contact'){h.textContent='Contact Us';body.innerHTML='<p style="margin:0 0 10px">For support or complaints, contact us by email:</p><p style="margin:6px 0"><a href="mailto:support@dbest4u.com" style="color:#175cff;font-weight:800;text-decoration:none">support@dbest4u.com</a></p><p style="margin:6px 0"><a href="mailto:complaints@dbest4u.com" style="color:#175cff;font-weight:800;text-decoration:none">complaints@dbest4u.com</a></p><p style="margin:10px 0 0;color:#758197">A dedicated contact number will be added later.</p>'}
  else {h.textContent='Terms & Conditions';body.innerHTML='<p>Use of DBest services is subject to the applicable service, payment, membership, cancellation, refund and partner terms shown within the relevant section of the platform.</p><p>Please review the applicable terms before completing a registration, booking, purchase or payment.</p>'}
  card.appendChild(close);card.appendChild(h);card.appendChild(body);ov.appendChild(card);ov.addEventListener('click',e=>{if(e.target===ov)ov.remove()});document.body.appendChild(ov);
}
function ensureFullFooter(){
  let old=document.getElementById('dbestContactFooter');if(old)old.remove();
  if(document.getElementById('dbestFullFooter'))return;
  const footer=document.createElement('footer');footer.id='dbestFullFooter';footer.style.cssText='margin-top:24px;background:#fff;border-top:1px solid #e8edf5;padding:14px 12px 16px;color:#506079;font:600 12px/1.4 system-ui,-apple-system,Segoe UI,Arial,sans-serif';
  const inner=document.createElement('div');inner.style.cssText='max-width:1180px;margin:0 auto;display:flex;justify-content:center;align-items:center;gap:10px 22px;flex-wrap:wrap';
  [['About Us','about'],['Contact Us','contact'],['Terms & Conditions','terms']].forEach(function(x){const b=document.createElement('button');b.type='button';b.textContent=x[0];b.style.cssText='border:0;background:transparent;color:#29415f;font-weight:800;padding:6px 3px;cursor:pointer';b.onclick=()=>openFooterPanel(x[1]);inner.appendChild(b)});
  footer.appendChild(inner);document.body.appendChild(footer);
}
let sx=0,sy=0,st=0,tracking=false;
function isBlockedTarget(t){return !!(t&&t.closest&&t.closest('input,textarea,select,[contenteditable="true"],.tabs,[data-horizontal-scroll],.carousel,.slider,[role="slider"]'))}
function start(e){if(!deepView()||!e.touches||e.touches.length!==1||isBlockedTarget(e.target))return;tracking=true;sx=e.touches[0].clientX;sy=e.touches[0].clientY;st=Date.now()}
function end(e){if(!tracking){tracking=false;return}tracking=false;if(!e.changedTouches||!e.changedTouches.length)return;const ex=e.changedTouches[0].clientX,ey=e.changedTouches[0].clientY,dx=ex-sx,dy=Math.abs(ey-sy),dt=Date.now()-st;if(dx>=76&&dy<=Math.max(46,dx*.55)&&dt<=900)goBack()}
document.addEventListener('touchstart',start,{passive:true,capture:true});document.addEventListener('touchend',end,{passive:true,capture:true});
function refresh(){requestAnimationFrame(function(){ensureButton();placeLanguageBesideLogo();ensureFullFooter()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
new MutationObserver(refresh).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});
window.addEventListener('popstate',refresh);window.addEventListener('pageshow',refresh);window.addEventListener('hashchange',refresh);window.addEventListener('resize',refresh,{passive:true});
window.DBEST_GLOBAL_BACK_NAV={version:V,back:goBack,refresh:refresh};
})();