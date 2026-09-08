(() => {
  'use strict';
  const VERSION='4.6-deduped-conservative-local-first';
  const MEMBER_ROLES=new Set(['guest','promoter','prime','leader']);
  let turn=0, aiAbort=null;
  let recognition=null, listening=false, manualStop=false, finalText='', interimText='', silenceTimer=null, hardTimer=null, lastResultAt=0;
  let currentUtterance=null, voices=[];

  const session=()=>{try{return JSON.parse(localStorage.getItem('d2_session')||'{}')||{}}catch{return{}}};
  const isMember=()=>{const s=session();return !!(s.id&&MEMBER_ROLES.has(String(s.role||'')))};
  const base=()=>window.__DBEST_AI_SAFE_V3__||null;
  const q=id=>document.getElementById(id);
  const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
  const words=s=>norm(s).toLowerCase().split(' ').filter(Boolean);

  function detectLocale(text){
    const s=String(text||'');
    if(/[\u0900-\u097F]/.test(s))return'hi-IN';
    if(/[\u0980-\u09FF]/.test(s))return'bn-IN';
    if(/[\u0B00-\u0B7F]/.test(s))return'or-IN';
    const t=s.toLowerCase();
    const hits=(t.match(/\b(mujhe|mera|mere|meri|apne|liye|chahiye|karna|karo|karni|hai|se|tak|wala|wali|sahi|aap|mujhko)\b/g)||[]).length;
    if(hits>=2)return'hi-IN';
    return'en-IN';
  }
  function langLocale(){
    try{const saved=localStorage.getItem('dbest_ai_voice_locale');if(saved)return saved;const x=String(localStorage.getItem('d2_lang')||'').toLowerCase();if(x==='hi')return'hi-IN';if(x==='bn')return'bn-IN';if(x==='od'||x==='or')return'or-IN'}catch{}
    return navigator.language||'en-IN';
  }
  function rememberLocale(text){try{const l=detectLocale(text);if(l!=='en-IN'||/\b(flight|hotel|cab|insurance|sip|mutual fund)\b/i.test(text))localStorage.setItem('dbest_ai_voice_locale',l)}catch{}}
  function clean(v){return v===undefined||v===null?'':String(v).trim()}

  function mergeNovel(existing,incoming){
    const a=words(existing),b=words(incoming);if(!b.length)return norm(existing);if(!a.length)return norm(incoming);
    const al=a.join(' '),bl=b.join(' ');if(al===bl||al.endsWith(' '+bl)||al===bl)return norm(existing);
    if(bl.startsWith(al+' '))return norm(incoming);
    const max=Math.min(a.length,b.length);
    for(let k=max;k>0;k--){
      let ok=true;for(let i=0;i<k;i++){if(a[a.length-k+i]!==b[i]){ok=false;break}}
      if(ok)return norm(a.concat(b.slice(k)).join(' '));
    }
    // Android may resend a cumulative phrase from its beginning after an internal restart.
    if(b.length>=4){
      const head=b.slice(0,Math.min(5,b.length)).join(' '),idx=al.indexOf(head);
      if(idx>=0){
        const prefix=al.slice(0,idx).trim();
        return norm((prefix?prefix+' ':'')+bl);
      }
    }
    return norm(existing+' '+incoming);
  }
  function combined(){return mergeNovel(finalText,interimText)}
  function repetitionScore(text){
    const w=words(text);if(w.length<10)return 0;const unique=new Set(w).size;return 1-(unique/w.length);
  }
  function looksCorrupted(text){
    const w=words(text);if(w.length>45)return true;if(w.length>=16&&repetitionScore(text)>.52)return true;
    const s=' '+w.join(' ')+' ';for(let n=2;n<=5;n++){for(let i=0;i+n<=w.length;i++){const p=' '+w.slice(i,i+n).join(' ')+' ';const first=s.indexOf(p),last=s.lastIndexOf(p);if(first>=0&&last>first+p.length*2&&n>=3)return true}}
    return false;
  }
  function explicitService(text){
    return /\b(cab|taxi|ride|flight|air ticket|hotel|room booking|package|holiday|tour|itinerary|life insurance|term insurance|health insurance|mediclaim|motor insurance|vehicle insurance|car insurance|bike insurance|mutual fund|sip|lumpsum|portfolio)\b|कैब|टैक्सी|फ्लाइट|हवाई टिकट|होटल|पैकेज|टूर|जीवन बीमा|टर्म इंश्योरेंस|स्वास्थ्य बीमा|हेल्थ इंश्योरेंस|मोटर बीमा|वाहन बीमा|म्यूचुअल फंड|एसआईपी|ক্যাব|ট্যাক্সি|ফ্লাইট|হোটেল|মিউচুয়াল ফান্ড|এসআইপি|କ୍ୟାବ|ଟାକ୍ସି|ଫ୍ଲାଇଟ୍|ହୋଟେଲ|ମ୍ୟୁଚୁଆଲ୍ ଫଣ୍ଡ/i.test(String(text||''));
  }
  function ambiguousMoneyOnly(text){
    const t=norm(text).toLowerCase();return /(?:₹|rs\.?|inr\s*)?\s*\d[\d,]*/.test(t)&&!explicitService(t)&&!/[?]|\b(what|why|how|tell|explain|compare|which|kya|kaise|kyun|batao|bataye)\b/i.test(t);
  }
  function clarification(text){
    const l=detectLocale(text);
    if(l==='hi-IN')return 'मैंने आपकी पूरी बात साफ़ नहीं सुनी। कृपया सर्विस का नाम भी बोलें—जैसे SIP, Loan, Flight, Hotel, Cab या Insurance—ताकि मैं गलत सेक्शन न खोलूँ।';
    if(l==='bn-IN')return 'আপনার পুরো অনুরোধটি পরিষ্কারভাবে ধরা যায়নি। দয়া করে সার্ভিসের নামও বলুন, যাতে ভুল বিভাগ না খুলি।';
    if(l==='or-IN')return 'ଆପଣଙ୍କ ସମ୍ପୂର୍ଣ୍ଣ ଅନୁରୋଧ ସ୍ପଷ୍ଟ ଭାବେ ଧରା ପଡ଼ିଲା ନାହିଁ। ଦୟାକରି ସେବାର ନାମ ମଧ୍ୟ କହନ୍ତୁ।';
    return 'I did not catch the complete request clearly. Please include the service name—such as SIP, Loan, Flight, Hotel, Cab or Insurance—so I do not open the wrong section.';
  }

  function localReply(task,text){
    const l=detectLocale(text),d=task?.taskData||{},sub=task?.subsection||'service';
    const from=clean(d.from||d.pickup),to=clean(d.to||d.drop||d.destination),adults=clean(d.adults),cover=clean(d.sumInsured||d.coverAmount),amount=clean(d.amount);
    if(l==='hi-IN'){
      if(task?.route==='car')return `ज़रूर। ${from&&to?`${from} से ${to} की `:''}कैब बुकिंग खोल रही हूँ।`;
      if(task?.route==='flights')return `ज़रूर। ${from&&to?`${from} से ${to} की `:''}फ्लाइट${adults?`, ${adults} यात्रियों के लिए`:''} खोल रही हूँ।`;
      if(task?.route==='travel'&&String(sub).toLowerCase().includes('hotel'))return `ज़रूर। ${to?`${to} में `:''}होटल बुकिंग खोल रही हूँ और आपकी जानकारी साथ रख रही हूँ।`;
      if(task?.route==='travel')return `ज़रूर। ${sub} सेक्शन खोल रही हूँ और आपकी जानकारी साथ रख रही हूँ।`;
      if(task?.route==='insurance')return `ज़रूर। ${sub}${cover?`, ${cover} कवर के लिए`:''} खोल रही हूँ।`;
      if(task?.route==='mf')return `ज़रूर। ${amount?`${amount} रुपये की `:''}${d.investmentType||'म्यूचुअल फंड'} रिक्वेस्ट खोल रही हूँ।`;
      return `ज़रूर। ${sub} सेक्शन खोल रही हूँ।`;
    }
    if(l==='bn-IN')return `অবশ্যই। ${sub} বিভাগ খুলছি এবং আপনার দেওয়া তথ্য সঙ্গে রাখছি।`;
    if(l==='or-IN')return `ନିଶ୍ଚୟ। ${sub} ବିଭାଗ ଖୋଲୁଛି ଏବଂ ଆପଣଙ୍କ ତଥ୍ୟ ସହିତ ନେଉଛି।`;
    if(task?.route==='car')return `Sure. I’m opening cab booking${from&&to?` from ${from} to ${to}`:''}.`;
    if(task?.route==='flights')return `Sure. I’m opening the flight request${from&&to?` from ${from} to ${to}`:''}${adults?` for ${adults} traveller${Number(adults)===1?'':'s'}`:''}.`;
    if(task?.route==='travel'&&String(sub).toLowerCase().includes('hotel'))return `Sure. I’m opening hotel booking${to?` for ${to}`:''} and carrying your details forward.`;
    if(task?.route==='travel')return `Sure. I’m opening ${sub} and carrying your details forward.`;
    if(task?.route==='insurance')return `Sure. I’m opening ${sub}${cover?` for ${cover} cover`:''}.`;
    if(task?.route==='mf')return `Sure. I’m opening your ${d.investmentType||'mutual fund'} request${amount?` for ₹${amount}`:''}.`;
    return `Sure. I’m opening the ${sub} section.`;
  }

  function loadVoices(){try{voices=window.speechSynthesis?.getVoices?.()||[]}catch{voices=[]}}
  loadVoices();if('speechSynthesis'in window)window.speechSynthesis.onvoiceschanged=loadVoices;
  function chooseVoice(locale){
    const want=String(locale||'en-IN').toLowerCase(),baseLang=want.split('-')[0];let best=null,bestScore=-1;
    for(const v of voices){const l=String(v.lang||'').toLowerCase(),n=String(v.name||'').toLowerCase();let s=0;if(l===want)s+=50;else if(l.split('-')[0]===baseLang)s+=30;else continue;if(/google|speech services by google/.test(n))s+=30;if(/microsoft|samsung/.test(n))s+=12;if(v.localService)s+=5;if(/female|woman|heera|swara|veena|aditi|neerja|priya/.test(n))s+=8;if(s>bestScore){bestScore=s;best=v}}
    return best;
  }
  function speak(text,locale){
    try{if(!('speechSynthesis'in window)||!text)return false;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(String(text));currentUtterance=u;u.lang=locale||'en-IN';u.rate=.94;u.pitch=1.0;const v=chooseVoice(u.lang);if(v)u.voice=v;u.onend=u.onerror=()=>{if(currentUtterance===u)currentUtterance=null;const st=q('a46Status');if(st)st.textContent='Ready'};window.speechSynthesis.speak(u);return true}catch{return false}
  }
  function stopSpeak(){try{window.speechSynthesis?.cancel?.()}catch{}currentUtterance=null}

  const oldIds=['dbest-ai-safe-host','dbest-ai-v4-host','dbest-ai-v45-host','dbest-ai-v46-host'];oldIds.forEach(id=>document.getElementById(id)?.remove());
  const host=document.createElement('div');host.id='dbest-ai-v46-host';host.style.cssText='position:fixed;right:12px;bottom:12px;z-index:2147483200;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;pointer-events:none';
  host.innerHTML=`<style>#dbest-ai-v46-host *{box-sizing:border-box}.a46-fab,.a46-panel{pointer-events:auto}.a46-fab{width:60px;height:60px;border:0;border-radius:50%;background:linear-gradient(145deg,#075ff5,#6b42ff);color:#fff;font-size:25px;box-shadow:0 12px 32px #183b9b55}.a46-panel{display:none;width:min(390px,calc(100vw - 24px));max-height:min(500px,calc(100dvh - 90px));background:#fff;border:1px solid #dfe6f2;border-radius:20px;overflow:hidden;box-shadow:0 20px 55px #10204444;margin-bottom:10px}.a46-panel.open{display:flex;flex-direction:column}.a46-head{background:linear-gradient(135deg,#0b3f9d,#1769ff,#6945ff);color:#fff;padding:13px;display:flex;align-items:center;gap:9px}.a46-title{font-size:16px;font-weight:900}.a46-sub{font-size:10px;opacity:.9}.a46-close{margin-left:auto;width:34px;height:34px;border:0;border-radius:10px;background:#ffffff22;color:#fff;font-size:20px}.a46-msgs{padding:12px;min-height:115px;max-height:300px;overflow:auto;background:#f6f8fc;display:flex;flex-direction:column;gap:8px}.a46-msg{padding:9px 11px;border-radius:13px;font-size:12.5px;line-height:1.45;max-width:92%;white-space:pre-wrap}.a46-u{align-self:flex-end;background:#1268ff;color:#fff}.a46-a{align-self:flex-start;background:#fff;border:1px solid #e3e8f1;color:#17243c}.a46-compose{padding:10px;border-top:1px solid #e5e9f1;display:flex;gap:7px}.a46-input{flex:1;min-width:0;border:1px solid #ced8e8;border-radius:12px;padding:10px 11px;font-size:16px}.a46-btn{width:42px;height:42px;border:0;border-radius:12px}.a46-mic{background:#edf4ff}.a46-send{background:#1268ff;color:#fff}.a46-status{padding:0 11px 10px;color:#63728a;font-size:10px}.a46-toast{display:none;pointer-events:none;margin-bottom:9px;max-width:340px;background:#172033;color:#fff;padding:10px 12px;border-radius:12px;font-size:11px;box-shadow:0 10px 28px #0004}.a46-toast.show{display:block}</style><div class="a46-toast" id="a46Toast"></div><div class="a46-panel" id="a46Panel"><div class="a46-head"><div><div class="a46-title">Ask DBest AI</div><div class="a46-sub">Clean speech • no repeated fragments • no service guessing</div></div><button class="a46-close" id="a46Close">×</button></div><div class="a46-msgs" id="a46Msgs"><div class="a46-msg a46-a">Speak one complete request. I will not guess a service if the speech is unclear.</div></div><div class="a46-compose"><input class="a46-input" id="a46Input" placeholder="Type or tap mic…"><button class="a46-btn a46-mic" id="a46Mic">🎙️</button><button class="a46-btn a46-send" id="a46Send">➤</button></div><div class="a46-status" id="a46Status">Ready</div></div><button class="a46-fab" id="a46Fab">🎙️</button>`;
  document.body.appendChild(host);
  const panel=q('a46Panel'),fab=q('a46Fab'),input=q('a46Input'),msgs=q('a46Msgs'),status=q('a46Status'),mic=q('a46Mic'),toast=q('a46Toast');
  const add=(text,who)=>{const d=document.createElement('div');d.className='a46-msg '+(who==='u'?'a46-u':'a46-a');d.textContent=String(text||'');msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight};
  const notice=(text,ms=6500)=>{toast.textContent=String(text||'');toast.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>toast.classList.remove('show'),ms)};
  const collapse=()=>{panel.classList.remove('open');fab.style.display='block'};q('a46Close').onclick=collapse;

  async function askCloud(text,myTurn){
    try{aiAbort?.abort()}catch{}const ctl=new AbortController();aiAbort=ctl;const tm=setTimeout(()=>ctl.abort(),7000);
    try{const r=await fetch('/api/ai-assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,locale:'auto',history:[]}),signal:ctl.signal});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'AI unavailable');if(myTurn!==turn)throw new DOMException('Stale','AbortError');return d}finally{clearTimeout(tm);if(aiAbort===ctl)aiAbort=null}
  }

  async function submit(raw,source='text'){
    const text=norm(raw||input.value);if(!text||!isMember())return;const myTurn=++turn;stopSpeak();try{aiAbort?.abort()}catch{}input.value='';add(text,'u');status.textContent='Understanding…';rememberLocale(text);
    if(looksCorrupted(text)||(source==='voice'&&ambiguousMoneyOnly(text))){const reply=clarification(text);add(reply,'a');notice(reply,8000);speak(reply,detectLocale(text));status.textContent='Please repeat clearly';return}
    const b=base(),task=b?.parse?b.parse(text):null;
    if(task&&explicitService(text)){
      const reply=localReply(task,text),locale=detectLocale(text);add(reply,'a');notice(reply,8000);status.textContent='Opening service…';try{if(b?.route)await Promise.resolve(b.route(task))}catch{}speak(reply,locale);status.textContent='Speaking…';return;
    }
    if(source==='voice'&&!explicitService(text)){
      // Voice recognition can mishear product names. Never let cloud AI invent a transactional route from an unclear transcript.
      const reply=clarification(text);add(reply,'a');notice(reply,8000);speak(reply,detectLocale(text));status.textContent='Please clarify the service';return;
    }
    try{const d=await askCloud(text,myTurn);if(myTurn!==turn)return;const reply=String(d.reply||'').trim()||'I’m ready for your next request.';add(reply,'a');notice(reply,8000);speak(reply,d.languageCode||detectLocale(text));if(d.route&&b?.route){try{await Promise.resolve(b.route({route:d.route,subsection:d.subsection||'',taskData:d.taskData||{}}))}catch{}}status.textContent='Speaking…'}
    catch(e){if(myTurn!==turn)return;const reply=clarification(text);add(reply,'a');notice(reply,7000);speak(reply,detectLocale(text));status.textContent='Ready'}
  }

  function clearListenTimers(){clearTimeout(silenceTimer);clearTimeout(hardTimer);silenceTimer=hardTimer=null}
  function stopRecognition(){try{recognition?.stop?.()}catch{}recognition=null}
  function finalizeSpeech(){
    if(!listening)return;listening=false;manualStop=true;clearListenTimers();stopRecognition();mic.textContent='🎙️';const text=combined();finalText='';interimText='';
    if(text){input.value=text;status.textContent='Understood — checking request…';submit(text,'voice')}else status.textContent='No speech heard — tap mic and try again';
  }
  function scheduleFinalize(){clearTimeout(silenceTimer);silenceTimer=setTimeout(()=>{if(listening&&combined())finalizeSpeech()},2300)}
  function startRecognizerInstance(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){status.textContent='Speech recognition unavailable — type instead';listening=false;mic.textContent='🎙️';return}
    const r=new SR();recognition=r;r.lang=langLocale();r.continuous=true;r.interimResults=true;r.maxAlternatives=1;
    try{const GL=window.SpeechGrammarList||window.webkitSpeechGrammarList;if(GL){const g=new GL();g.addFromString('#JSGF V1.0; grammar dbest; public <service> = cab | taxi | flight | hotel | insurance | SIP | mutual fund | loan | package ;',1);r.grammars=g}}catch{}
    r.onresult=e=>{
      let finals='',interims='';
      for(let i=0;i<e.results.length;i++){const t=norm(e.results[i][0]?.transcript);if(!t)continue;if(e.results[i].isFinal)finals=mergeNovel(finals,t);else interims=mergeNovel(interims,t)}
      if(finals)finalText=mergeNovel(finalText,finals);interimText=interims;lastResultAt=Date.now();input.value=combined();status.textContent='Listening… waiting for your complete sentence';scheduleFinalize();
    };
    r.onerror=e=>{const code=String(e?.error||'');recognition=null;if(!listening)return;if(code==='not-allowed'||code==='service-not-allowed'){listening=false;clearListenTimers();mic.textContent='🎙️';status.textContent='Microphone permission unavailable';return}if(combined()){scheduleFinalize();return}setTimeout(()=>{if(listening&&!manualStop)startRecognizerInstance()},250)};
    r.onend=()=>{recognition=null;if(!listening||manualStop)return;const idle=Date.now()-lastResultAt;if(combined()&&idle>2100){finalizeSpeech();return}setTimeout(()=>{if(listening&&!manualStop)startRecognizerInstance()},180)};
    try{r.start()}catch{recognition=null;setTimeout(()=>{if(listening&&!manualStop)startRecognizerInstance()},300)}
  }
  function startListening(){
    if(!isMember())return;if(listening){finalizeSpeech();return}stopSpeak();try{aiAbort?.abort()}catch{};finalText='';interimText='';manualStop=false;lastResultAt=Date.now();listening=true;mic.textContent='■';status.textContent='Listening… speak one complete request';startRecognizerInstance();clearTimeout(hardTimer);hardTimer=setTimeout(()=>{if(listening)finalizeSpeech()},18000)
  }

  q('a46Send').onclick=()=>submit(undefined,'text');input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit(undefined,'text')}});mic.onclick=e=>{e.preventDefault();e.stopPropagation();startListening()};fab.onclick=e=>{e.preventDefault();e.stopPropagation();if(!isMember())return;panel.classList.add('open');fab.style.display='none';startListening()};
  function sync(){const on=isMember();host.style.display=on?'block':'none';if(!on){if(listening){listening=false;clearListenTimers();stopRecognition()}stopSpeak();panel.classList.remove('open')}}setInterval(sync,500);sync();
  window.__DBEST_AI_STABLE_V46__={version:VERSION,submit,startListening,finalizeSpeech,chooseVoice,mergeNovel,looksCorrupted};
})();