(function(){
'use strict';
const VERSION='20260921-user-showcase-safe-v2';
if(window.DBEST_USER_SHOWCASE_SAFE?.version===VERSION)return;

const cfg=window.DBEST_RUNTIME_CONFIG||{};
const base=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const key=cfg.supabasePublishableKey||'';
if(!base||!key)return;

const MAP={insurance:'insurance',flights:'travel',mf:'mutual_fund'};
const TITLES={
  en:{insurance:['Insurance Highlights','Explore DBest insurance options and partner content.'],travel:['Travel Highlights','Explore flights, hotels and holiday ideas.'],mutual_fund:['Investment Highlights','Explore mutual fund partners and investment options.']},
  hi:{insurance:['बीमा हाइलाइट्स','DBest बीमा विकल्प और पार्टनर जानकारी देखें।'],travel:['यात्रा हाइलाइट्स','फ्लाइट, होटल और हॉलिडे विकल्प देखें।'],mutual_fund:['निवेश हाइलाइट्स','म्यूचुअल फंड पार्टनर और निवेश विकल्प देखें।']},
  bn:{insurance:['বীমা হাইলাইটস','DBest বীমা বিকল্প ও পার্টনার তথ্য দেখুন।'],travel:['ভ্রমণ হাইলাইটস','ফ্লাইট, হোটেল ও হলিডে বিকল্প দেখুন।'],mutual_fund:['বিনিয়োগ হাইলাইটস','মিউচুয়াল ফান্ড ও বিনিয়োগ বিকল্প দেখুন।']},
  or:{insurance:['ବୀମା ହାଇଲାଇଟ୍ସ','DBest ବୀମା ବିକଳ୍ପ ଓ ପାର୍ଟନର ସୂଚନା ଦେଖନ୍ତୁ।'],travel:['ଯାତ୍ରା ହାଇଲାଇଟ୍ସ','ଫ୍ଲାଇଟ୍, ହୋଟେଲ୍ ଓ ହଲିଡେ ବିକଳ୍ପ ଦେଖନ୍ତୁ।'],mutual_fund:['ନିବେଶ ହାଇଲାଇଟ୍ସ','ମ୍ୟୁଚୁଆଲ୍ ଫଣ୍ଡ ଓ ନିବେଶ ବିକଳ୍ପ ଦେଖନ୍ତୁ।']},
  te:{insurance:['బీమా హైలైట్స్','DBest బీమా ఎంపికలు మరియు పార్ట్నర్ సమాచారాన్ని చూడండి.'],travel:['ప్రయాణ హైలైట్స్','ఫ్లైట్స్, హోటల్స్ మరియు హాలిడే ఎంపికలను చూడండి.'],mutual_fund:['పెట్టుబడి హైలైట్స్','మ్యూచువల్ ఫండ్ మరియు పెట్టుబడి ఎంపికలను చూడండి.']},
  ta:{insurance:['காப்பீட்டு சிறப்புகள்','DBest காப்பீட்டு விருப்பங்கள் மற்றும் கூட்டாளர் தகவலை பார்க்கவும்.'],travel:['பயண சிறப்புகள்','விமானம், ஹோட்டல் மற்றும் விடுமுறை விருப்பங்களை பார்க்கவும்.'],mutual_fund:['முதலீட்டு சிறப்புகள்','மியூச்சுவல் ஃபண்ட் மற்றும் முதலீட்டு விருப்பங்களை பார்க்கவும்.']}
};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function lang(){let v=String(localStorage.getItem('d2_lang')||'en').toLowerCase();if(v==='od')v='or';return ['en','hi','bn','or','te','ta'].includes(v)?v:'en'}
function fallback(name,kind,category){
  const icon=kind==='travel'?'✈️':kind==='mutual_fund'?'📈':'🛡️';
  return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="760" height="380"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#10264d"/><stop offset=".55" stop-color="#175cff"/><stop offset="1" stop-color="#745cff"/></linearGradient></defs><rect width="100%" height="100%" rx="34" fill="url(#g)"/><text x="52" y="155" font-size="72">'+icon+'</text><text x="52" y="235" font-family="Arial" font-size="34" font-weight="700" fill="white">'+String(name||'DBest').slice(0,26)+'</text><text x="54" y="290" font-family="Arial" font-size="20" fill="#eaf1ff">'+String(category||'').slice(0,34)+'</text></svg>');
}
let cards=null,loading=null,currentId='';
async function load(){
  if(cards)return cards;
  if(loading)return loading;
  loading=(async()=>{
    try{
      const r=await fetch(base+'/functions/v1/manage-showcase-cards',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({action:'list'}),cache:'no-store'});
      const d=await r.json().catch(()=>({}));
      if(r.ok&&Array.isArray(d.cards)){cards=d.cards;return cards}
    }catch(e){}
    const r2=await fetch(base+'/rest/v1/service_showcase_cards?select=*&is_visible=eq.true&order=section.asc,sort_order.asc',{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store'});
    const d2=await r2.json().catch(()=>[]);
    if(!r2.ok)throw new Error('showcase_unavailable');
    cards=Array.isArray(d2)?d2:[];
    return cards;
  })().catch(e=>{console.warn('DBest user showcase',e);cards=[];return cards}).finally(()=>{loading=null});
  return loading;
}
function serviceIdFromRoot(){
  const root=document.querySelector('#m .sectionOverlay .sectionContent');if(!root)return'';
  if(root.dataset.dbestServiceId)return root.dataset.dbestServiceId;
  const hero=String(root.querySelector('.sectionHero b')?.textContent||'').toLowerCase();
  if(/insurance|बीमा|বীমা|ବୀମା|బీమా|காப்பீ/.test(hero))return'insurance';
  if(/flight|फ्लाइट|ফ্লাইট|ଫ୍ଲାଇଟ|ఫ్లైట్|விமான/.test(hero))return'flights';
  if(/mutual|म्यूचुअल|মিউচু|ମ୍ୟୁଚୁ|మ్యూచు|மியூச்சு/.test(hero))return'mf';
  return'';
}
async function render(id){
  const root=document.querySelector('#m .sectionOverlay .sectionContent');if(!root)return;
  id=id||serviceIdFromRoot();const kind=MAP[id];if(!kind)return;
  root.dataset.dbestServiceId=id;
  const rows=(await load()).filter(c=>c.section===kind&&c.is_visible!==false).sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0));
  if(!rows.length)return;
  let box=root.querySelector('[data-dbest-safe-showcase]');
  if(!box){box=document.createElement('section');box.setAttribute('data-dbest-safe-showcase',kind);const subs=root.querySelector('.subs');if(subs)root.insertBefore(box,subs);else root.appendChild(box)}
  const [title,intro]=(TITLES[lang()]||TITLES.en)[kind]||[kind,''];
  box.innerHTML='<div class="dbestSafeIntro"><h2>'+esc(title)+'</h2><p>'+esc(intro)+'</p></div><div class="dbestSafeGrid">'+rows.map(c=>'<article class="dbestSafeCard" data-safe-card="'+esc(c.id)+'" tabindex="0"><img src="'+esc(c.image_url||fallback(c.name,kind,c.category))+'" alt="'+esc(c.name)+'"><div><b>'+esc(c.name)+'</b><small>'+esc(c.category||'')+'</small></div></article>').join('')+'</div>';
  box.querySelectorAll('.dbestSafeCard').forEach(el=>{const go=()=>{if(typeof window.dbestUniversalExternalGo==='function')window.dbestUniversalExternalGo(id)};el.onclick=go;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}}});
  try{window.DBEST_I18N?.apply?.()}catch(_){}
  try{window.DBEST_USER_I18N?.apply?.()}catch(_){}
}
function install(){
  const raw=window.openService;if(typeof raw!=='function'||raw.__dbestSafeShowcase)return;
  const wrapped=function(id){const out=raw.apply(this,arguments);if(MAP[id]){currentId=id;setTimeout(()=>render(id),40);setTimeout(()=>render(id),250)}return out};
  wrapped.__dbestSafeShowcase=true;window.openService=wrapped;
}
const st=document.createElement('style');st.textContent='.dbestSafeIntro{margin:18px 0 10px}.dbestSafeIntro h2{margin:0 0 4px;font-size:22px}.dbestSafeIntro p{margin:0;color:#687386}.dbestSafeGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:18px}.dbestSafeCard{overflow:hidden;background:#fff;border:1px solid #e2e8f2;border-radius:20px;box-shadow:0 10px 24px rgba(20,50,100,.07);cursor:pointer}.dbestSafeCard img{display:block;width:100%;height:128px;object-fit:cover}.dbestSafeCard div{padding:11px}.dbestSafeCard b{display:block;font-size:15px}.dbestSafeCard small{display:block;color:#687386;margin-top:4px}@media(max-width:520px){.dbestSafeGrid{gap:9px}.dbestSafeCard img{height:102px}.dbestSafeCard div{padding:9px}.dbestSafeCard b{font-size:13px}.dbestSafeCard small{font-size:10px}}';document.head.appendChild(st);
let n=0,t=setInterval(()=>{n++;install();if(n>40)clearInterval(t)},100);
new MutationObserver(()=>{install();if(currentId)setTimeout(()=>render(currentId),30)}).observe(document.documentElement,{childList:true,subtree:true});
window.DBEST_USER_SHOWCASE_SAFE={version:VERSION,render,load};
})();