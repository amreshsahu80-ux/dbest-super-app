(function(){
'use strict';
const V='20260913-language-selector-center-v1';
if(window.DBEST_LANGUAGE_SELECTOR_CENTER&&window.DBEST_LANGUAGE_SELECTOR_CENTER.version===V)return;

function looksLikeLanguageSelect(s){
  if(!s||s.tagName!=='SELECT')return false;
  const values=[...s.options].map(o=>String(o.value||'').toLowerCase());
  const text=[...s.options].map(o=>String(o.textContent||'').toLowerCase()).join(' ');
  const hits=['en','hi','bn','or','od','te','ta'].filter(v=>values.includes(v)).length;
  return hits>=2||/english|hindi|bengali|bangla|odia|oriya|telugu|tamil|हिंदी|বাংলা|ଓଡ଼ିଆ|తెలుగు|தமிழ்/.test(text);
}

function apply(){
  const nav=document.querySelector('.navin');
  if(!nav)return;
  nav.style.setProperty('position','relative','important');
  const sel=[...document.querySelectorAll('select')].find(looksLikeLanguageSelect);
  if(!sel)return;
  sel.classList.add('dbestCenteredLanguageSelector');
  sel.style.setProperty('position','absolute','important');
  sel.style.setProperty('left','50%','important');
  sel.style.setProperty('top','50%','important');
  sel.style.setProperty('transform','translate(-50%,-50%)','important');
  sel.style.setProperty('z-index','6','important');
  sel.style.setProperty('width','auto','important');
  sel.style.setProperty('min-width','92px','important');
  sel.style.setProperty('max-width','118px','important');
  sel.style.setProperty('height','36px','important');
  sel.style.setProperty('padding','0 24px 0 9px','important');
  sel.style.setProperty('border','1px solid #e3e9f3','important');
  sel.style.setProperty('border-radius','11px','important');
  sel.style.setProperty('background-color','#fff','important');
  sel.style.setProperty('box-shadow','0 3px 10px rgba(24,39,75,.07)','important');
  sel.style.setProperty('font-size','11px','important');
  sel.style.setProperty('font-weight','800','important');
  sel.style.setProperty('color','#29415f','important');
  if(window.matchMedia&&window.matchMedia('(max-width:390px)').matches){
    sel.style.setProperty('min-width','78px','important');
    sel.style.setProperty('max-width','86px','important');
    sel.style.setProperty('height','34px','important');
    sel.style.setProperty('font-size','10px','important');
    sel.style.setProperty('padding','0 18px 0 7px','important');
  }
}

apply();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
new MutationObserver(()=>requestAnimationFrame(apply)).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('resize',apply,{passive:true});
window.DBEST_LANGUAGE_SELECTOR_CENTER={version:V,refresh:apply};
})();
