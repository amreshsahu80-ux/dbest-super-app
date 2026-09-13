(function(){
'use strict';
const V='20260913-simple-section-gate-v1';
if(window.DBEST_MEMBERSHIP_EXPLAINER_ACTION_FIX&&window.DBEST_MEMBERSHIP_EXPLAINER_ACTION_FIX.version===V)return;

function isVisitor(){
  try{return !window.session||window.session.role==='visitor'||!window.session.role}catch(_){return true}
}
function normalizeLang(v){v=String(v||'').toLowerCase();if(v==='od')v='or';return /^(en|hi|bn|or|te|ta)$/.test(v)?v:'en'}
function selectedLang(){
  try{
    const q=new URLSearchParams(location.search).get('lang');if(q)return normalizeLang(q);
    const s=[].slice.call(document.querySelectorAll('select')).find(function(x){return /^(en|hi|bn|or|od|te|ta)$/i.test(String(x.value||''))});
    if(s)return normalizeLang(s.value);
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i)||'';
      if(/lang/i.test(k)){const v=localStorage.getItem(k);if(v)return normalizeLang(v)}
    }
  }catch(_){}
  return 'en';
}
const COPY={
  en:{msg:'You need to register to explore this section',reg:'Register',login:'Login',close:'Close'},
  hi:{msg:'इस सेक्शन को देखने के लिए आपको रजिस्टर करना होगा',reg:'रजिस्टर करें',login:'लॉगिन',close:'बंद करें'},
  bn:{msg:'এই সেকশন দেখতে আপনাকে রেজিস্টার করতে হবে',reg:'রেজিস্টার',login:'লগইন',close:'বন্ধ করুন'},
  or:{msg:'ଏହି ସେକ୍ସନ୍ ଦେଖିବା ପାଇଁ ଆପଣଙ୍କୁ ରେଜିଷ୍ଟର କରିବାକୁ ପଡିବ',reg:'ରେଜିଷ୍ଟର',login:'ଲଗଇନ୍',close:'ବନ୍ଦ କରନ୍ତୁ'},
  te:{msg:'ఈ విభాగాన్ని చూడడానికి మీరు రిజిస్టర్ కావాలి',reg:'రిజిస్టర్',login:'లాగిన్',close:'మూసివేయి'},
  ta:{msg:'இந்த பகுதியைப் பார்க்க நீங்கள் பதிவு செய்ய வேண்டும்',reg:'பதிவு',login:'உள்நுழைவு',close:'மூடு'}
};
function legacy(){return document.getElementById('dbestMembershipPlanModal')}
function removeGate(){const g=document.getElementById('dbestVisitorAccessGate');if(g)g.remove()}
function makeButton(label,bg,color){
  const b=document.createElement('button');b.type='button';b.textContent=label;
  b.style.cssText='border:0;border-radius:12px;padding:12px 14px;font-weight:900;font-size:14px;cursor:pointer;background:'+bg+';color:'+color;
  return b;
}
function showSimpleGate(){
  if(!isVisitor())return false;
  const old=legacy();if(!old)return false;
  try{old.remove()}catch(_){}
  removeGate();
  const lang=selectedLang(),t=COPY[lang]||COPY.en;
  const overlay=document.createElement('div');overlay.id='dbestVisitorAccessGate';
  overlay.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(13,23,41,.48);display:grid;place-items:center;padding:18px;backdrop-filter:blur(5px)';
  const card=document.createElement('div');card.style.cssText='width:min(92vw,430px);background:#fff;border-radius:22px;padding:24px 20px;text-align:center;box-shadow:0 24px 70px rgba(13,23,41,.24);font-family:Inter,system-ui,Arial;color:#13203a';
  const icon=document.createElement('div');icon.textContent='🔐';icon.style.cssText='width:48px;height:48px;margin:0 auto 12px;border-radius:15px;background:linear-gradient(135deg,#1760ff,#735cff);display:grid;place-items:center;font-size:22px';
  const msg=document.createElement('div');msg.textContent=t.msg;msg.style.cssText='font-size:20px;font-weight:900;line-height:1.35;margin-bottom:16px';
  const actions=document.createElement('div');actions.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:9px';
  const reg=makeButton(t.reg,'linear-gradient(135deg,#1760ff,#735cff)','#fff');
  const login=makeButton(t.login,'#edf3ff','#175cff');
  const close=makeButton(t.close,'transparent','#697386');close.style.marginTop='10px';
  reg.onclick=function(){const q=new URLSearchParams(location.search);q.set('lang',lang);location.href='/membership-choose.html'+(q.toString()?'?'+q.toString():'')};
  login.onclick=function(){location.href='/preview-member-login-v2.html?return=%2F'};
  close.onclick=removeGate;
  overlay.onclick=function(e){if(e.target===overlay)removeGate()};
  actions.append(reg,login);card.append(icon,msg,actions,close);overlay.append(card);document.body.append(overlay);
  return true;
}
function handle(){
  if(!isVisitor())return;
  if(legacy())showSimpleGate();
}
const mo=new MutationObserver(handle);
mo.observe(document.documentElement,{childList:true,subtree:true});
[0,80,200,500].forEach(function(ms){setTimeout(handle,ms)});
window.addEventListener('pageshow',function(){setTimeout(handle,0)});
window.addEventListener('popstate',function(){removeGate();setTimeout(handle,0)});
document.addEventListener('keydown',function(e){if(e.key==='Escape')removeGate()},true);
window.DBEST_MEMBERSHIP_EXPLAINER_ACTION_FIX={version:V,show:showSimpleGate,close:removeGate};
})();
