(function(){
'use strict';
if(window.DBEST_USER_LOGIN_OVERLAY_GUARD)return;
const V='20260913-user-login-overlay-guard-v2';
let navUntil=0,lastKey='',lastAt=0;

function closeExplainer(){
  try{
    const m=document.getElementById('dbestMembershipPlanModal');
    if(m&&!m.classList.contains('registrationPage'))m.remove();
  }catch(_){}
}
function selectedLang(){
  try{
    const q=new URLSearchParams(location.search).get('lang');if(q)return normalizeLang(q);
    const s=[].slice.call(document.querySelectorAll('select')).find(x=>/^(en|hi|bn|or|od|te|ta)$/i.test(String(x.value||'')));
    if(s)return normalizeLang(s.value);
    for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||'';if(/lang/i.test(k)){const v=localStorage.getItem(k);if(v)return normalizeLang(v)}}
  }catch(_){}
  return'en';
}
function normalizeLang(v){v=String(v||'').toLowerCase();if(v==='od')v='or';return /^(en|hi|bn|or|te|ta)$/.test(v)?v:'en'}
const MSG={
  en:['You need to register to explore this section','Register','Login'],
  hi:['इस सेक्शन को देखने के लिए आपको रजिस्टर करना होगा','रजिस्टर करें','लॉगिन'],
  bn:['এই সেকশন দেখতে আপনাকে রেজিস্টার করতে হবে','রেজিস্টার','লগইন'],
  or:['ଏହି ସେକ୍ସନ୍ ଦେଖିବା ପାଇଁ ଆପଣଙ୍କୁ ରେଜିଷ୍ଟର କରିବାକୁ ପଡିବ','ରେଜିଷ୍ଟର','ଲଗଇନ୍'],
  te:['ఈ విభాగాన్ని చూడడానికి మీరు రిజిస్టర్ కావాలి','రిజిస్టర్','లాగిన్'],
  ta:['இந்த பகுதியைப் பார்க்க நீங்கள் பதிவு செய்ய வேண்டும்','பதிவு','உள்நுழைவு']
};
function visitor(){try{return !window.session||window.session.role==='visitor'||!window.session.role}catch(_){return true}}
function replaceLegacyExplainer(){
  try{
    const m=document.getElementById('dbestMembershipPlanModal');
    if(!m||m.classList.contains('registrationPage')||m.dataset.dbestSimpleGate==='1'||!visitor())return;
    const lang=selectedLang(),t=MSG[lang]||MSG.en;
    m.dataset.dbestSimpleGate='1';
    m.innerHTML='<div style="width:min(92vw,430px);margin:auto;background:#fff;border-radius:22px;padding:24px 20px;text-align:center;box-shadow:0 24px 70px rgba(13,23,41,.24);font-family:Inter,system-ui,Arial;color:#13203a"><div style="width:48px;height:48px;margin:0 auto 12px;border-radius:15px;background:linear-gradient(135deg,#1760ff,#735cff);display:grid;place-items:center;font-size:22px">🔐</div><div style="font-size:20px;font-weight:900;line-height:1.3;margin-bottom:16px">'+t[0]+'</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:9px"><button id="dbestGateRegister" style="border:0;border-radius:11px;padding:11px;background:linear-gradient(135deg,#1760ff,#735cff);color:#fff;font-weight:900">'+t[1]+'</button><button id="dbestGateLogin" style="border:0;border-radius:11px;padding:11px;background:#edf3ff;color:#175cff;font-weight:900">'+t[2]+'</button></div></div>';
    m.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(13,23,41,.48);display:grid;place-items:center;padding:18px;backdrop-filter:blur(5px)';
    const r=m.querySelector('#dbestGateRegister'),l=m.querySelector('#dbestGateLogin');
    if(r)r.onclick=function(){const q=new URLSearchParams(location.search);q.set('lang',lang);location.href='/membership-choose.html?'+q.toString()};
    if(l)l.onclick=function(){location.href='/preview-member-login-v2.html?return=%2F'};
  }catch(_){}
}
function mark(ms=5000){navUntil=Math.max(navUntil,Date.now()+ms);window.__DBEST_LOGIN_NAV_UNTIL=navUntil;closeExplainer();[0,30,100,220,500].forEach(t=>setTimeout(closeExplainer,t))}
function actionFor(el){
  if(!el)return'';
  const btn=el.closest?.('button,a,[role="button"]');if(!btn)return'';
  if(btn.closest?.('#dbestMembershipPlanModal'))return'';
  const oc=String(btn.getAttribute('onclick')||'').replace(/\s+/g,'');
  if(btn.id==='account'||/^account\(\);?$/.test(oc))return'account';
  if(/^loginChoice\(\);?$/.test(oc))return'loginChoice';
  if(/^memberLogin\(\);?$/.test(oc))return'memberLogin';
  return'';
}
function runAction(name){mark();try{const fn=window[name];if(typeof fn==='function'){fn();return true}}catch(e){console.warn('DBest user login navigation guard',e)}return false}
function press(e){const name=actionFor(e.target);if(!name)return;const key=name+'|'+String(e.target?.textContent||'').trim().slice(0,40),now=Date.now();if(key===lastKey&&now-lastAt<450)return;lastKey=key;lastAt=now;runAction(name)}
document.addEventListener('pointerdown',press,{capture:true,passive:true});
document.addEventListener('touchstart',press,{capture:true,passive:true});
document.addEventListener('mousedown',press,true);
document.addEventListener('click',function(e){const name=actionFor(e.target);if(!name||Date.now()>navUntil)return;try{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}catch(_){}closeExplainer()},true);
function wrap(name){try{const base=window[name];if(typeof base!=='function'||base.__dbestLoginGuard)return;const guarded=function(){mark();const r=base.apply(this,arguments);mark();return r};guarded.__dbestLoginGuard=true;guarded.__dbestBase=base;window[name]=guarded}catch(_){}}
function install(){['account','loginChoice','memberLogin'].forEach(wrap)}
const mo=new MutationObserver(function(){if(Date.now()<=navUntil)closeExplainer();else replaceLegacyExplainer();install()});
mo.observe(document.documentElement,{childList:true,subtree:true});
[0,100,350,900,1800,3500].forEach(t=>setTimeout(function(){install();replaceLegacyExplainer()},t));
window.addEventListener('pageshow',function(){closeExplainer();install()});
window.addEventListener('popstate',function(){closeExplainer();setTimeout(install,0)});
window.DBEST_USER_LOGIN_OVERLAY_GUARD={version:V,close:closeExplainer,mark,install,replaceLegacyExplainer};
})();