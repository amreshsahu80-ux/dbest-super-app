(function(){
'use strict';
const VERSION='20260906-final-ui-authority-v1.2-i18n';
if(window.DBEST_FINAL_UI_AUTHORITY?.version===VERSION)return;

/* Final Cab entry: keep the approved cab6/V16 experience authoritative while
   allowing legacy background booking/tracking APIs to load for compatibility. */
const CAB_BASE='20260905-selected-realmap-v6';
let cabLoad=null;
function selectedCab(){const u=window.DBEST_CAB_SELECTED_UI;return u&&typeof u.open==='function'?u:null}
function ensureSelected(){
  const ready=selectedCab();if(ready)return Promise.resolve(ready);
  if(cabLoad)return cabLoad;
  cabLoad=new Promise(resolve=>{
    let settled=false,tries=0;
    const finish=()=>{const u=selectedCab();if(u||++tries>=25){if(!settled){settled=true;resolve(u||null)}return}setTimeout(finish,80)};
    let s=Array.from(document.scripts||[]).find(x=>/cab-selected-ui-v3\.js/i.test(String(x.src||'')));
    if(!s){s=document.createElement('script');s.src='/cab-selected-ui-v3.js?v='+CAB_BASE+'&finalAuthority=1';s.async=false;s.onerror=()=>{if(!settled){settled=true;resolve(null)}};(document.body||document.documentElement).appendChild(s)}
    finish();
  }).finally(()=>{cabLoad=null});
  return cabLoad;
}
async function openApprovedCab(){
  let u=selectedCab();if(!u)u=await ensureSelected();
  if(u&&typeof u.open==='function'){u.open();return}
  try{typeof toast==='function'?toast('Cab booking is loading. Please tap Cab once more.'):alert('Cab booking is loading. Please tap Cab once more.')}catch(e){}
}
function lockCab(){
  try{Object.defineProperty(window,'openRidePlatform',{configurable:false,enumerable:true,get(){return openApprovedCab},set(){}})}catch(e){try{window.openRidePlatform=openApprovedCab}catch(_){}}
  try{Object.defineProperty(window,'DBEST_ACTIVE_CAB_VERSION',{configurable:false,enumerable:true,get(){return'SELECTED_REALMAP_V16_FINAL'},set(){}})}catch(e){try{window.DBEST_ACTIVE_CAB_VERSION='SELECTED_REALMAP_V16_FINAL'}catch(_){}}
}

/* Safe explanatory membership card. It only intercepts plan-choice clicks and
   never touches active registration forms, camera/file inputs, UPI or submit. */
const PLANS={
 leader:{name:'Leader',price:'₹999',icon:'👑',tone:'#d89b00'},
 prime:{name:'Prime',price:'₹599',icon:'💎',tone:'#1769e8'},
 promoter:{name:'Promoter',price:'₹299',icon:'🛡️',tone:'#18a447'},
 guest:{name:'Guest',price:'₹49',icon:'👤',tone:'#9828c9'}
};
const I18N={
 en:{title:'Choose the Membership that suits you',sub:'Compare benefits before continuing registration',year:'/ year',select:'Select',close:'Close',footer:'Secure registration • Aadhaar KYC • Payout bank account • DBest support',benefits:{leader:['Highest DBest payout tier','Leader team & earnings dashboard','No upline payout above Leader','Eligible same-level referral income','Best for building a larger DBest network'],prime:['Higher payout than Promoter','Team hierarchy & transaction visibility','Eligible hierarchy earnings','Access across eligible services','Strong balance of cost and earning'],promoter:['Earn on eligible services & products','Build customer/member network','Track eligible transactions & earnings','Low entry cost for active promoters','Upgrade as your network grows'],guest:['Lowest-cost DBest membership','Cashback on eligible DBest services','Browse & transact across platform','No need to start as Promoter','Easy upgrade when required']}},
 hi:{title:'अपने लिए सही सदस्यता चुनें',sub:'रजिस्ट्रेशन जारी रखने से पहले लाभों की तुलना करें',year:'/ वर्ष',select:'चुनें',close:'बंद करें',footer:'सुरक्षित रजिस्ट्रेशन • आधार KYC • भुगतान हेतु बैंक खाता • DBest सहायता',benefits:{leader:['DBest का सबसे उच्च payout tier','Leader team और earnings dashboard','Leader के ऊपर कोई upline payout नहीं','समान स्तर referral income के लिए पात्र','बड़ा DBest network बनाने के लिए सर्वोत्तम'],prime:['Promoter से अधिक payout','Team hierarchy और transaction visibility','Hierarchy earnings के लिए पात्र','योग्य DBest सेवाओं तक पहुंच','लागत और earning का अच्छा संतुलन'],promoter:['योग्य सेवाओं और products पर कमाई','Customer/member network बनाएं','Transactions और earnings ट्रैक करें','Active promoters के लिए कम entry cost','Network बढ़ने पर upgrade करें'],guest:['सबसे कम लागत वाली DBest membership','योग्य DBest सेवाओं पर cashback','Platform पर browse और transact करें','Promoter से शुरू करना जरूरी नहीं','आवश्यकता पर आसानी से upgrade करें']}},
 bn:{title:'আপনার জন্য উপযুক্ত মেম্বারশিপ বেছে নিন',sub:'রেজিস্ট্রেশন চালিয়ে যাওয়ার আগে সুবিধাগুলি তুলনা করুন',year:'/ বছর',select:'নির্বাচন করুন',close:'বন্ধ করুন',footer:'নিরাপদ রেজিস্ট্রেশন • Aadhaar KYC • পেআউট ব্যাংক অ্যাকাউন্ট • DBest সহায়তা',benefits:{leader:['DBest-এর সর্বোচ্চ payout tier','Leader team ও earnings dashboard','Leader-এর উপরে কোনো upline payout নেই','একই স্তরের referral income-এর যোগ্য','বড় DBest network তৈরির জন্য সেরা'],prime:['Promoter-এর তুলনায় বেশি payout','Team hierarchy ও transaction visibility','Hierarchy earnings-এর যোগ্য','যোগ্য DBest services-এ access','খরচ ও earning-এর ভালো ভারসাম্য'],promoter:['যোগ্য services ও products থেকে আয়','Customer/member network তৈরি করুন','Transactions ও earnings ট্র্যাক করুন','Active promoters-এর জন্য কম entry cost','Network বাড়লে upgrade করুন'],guest:['সবচেয়ে কম খরচের DBest membership','যোগ্য DBest services-এ cashback','Platform-এ browse ও transact করুন','Promoter দিয়ে শুরু করা বাধ্যতামূলক নয়','প্রয়োজন হলে সহজে upgrade করুন']}},
 or:{title:'ଆପଣଙ୍କ ପାଇଁ ଉପଯୁକ୍ତ ସଦସ୍ୟତା ବାଛନ୍ତୁ',sub:'ରେଜିଷ୍ଟ୍ରେସନ୍ ଜାରି ରଖିବା ପୂର୍ବରୁ ଲାଭଗୁଡ଼ିକ ତୁଳନା କରନ୍ତୁ',year:'/ ବର୍ଷ',select:'ବାଛନ୍ତୁ',close:'ବନ୍ଦ କରନ୍ତୁ',footer:'ସୁରକ୍ଷିତ ରେଜିଷ୍ଟ୍ରେସନ୍ • Aadhaar KYC • payout ବ୍ୟାଙ୍କ ଖାତା • DBest ସହାୟତା',benefits:{leader:['DBest ର ସର୍ବୋଚ୍ଚ payout tier','Leader team ଏବଂ earnings dashboard','Leader ଉପରେ କୌଣସି upline payout ନାହିଁ','ସମାନ ସ୍ତର referral income ପାଇଁ ଯୋଗ୍ୟ','ବଡ଼ DBest network ତିଆରି ପାଇଁ ଶ୍ରେଷ୍ଠ'],prime:['Promoter ଠାରୁ ଅଧିକ payout','Team hierarchy ଏବଂ transaction visibility','Hierarchy earnings ପାଇଁ ଯୋଗ୍ୟ','ଯୋଗ୍ୟ DBest services କୁ access','ଖର୍ଚ୍ଚ ଓ earning ର ଭଲ ସମତୁଳନ'],promoter:['ଯୋଗ୍ୟ services ଓ products ରୁ ଆୟ','Customer/member network ତିଆରି କରନ୍ତୁ','Transactions ଓ earnings track କରନ୍ତୁ','Active promoters ପାଇଁ କମ entry cost','Network ବଢ଼ିଲେ upgrade କରନ୍ତୁ'],guest:['ସବୁଠାରୁ କମ ମୂଲ୍ୟର DBest membership','ଯୋଗ୍ୟ DBest services ରେ cashback','Platform ରେ browse ଓ transact କରନ୍ତୁ','Promoter ଭାବେ ଆରମ୍ଭ କରିବା ଆବଶ୍ୟକ ନୁହେଁ','ଆବଶ୍ୟକତାରେ ସହଜରେ upgrade କରନ୍ତୁ']}},
 ta:{title:'உங்களுக்கு பொருத்தமான உறுப்பினர் திட்டத்தை தேர்வு செய்யுங்கள்',sub:'பதிவை தொடரும் முன் நன்மைகளை ஒப்பிடுங்கள்',year:'/ ஆண்டு',select:'தேர்வு செய்க',close:'மூடு',footer:'பாதுகாப்பான பதிவு • Aadhaar KYC • payout வங்கி கணக்கு • DBest ஆதரவு',benefits:{leader:['DBest இன் உயர்ந்த payout tier','Leader team மற்றும் earnings dashboard','Leader-க்கு மேல் upline payout இல்லை','அதே நிலை referral income பெற தகுதி','பெரிய DBest network உருவாக்க சிறந்தது'],prime:['Promoter-ஐ விட அதிக payout','Team hierarchy மற்றும் transaction visibility','Hierarchy earnings பெற தகுதி','தகுதியான DBest services அணுகல்','செலவு மற்றும் earning-க்கு நல்ல சமநிலை'],promoter:['தகுதியான services மற்றும் products மூலம் சம்பாதிக்கவும்','Customer/member network உருவாக்கவும்','Transactions மற்றும் earnings கண்காணிக்கவும்','Active promoters-க்கு குறைந்த entry cost','Network வளரும்போது upgrade செய்யவும்'],guest:['குறைந்த செலவிலான DBest membership','தகுதியான DBest services-ல் cashback','Platform-ல் browse மற்றும் transact செய்யவும்','Promoter ஆக தொடங்க வேண்டிய அவசியமில்லை','தேவைக்கேற்ப எளிதாக upgrade செய்யவும்']}},
 te:{title:'మీకు సరిపోయే సభ్యత్వాన్ని ఎంచుకోండి',sub:'రిజిస్ట్రేషన్ కొనసాగించే ముందు ప్రయోజనాలను పోల్చండి',year:'/ సంవత్సరం',select:'ఎంచుకోండి',close:'మూసివేయండి',footer:'సురక్షిత రిజిస్ట్రేషన్ • Aadhaar KYC • payout బ్యాంక్ ఖాతా • DBest సహాయం',benefits:{leader:['DBest లో అత్యున్నత payout tier','Leader team మరియు earnings dashboard','Leader పై upline payout ఉండదు','అదే స్థాయి referral income కు అర్హత','పెద్ద DBest network నిర్మించడానికి ఉత్తమం'],prime:['Promoter కంటే ఎక్కువ payout','Team hierarchy మరియు transaction visibility','Hierarchy earnings కు అర్హత','అర్హమైన DBest services కు access','ఖర్చు మరియు earning కు మంచి సమతుల్యత'],promoter:['అర్హమైన services మరియు products పై సంపాదించండి','Customer/member network నిర్మించండి','Transactions మరియు earnings track చేయండి','Active promoters కు తక్కువ entry cost','Network పెరిగినప్పుడు upgrade చేయండి'],guest:['అత్యల్ప ఖర్చు DBest membership','అర్హమైన DBest services పై cashback','Platform లో browse మరియు transact చేయండి','Promoter గా ప్రారంభించాల్సిన అవసరం లేదు','అవసరమైతే సులభంగా upgrade చేయండి']}}
};
function currentLang(){let v='';try{v=String(localStorage.getItem('d2_lang')||'').toLowerCase()}catch(e){}if(!v){try{v=typeof lang!=='undefined'?String(lang).toLowerCase():''}catch(e){}}return I18N[v]?v:'en'}
function planFrom(el){
  if(!el||el.closest?.('#dbestMembershipSafeModal'))return'';
  if(document.querySelector('#dbestSimpleMemberForm,#dbestOwnerSimpleMemberForm'))return'';
  if(el.closest?.('#dbestSimpleMemberForm,#dbestOwnerSimpleMemberForm,.dbestSimpleReg,.dbestOwnerOnboard,.registrationPage'))return'';
  let n=el.closest?.('button,a,[role="button"],.tile,.card,.plan')||el;
  for(let i=0;n&&n!==document.body&&i<4;i++,n=n.parentElement){
    const oc=String(n.getAttribute?.('onclick')||'');const m=oc.match(/reg\(\s*['"](leader|prime|promoter|guest)['"]\s*\)/i);if(m)return m[1].toLowerCase();
    const t=String(n.innerText||n.textContent||'').toLowerCase();
    if(t.length<650){if(t.includes('leader')&&t.includes('999'))return'leader';if(t.includes('prime')&&t.includes('599'))return'prime';if(t.includes('promoter')&&t.includes('299'))return'promoter';if(t.includes('guest')&&(/\b49\b/.test(t)||t.includes('₹49')))return'guest'}
  }
  return'';
}
function style(){if(document.getElementById('dbestMembershipSafeCss'))return;const s=document.createElement('style');s.id='dbestMembershipSafeCss';s.textContent=`
#dbestMembershipSafeModal{position:fixed;inset:0;z-index:2147483000;background:rgba(3,10,25,.68);display:flex;align-items:center;justify-content:center;padding:10px;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;box-sizing:border-box}
.dbsafeShell{width:min(1040px,97vw);max-height:94dvh;overflow:auto;background:#fff;border-radius:20px;padding:16px;box-shadow:0 26px 80px rgba(0,0,0,.38)}
.dbsafeHead{display:flex;gap:10px;align-items:center;margin-bottom:13px}.dbsafeLogo{width:126px;height:42px;object-fit:contain}.dbsafeTitle{flex:1;min-width:0}.dbsafeTitle b{display:block;color:#10234a;font-size:clamp(18px,2.3vw,27px);font-weight:950}.dbsafeTitle small{display:block;color:#758097;margin-top:3px}.dbsafeClose{width:38px;height:38px;border:1px solid #e3e8f0;border-radius:50%;background:#fff;font-size:24px;cursor:pointer}
.dbsafeGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px}.dbsafePlan{border:1px solid #e3e8f0;border-radius:15px;padding:13px 11px;background:#fff;display:flex;flex-direction:column;min-width:0}.dbsafePlan.on{outline:3px solid var(--tone);outline-offset:-2px;background:color-mix(in srgb,var(--tone) 6%,#fff)}.dbsafeIcon{font-size:27px;text-align:center}.dbsafePlan h3{margin:4px 0 0;text-align:center;color:var(--tone);font-size:18px}.dbsafePrice{text-align:center;font-size:25px;font-weight:950;color:#172033;margin:3px 0 10px}.dbsafePrice small{font-size:10px;color:#667085}.dbsafePlan ul{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:7px;flex:1}.dbsafePlan li{font-size:11px;color:#485166;line-height:1.3;padding-left:15px;position:relative}.dbsafePlan li:before{content:'◆';position:absolute;left:0;color:var(--tone);font-size:7px;top:2px}.dbsafeSelect{border:0;border-radius:9px;min-height:38px;background:var(--tone);color:#fff;font-weight:900;cursor:pointer}.dbsafeFoot{margin-top:12px;padding:10px;border-radius:12px;background:#f5f8fd;color:#526075;font-size:11px;text-align:center}
@media(max-width:720px){.dbsafeShell{padding:11px}.dbsafeHead{margin-bottom:9px}.dbsafeLogo{width:90px;height:34px}.dbsafeTitle b{font-size:16px}.dbsafeTitle small{font-size:9px}.dbsafeGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.dbsafePlan{padding:9px 7px}.dbsafePlan h3{font-size:14px}.dbsafePrice{font-size:18px}.dbsafePlan li{font-size:9px}.dbsafeSelect{min-height:34px;font-size:11px}}
`;document.head.appendChild(s)}
function closeCard(){document.getElementById('dbestMembershipSafeModal')?.remove()}
function openCard(selected){style();closeCard();const lng=currentLang(),t=I18N[lng]||I18N.en;const m=document.createElement('div');m.id='dbestMembershipSafeModal';m.setAttribute('lang',lng);m.innerHTML=`<div class="dbsafeShell" role="dialog" aria-modal="true"><div class="dbsafeHead"><img class="dbsafeLogo" src="/dbest-logo.png" alt="DBest"><div class="dbsafeTitle"><b>${t.title}</b><small>${t.sub}</small></div><button type="button" class="dbsafeClose" aria-label="${t.close}">×</button></div><div class="dbsafeGrid">${Object.entries(PLANS).map(([k,p])=>`<section class="dbsafePlan ${selected===k?'on':''}" style="--tone:${p.tone}"><div class="dbsafeIcon">${p.icon}</div><h3>${p.name}</h3><div class="dbsafePrice">${p.price} <small>${t.year}</small></div><ul>${(t.benefits[k]||I18N.en.benefits[k]).map(x=>`<li>${x}</li>`).join('')}</ul><button type="button" class="dbsafeSelect" data-plan="${k}">${t.select} ${p.name}</button></section>`).join('')}</div><div class="dbsafeFoot">${t.footer}</div></div>`;document.body.appendChild(m)}
async function choose(plan){closeCard();const a=window.DBEST_MEMBER_REG_AUTHORITY;if(a&&typeof a.open==='function')return a.open(plan);if(typeof window.reg==='function')return window.reg(plan)}
document.addEventListener('click',e=>{
  const modal=document.getElementById('dbestMembershipSafeModal');
  if(modal){const c=e.target.closest?.('.dbsafeClose');if(c||e.target===modal){e.preventDefault();e.stopImmediatePropagation();closeCard();return}const b=e.target.closest?.('.dbsafeSelect');if(b){e.preventDefault();e.stopImmediatePropagation();choose(b.dataset.plan);return}return}
  const p=planFrom(e.target);if(!p)return;e.preventDefault();e.stopImmediatePropagation();openCard(p);
},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCard()},true);
window.addEventListener('popstate',closeCard);
lockCab();
window.DBEST_FINAL_UI_AUTHORITY={version:VERSION,openCab:openApprovedCab,openMembershipCard:openCard,closeMembershipCard:closeCard,currentLanguage:currentLang};
})();