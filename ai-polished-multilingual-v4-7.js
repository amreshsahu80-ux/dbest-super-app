(() => {
'use strict';
const VERSION='4.7-polished-multilingual';
const ROLES=new Set(['guest','promoter','prime','leader']);
const LANGS=[
  ['auto','Auto'],['en-IN','English'],['hi-IN','हिन्दी'],['bn-IN','বাংলা'],['or-IN','ଓଡ଼ିଆ'],['ta-IN','தமிழ்'],['te-IN','తెలుగు'],['mr-IN','मराठी'],['gu-IN','ગુજરાતી'],['kn-IN','ಕನ್ನಡ'],['ml-IN','മലയാളം'],['pa-IN','ਪੰਜਾਬੀ'],['ur-IN','اردو'],['as-IN','অসমীয়া']
];
let turn=0,recognition=null,listening=false,manualStop=false,finalText='',interimText='',silenceTimer=null,hardTimer=null,lastResultAt=0,currentUtterance=null,voices=[];
const $=id=>document.getElementById(id);
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
const session=()=>{try{return JSON.parse(localStorage.getItem('d2_session')||'{}')||{}}catch{return{}}};
const member=()=>{const s=session();return !!(s.id&&ROLES.has(String(s.role||'')))};
const base=()=>window.__DBEST_AI_SAFE_V3__||null;

function selectedLang(){try{return localStorage.getItem('dbest_ai_lang_v47')||'auto'}catch{return'auto'}}
function setLang(v){try{localStorage.setItem('dbest_ai_lang_v47',v)}catch{}}
function appLocale(){
  const chosen=selectedLang();if(chosen!=='auto')return chosen;
  try{const d=String(localStorage.getItem('d2_lang')||'').toLowerCase();const m={en:'en-IN',hi:'hi-IN',bn:'bn-IN',od:'or-IN',or:'or-IN',ta:'ta-IN',te:'te-IN',mr:'mr-IN',gu:'gu-IN',kn:'kn-IN',ml:'ml-IN',pa:'pa-IN',ur:'ur-IN',as:'as-IN'};if(m[d])return m[d]}catch{}
  const n=String(navigator.language||'en-IN');return n.includes('-')?n:'en-IN';
}
function scriptLocale(text){
  const s=String(text||'');
  if(/[\u0B80-\u0BFF]/.test(s))return'ta-IN';
  if(/[\u0C00-\u0C7F]/.test(s))return'te-IN';
  if(/[\u0C80-\u0CFF]/.test(s))return'kn-IN';
  if(/[\u0D00-\u0D7F]/.test(s))return'ml-IN';
  if(/[\u0A80-\u0AFF]/.test(s))return'gu-IN';
  if(/[\u0A00-\u0A7F]/.test(s))return'pa-IN';
  if(/[\u0600-\u06FF]/.test(s))return'ur-IN';
  if(/[\u0B00-\u0B7F]/.test(s))return'or-IN';
  if(/[\u0980-\u09FF]/.test(s))return'bn-IN';
  if(/[\u0900-\u097F]/.test(s))return selectedLang()==='mr-IN'?'mr-IN':'hi-IN';
  return appLocale();
}

const SERVICE_PATTERNS={
  car:/\b(cab|taxi|ride|pickup|drop)\b|कैब|टैक्सी|कॅब|ট্যাক্সি|ক্যাব|କ୍ୟାବ|ଟାକ୍ସି|கேப்|டாக்ஸி|క్యాబ్|టాక్సీ|કેબ|ટેક્સી|ಕ್ಯಾಬ್|ಟ್ಯಾಕ್ಸಿ|കാബ്|ടാക്സി|ਕੈਬ|ਟੈਕਸੀ|کیب|ٹیکسی/i,
  flights:/\b(flight|air ticket|airfare)\b|फ्लाइट|हवाई टिकट|ফ্লাইট|বিমান টিকিট|ଫ୍ଲାଇଟ୍|ବିମାନ ଟିକେଟ|ஃப்ளைட்|விமானம்|ఫ్లైట్|విమానం|ફ્લાઇટ|ವಿಮಾನ|ಫ್ಲೈಟ್|ഫ്ലൈറ്റ്|വിമാനം|ਫਲਾਈਟ|پرواز|فلائٹ/i,
  hotel:/\b(hotel|room booking|stay)\b|होटल|हॉटेल|হোটেল|ହୋଟେଲ|ஹோட்டல்|హోటల్|હોટેલ|ಹೋಟೆಲ್|ഹോട്ടൽ|ਹੋਟਲ|ہوٹل/i,
  package:/\b(package|holiday|tour|itinerary)\b|पैकेज|टूर|पॅकेज|ট্যুর|প্যাকেজ|ପ୍ୟାକେଜ|ଟୁର|பேக்கேஜ்|டூர்|ప్యాకేజ్|టూర్|પેકેજ|ટૂર|ಪ್ಯಾಕೇಜ್|ಟೂರ್|പാക്കേജ്|ടൂർ|ਪੈਕੇਜ|ਟੂਰ|پیکیج|ٹور/i,
  insurance:/\b(life insurance|term insurance|health insurance|mediclaim|motor insurance|vehicle insurance|insurance)\b|जीवन बीमा|टर्म इंश्योरेंस|स्वास्थ्य बीमा|हेल्थ इंश्योरेंस|मोटर बीमा|विमा|बीमा|বীমা|ଇନ୍ସୁରେନ୍ସ|ବୀମା|காப்பீடு|இன்சூரன்ஸ்|బీమా|ఇన్సూరెన్స్|વીમો|ಇನ್ಶುರೆನ್ಸ್|ವಿಮೆ|ഇൻഷുറൻസ്|ਬੀਮਾ|انشورنس/i,
  mf:/\b(mutual fund|sip|lumpsum|portfolio)\b|म्यूचुअल फंड|म्युच्युअल फंड|एसआईपी|एसआयपी|মিউচুয়াল ফান্ড|এসআইপি|ମ୍ୟୁଚୁଆଲ୍ ଫଣ୍ଡ|எஸ்.?ஐ.?பி|மியூச்சுவல் ஃபண்ட்|మ్యూచువల్ ఫండ్|એસઆઈપી|મ્યુચ્યુઅલ ફંડ|ಮ್ಯೂಚುವಲ್ ಫಂಡ್|ಮ್ಯೂಚುವಲ್ ಫಂಡ್|മ്യൂച്വൽ ഫണ്ട്|ਐਸਆਈਪੀ|ਮਿਊਚੁਅਲ ਫੰਡ|میوچل فنڈ/i
};
function explicitService(text){for(const [k,re] of Object.entries(SERVICE_PATTERNS))if(re.test(String(text||'')))return k;return''}
function subtype(text,service){const t=String(text||'');if(service==='insurance'){if(/life|term|जीवन|टर्म|জীবন|ஜீவன்|లైఫ్|જીવન|ಜೀವ|ലൈഫ്|ਜੀਵਨ|لائف/i.test(t))return'Life Insurance';if(/health|mediclaim|स्वास्थ्य|हेल्थ|স্বাস্থ্য|ஹெல்த்|ఆరోగ్య|હેલ્થ|ಆರೋಗ್ಯ|ഹെൽത്ത്|ਸਿਹਤ|ہیلتھ/i.test(t))return'Health Insurance';if(/motor|vehicle|car insurance|bike insurance|मोटर|वाहन|গাড়ি|வாகன|వాహన|વાહન|ವಾಹನ|വാഹന|ਵਾਹਨ|گاڑی/i.test(t))return'Motor Insurance';return'Insurance';}if(service==='hotel')return'Hotel Booking';if(service==='package')return'Tour Package';if(service==='flights')return'Flight Booking';if(service==='car')return'Cab Booking';if(service==='mf')return'Mutual Fund Investment';return''}
function conservativeTask(text){
  const service=explicitService(text);if(!service)return null;
  const b=base();let parsed=null;try{parsed=b?.parse?b.parse(text):null}catch{}
  if(parsed)return parsed;
  if(service==='car')return{route:'car',subsection:'Cab Booking',taskData:{}};
  if(service==='flights')return{route:'flights',subsection:'Flight Booking',taskData:{}};
  if(service==='hotel')return{route:'travel',subsection:'Hotel Booking',taskData:{}};
  if(service==='package')return{route:'travel',subsection:'Tour Package',taskData:{}};
  if(service==='insurance')return{route:'insurance',subsection:subtype(text,service),taskData:{insuranceType:subtype(text,service)}};
  if(service==='mf')return{route:'mf',subsection:'Mutual Fund Investment',taskData:{investmentType:/\bsip\b|एसआईपी|এসআইপি|எஸ்.?ஐ.?பி|ఎస్.?ఐ.?పి|ਐਸਆਈਪੀ/i.test(text)?'SIP':''}};
  return null;
}

function mergeNovel(a,b){a=norm(a);b=norm(b);if(!b)return a;if(!a)return b;const aw=a.toLowerCase().split(' '),bw=b.toLowerCase().split(' ');if(a.toLowerCase()===b.toLowerCase())return a;if(b.toLowerCase().startsWith(a.toLowerCase()+' '))return b;if(a.toLowerCase().endsWith(' '+b.toLowerCase()))return a;for(let k=Math.min(aw.length,bw.length);k>0;k--){let ok=true;for(let i=0;i<k;i++)if(aw[aw.length-k+i]!==bw[i]){ok=false;break}if(ok)return norm(a+' '+b.split(' ').slice(k).join(' '));}return norm(a+' '+b)}
function combined(){return mergeNovel(finalText,interimText)}
function corrupted(text){const w=norm(text).toLowerCase().split(' ').filter(Boolean);if(w.length>42)return true;if(w.length<14)return false;const unique=new Set(w).size;if(1-unique/w.length>.5)return true;for(let n=3;n<=5;n++){const seen=new Map();for(let i=0;i+n<=w.length;i++){const p=w.slice(i,i+n).join(' ');seen.set(p,(seen.get(p)||0)+1);if(seen.get(p)>=3)return true}}return false}

function loadVoices(){try{voices=speechSynthesis.getVoices()||[]}catch{voices=[]}}
loadVoices();if('speechSynthesis'in window)speechSynthesis.onvoiceschanged=loadVoices;
function chooseVoice(locale){const want=String(locale||'en-IN').toLowerCase(),bl=want.split('-')[0];let best=null,score=-1;for(const v of voices){const l=String(v.lang||'').toLowerCase(),n=String(v.name||'').toLowerCase();let s=0;if(l===want)s+=60;else if(l.split('-')[0]===bl)s+=35;else continue;if(/google|speech services by google/.test(n))s+=30;if(/female|woman|heera|swara|veena|aditi|neerja|priya/.test(n))s+=8;if(v.localService)s+=4;if(s>score){score=s;best=v}}return best}
function speak(text,locale){try{if(!('speechSynthesis'in window)||!text)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(String(text));currentUtterance=u;u.lang=locale||appLocale();u.rate=.94;u.pitch=1;const v=chooseVoice(u.lang);if(v)u.voice=v;u.onend=u.onerror=()=>{if(currentUtterance===u)currentUtterance=null;const st=$('a47Status');if(st)st.textContent='Ready'};speechSynthesis.speak(u)}catch{}}
function stopSpeak(){try{speechSynthesis.cancel()}catch{}currentUtterance=null}

function replyFor(task,locale){const sub=task?.subsection||'DBest service';const map={
  'hi-IN':`ज़रूर। मैं ${sub} सेक्शन खोल रही हूँ।`,'bn-IN':`অবশ্যই। আমি ${sub} বিভাগ খুলছি।`,'or-IN':`ନିଶ୍ଚୟ। ମୁଁ ${sub} ବିଭାଗ ଖୋଲୁଛି।`,'ta-IN':`நிச்சயமாக. ${sub} பகுதியைத் திறக்கிறேன்.`,'te-IN':`తప్పకుండా. ${sub} విభాగాన్ని తెరుస్తున్నాను.`,'mr-IN':`नक्की. मी ${sub} विभाग उघडत आहे.`,'gu-IN':`ચોક્કસ. હું ${sub} વિભાગ ખોલી રહી છું.`,'kn-IN':`ಖಂಡಿತ. ನಾನು ${sub} ವಿಭಾಗವನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ.`,'ml-IN':`തീർച്ചയായും. ഞാൻ ${sub} വിഭാഗം തുറക്കുന്നു.`,'pa-IN':`ਜ਼ਰੂਰ। ਮੈਂ ${sub} ਸੈਕਸ਼ਨ ਖੋਲ੍ਹ ਰਹੀ ਹਾਂ।`,'ur-IN':`ضرور۔ میں ${sub} سیکشن کھول رہی ہوں۔`,'as-IN':`নিশ্চয়। মই ${sub} বিভাগ খুলি আছোঁ।`,'en-IN':`Sure. I’m opening the ${sub} section.`};return map[locale]||map['en-IN']}
function clarify(locale){const map={'hi-IN':'कृपया सर्विस का नाम साफ़ बोलें—जैसे Cab, Flight, Hotel, Insurance या SIP।','bn-IN':'দয়া করে সার্ভিসের নাম স্পষ্ট করে বলুন—যেমন Cab, Flight, Hotel, Insurance বা SIP।','or-IN':'ଦୟାକରି ସେବାର ନାମ ସ୍ପଷ୍ଟ କରି କହନ୍ତୁ—Cab, Flight, Hotel, Insurance କିମ୍ବା SIP।','ta-IN':'சேவையின் பெயரைத் தெளிவாக சொல்லுங்கள்—Cab, Flight, Hotel, Insurance அல்லது SIP.','te-IN':'సేవ పేరును స్పష్టంగా చెప్పండి—Cab, Flight, Hotel, Insurance లేదా SIP.','mr-IN':'कृपया सर्विसचे नाव स्पष्ट सांगा—Cab, Flight, Hotel, Insurance किंवा SIP.','gu-IN':'કૃપા કરીને સર્વિસનું નામ સ્પષ્ટ કહો—Cab, Flight, Hotel, Insurance અથવા SIP.','kn-IN':'ದಯವಿಟ್ಟು ಸೇವೆಯ ಹೆಸರನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ಹೇಳಿ—Cab, Flight, Hotel, Insurance ಅಥವಾ SIP.','ml-IN':'സേവനത്തിന്റെ പേര് വ്യക്തമായി പറയുക—Cab, Flight, Hotel, Insurance അല്ലെങ്കിൽ SIP.','pa-IN':'ਕਿਰਪਾ ਕਰਕੇ ਸਰਵਿਸ ਦਾ ਨਾਮ ਸਾਫ਼ ਬੋਲੋ—Cab, Flight, Hotel, Insurance ਜਾਂ SIP।','ur-IN':'براہ کرم سروس کا نام واضح طور پر کہیں—Cab، Flight، Hotel، Insurance یا SIP۔','as-IN':'অনুগ্ৰহ কৰি সেৱাৰ নাম স্পষ্টকৈ কওক—Cab, Flight, Hotel, Insurance অথবা SIP।','en-IN':'Please say the service name clearly—Cab, Flight, Hotel, Insurance or SIP.'};return map[locale]||map['en-IN']}

['dbest-ai-safe-host','dbest-ai-v4-host','dbest-ai-v45-host','dbest-ai-v46-host','dbest-ai-v47-host'].forEach(id=>document.getElementById(id)?.remove());
const host=document.createElement('div');host.id='dbest-ai-v47-host';host.style.cssText='position:fixed;right:12px;bottom:12px;z-index:2147483200;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;pointer-events:none';
host.innerHTML=`<style>#dbest-ai-v47-host *{box-sizing:border-box}.v47fab,.v47panel{pointer-events:auto}.v47fab{width:58px;height:58px;border:0;border-radius:50%;background:linear-gradient(145deg,#075ff5,#6b42ff);color:#fff;font-size:24px;box-shadow:0 12px 30px #183b9b55}.v47panel{display:none;width:min(390px,calc(100vw - 24px));max-height:min(540px,calc(100dvh - 86px));background:#fff;border:1px solid #dfe6f2;border-radius:20px;overflow:hidden;box-shadow:0 20px 55px #10204444;margin-bottom:10px}.v47panel.open{display:flex;flex-direction:column}.v47head{background:linear-gradient(135deg,#0b3f9d,#1769ff,#6945ff);color:#fff;padding:13px;display:flex;gap:8px;align-items:center}.v47title{font-size:17px;font-weight:900}.v47sub{font-size:10px;opacity:.9}.v47x{margin-left:auto;width:34px;height:34px;border:0;border-radius:10px;background:#ffffff22;color:#fff;font-size:20px}.v47tools{padding:9px 11px;border-bottom:1px solid #e8edf5;display:flex;gap:8px;align-items:center;background:#fbfcff}.v47select{flex:1;border:1px solid #cbd7e9;border-radius:10px;padding:8px 10px;background:#fff;font-size:13px}.v47hint{font-size:10px;color:#64748b}.v47msgs{padding:11px;min-height:105px;max-height:275px;overflow:auto;background:#f6f8fc;display:flex;flex-direction:column;gap:8px}.v47msg{padding:9px 11px;border-radius:13px;font-size:12.5px;line-height:1.45;max-width:92%}.v47u{align-self:flex-end;background:#1268ff;color:#fff;max-height:92px;overflow:auto}.v47a{align-self:flex-start;background:#fff;border:1px solid #e3e8f1;color:#17243c}.v47compose{padding:10px;border-top:1px solid #e5e9f1;display:flex;gap:7px}.v47input{flex:1;min-width:0;border:1px solid #ced8e8;border-radius:12px;padding:10px 11px;font-size:16px}.v47btn{width:42px;height:42px;border:0;border-radius:12px}.v47mic{background:#edf4ff}.v47send{background:#1268ff;color:#fff}.v47status{padding:0 11px 10px;color:#63728a;font-size:10px}</style><div class="v47panel" id="a47Panel"><div class="v47head"><div><div class="v47title">Ask DBest AI</div><div class="v47sub">Multilingual voice • conservative routing • partner prefill</div></div><button class="v47x" id="a47Close">×</button></div><div class="v47tools"><select class="v47select" id="a47Lang"></select><span class="v47hint">Choose speech language for best accuracy</span></div><div class="v47msgs" id="a47Msgs"><div class="v47msg v47a">Choose your speaking language, then speak one complete request. I won’t guess a service from an unclear transcript.</div></div><div class="v47compose"><input class="v47input" id="a47Input" placeholder="Type or tap mic…"><button class="v47btn v47mic" id="a47Mic">🎙️</button><button class="v47btn v47send" id="a47Send">➤</button></div><div class="v47status" id="a47Status">Ready</div></div><button class="v47fab" id="a47Fab">🎙️</button>`;document.body.appendChild(host);
const panel=$('a47Panel'),fab=$('a47Fab'),input=$('a47Input'),msgs=$('a47Msgs'),status=$('a47Status'),mic=$('a47Mic'),sel=$('a47Lang');
LANGS.forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;sel.appendChild(o)});sel.value=selectedLang();sel.onchange=()=>{setLang(sel.value);status.textContent=sel.value==='auto'?'Auto uses DBest/device language hint':`Speech language: ${sel.options[sel.selectedIndex].text}`};
const add=(t,w)=>{const d=document.createElement('div');d.className='v47msg '+(w==='u'?'v47u':'v47a');d.textContent=String(t||'');msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight};
$('a47Close').onclick=()=>{panel.classList.remove('open');fab.style.display='block'};

async function submit(raw,source='text'){
  const text=norm(raw||input.value);if(!text||!member())return;turn++;stopSpeak();input.value='';add(text,'u');const locale=source==='voice'?appLocale():scriptLocale(text);status.textContent='Understanding…';
  if(corrupted(text)){const r=clarify(locale);add(r,'a');speak(r,locale);status.textContent='Please repeat';return}
  const task=conservativeTask(text);
  if(task){const r=replyFor(task,locale);add(r,'a');status.textContent='Opening service…';try{await Promise.resolve(base()?.route?.(task))}catch{}speak(r,locale);status.textContent='Speaking…';return}
  if(source==='voice'){const r=clarify(locale);add(r,'a');speak(r,locale);status.textContent='Please clarify the service';return}
  // Typed open-ended questions may still use cloud AI; voice transactions remain conservative.
  try{const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),7000);const res=await fetch('/api/ai-assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,locale:'auto',history:[]}),signal:ctl.signal});clearTimeout(tm);const d=await res.json().catch(()=>({}));if(!res.ok)throw 0;const r=String(d.reply||'').trim()||clarify(locale);add(r,'a');speak(r,d.languageCode||locale);status.textContent='Speaking…'}catch{const r=clarify(locale);add(r,'a');speak(r,locale);status.textContent='Ready'}
}

function clearTimers(){clearTimeout(silenceTimer);clearTimeout(hardTimer);silenceTimer=hardTimer=null}
function stopRec(){try{recognition?.stop()}catch{}recognition=null}
function finish(){if(!listening)return;listening=false;manualStop=true;clearTimers();stopRec();mic.textContent='🎙️';const t=combined();finalText='';interimText='';if(t){input.value=t;submit(t,'voice')}else status.textContent='No speech heard — tap mic and try again'}
function schedule(){clearTimeout(silenceTimer);silenceTimer=setTimeout(()=>{if(listening&&combined())finish()},2200)}
function startInstance(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){listening=false;mic.textContent='🎙️';status.textContent='Speech recognition unavailable — type instead';return}
  const r=new SR();recognition=r;r.lang=appLocale();r.continuous=true;r.interimResults=true;r.maxAlternatives=1;
  r.onresult=e=>{let finals='',interims='';for(let i=0;i<e.results.length;i++){const t=norm(e.results[i][0]?.transcript);if(!t)continue;if(e.results[i].isFinal)finals=mergeNovel(finals,t);else interims=mergeNovel(interims,t)}if(finals)finalText=mergeNovel(finalText,finals);interimText=interims;lastResultAt=Date.now();input.value=combined();status.textContent=`Listening in ${sel.options[sel.selectedIndex].text}…`;schedule()};
  r.onerror=e=>{recognition=null;if(!listening)return;const c=String(e?.error||'');if(c==='not-allowed'||c==='service-not-allowed'){listening=false;clearTimers();mic.textContent='🎙️';status.textContent='Microphone permission unavailable';return}if(combined()){schedule();return}setTimeout(()=>{if(listening&&!manualStop)startInstance()},300)};
  r.onend=()=>{recognition=null;if(!listening||manualStop)return;const idle=Date.now()-lastResultAt;if(combined()&&idle>2000){finish();return}setTimeout(()=>{if(listening&&!manualStop)startInstance()},200)};
  try{r.start()}catch{recognition=null;setTimeout(()=>{if(listening&&!manualStop)startInstance()},300)}
}
function startListening(){if(!member())return;if(listening){finish();return}stopSpeak();finalText='';interimText='';manualStop=false;lastResultAt=Date.now();listening=true;mic.textContent='■';status.textContent=`Listening in ${sel.options[sel.selectedIndex].text}…`;startInstance();hardTimer=setTimeout(()=>{if(listening)finish()},18000)}
$('a47Send').onclick=()=>submit(undefined,'text');input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit(undefined,'text')}});mic.onclick=e=>{e.preventDefault();e.stopPropagation();startListening()};fab.onclick=e=>{e.preventDefault();e.stopPropagation();if(!member())return;panel.classList.add('open');fab.style.display='none';startListening()};
function sync(){const on=member();host.style.display=on?'block':'none';if(!on){if(listening){listening=false;clearTimers();stopRec()}stopSpeak();panel.classList.remove('open')}}setInterval(sync,500);sync();
window.__DBEST_AI_V47__={version:VERSION,submit,startListening,selectedLang,explicitService,conservativeTask};
})();