(() => {
  'use strict';
  const VERSION='4.5-stable-buffered-local-first';
  const MEMBER_ROLES=new Set(['guest','promoter','prime','leader']);
  let turn=0, aiAbort=null;
  let recognition=null, listening=false, manualStop=false, buffered='', interim='', silenceTimer=null, hardTimer=null, lastResultAt=0;
  let currentUtterance=null, voices=[];

  const session=()=>{try{return JSON.parse(localStorage.getItem('d2_session')||'{}')||{}}catch{return{}}};
  const isMember=()=>{const s=session();return !!(s.id&&MEMBER_ROLES.has(String(s.role||'')))};
  const base=()=>window.__DBEST_AI_SAFE_V3__||null;
  const q=id=>document.getElementById(id);

  function detectLocale(text){const s=String(text||'');if(/[\u0900-\u097F]/.test(s))return'hi-IN';if(/[\u0980-\u09FF]/.test(s))return'bn-IN';if(/[\u0B00-\u0B7F]/.test(s))return'or-IN';return'en-IN'}
  function langLocale(){try{const x=String(localStorage.getItem('d2_lang')||'').toLowerCase();if(x==='hi')return'hi-IN';if(x==='bn')return'bn-IN';if(x==='od'||x==='or')return'or-IN'}catch{};return navigator.language||'en-IN'}
  function clean(v){return v===undefined||v===null?'':String(v).trim()}

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
    const want=String(locale||'en-IN').toLowerCase(),baseLang=want.split('-')[0];
    let best=null,bestScore=-1;
    for(const v of voices){
      const l=String(v.lang||'').toLowerCase(),n=String(v.name||'').toLowerCase();let s=0;
      if(l===want)s+=50;else if(l.split('-')[0]===baseLang)s+=30;else continue;
      if(/google|speech services by google/.test(n))s+=25;
      if(/microsoft|samsung/.test(n))s+=12;
      if(v.localService)s+=5;
      if(/female|woman|heera|swara|veena|aditi|neerja|priya/.test(n))s+=8;
      if(s>bestScore){bestScore=s;best=v}
    }
    return best;
  }
  function speak(text,locale){
    try{
      if(!('speechSynthesis'in window)||!text)return false;
      window.speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(String(text));currentUtterance=u;u.lang=locale||'en-IN';u.rate=.95;u.pitch=1.01;
      const v=chooseVoice(u.lang);if(v)u.voice=v;
      u.onend=u.onerror=()=>{if(currentUtterance===u)currentUtterance=null;const st=q('a45Status');if(st)st.textContent='Ready for your next request'};
      window.speechSynthesis.speak(u);return true;
    }catch{return false}
  }
  function stopSpeak(){try{window.speechSynthesis?.cancel?.()}catch{}currentUtterance=null}

  const old1=document.getElementById('dbest-ai-safe-host');if(old1)old1.remove();
  const old4=document.getElementById('dbest-ai-v4-host');if(old4)old4.remove();
  const old45=document.getElementById('dbest-ai-v45-host');if(old45)old45.remove();
  const host=document.createElement('div');host.id='dbest-ai-v45-host';host.style.cssText='position:fixed;right:12px;bottom:12px;z-index:2147483200;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;pointer-events:none';
  host.innerHTML=`<style>#dbest-ai-v45-host *{box-sizing:border-box}.a45-fab,.a45-panel{pointer-events:auto}.a45-fab{width:60px;height:60px;border:0;border-radius:50%;background:linear-gradient(145deg,#075ff5,#6b42ff);color:#fff;font-size:25px;box-shadow:0 12px 32px #183b9b55}.a45-panel{display:none;width:min(390px,calc(100vw - 24px));max-height:min(500px,calc(100dvh - 90px));background:#fff;border:1px solid #dfe6f2;border-radius:20px;overflow:hidden;box-shadow:0 20px 55px #10204444;margin-bottom:10px}.a45-panel.open{display:flex;flex-direction:column}.a45-head{background:linear-gradient(135deg,#0b3f9d,#1769ff,#6945ff);color:#fff;padding:13px;display:flex;align-items:center;gap:9px}.a45-title{font-size:16px;font-weight:900}.a45-sub{font-size:10px;opacity:.9}.a45-close{margin-left:auto;width:34px;height:34px;border:0;border-radius:10px;background:#ffffff22;color:#fff;font-size:20px}.a45-msgs{padding:12px;min-height:115px;max-height:300px;overflow:auto;background:#f6f8fc;display:flex;flex-direction:column;gap:8px}.a45-msg{padding:9px 11px;border-radius:13px;font-size:12.5px;line-height:1.45;max-width:92%;white-space:pre-wrap}.a45-u{align-self:flex-end;background:#1268ff;color:#fff}.a45-a{align-self:flex-start;background:#fff;border:1px solid #e3e8f1;color:#17243c}.a45-compose{padding:10px;border-top:1px solid #e5e9f1;display:flex;gap:7px}.a45-input{flex:1;min-width:0;border:1px solid #ced8e8;border-radius:12px;padding:10px 11px;font-size:16px}.a45-btn{width:42px;height:42px;border:0;border-radius:12px}.a45-mic{background:#edf4ff}.a45-send{background:#1268ff;color:#fff}.a45-status{padding:0 11px 10px;color:#63728a;font-size:10px}.a45-toast{display:none;pointer-events:none;margin-bottom:9px;max-width:340px;background:#172033;color:#fff;padding:10px 12px;border-radius:12px;font-size:11px;box-shadow:0 10px 28px #0004}.a45-toast.show{display:block}</style><div class="a45-toast" id="a45Toast"></div><div class="a45-panel" id="a45Panel"><div class="a45-head"><div><div class="a45-title">Ask DBest AI</div><div class="a45-sub">Buffered speech • stable local routing • high-quality device voice</div></div><button class="a45-close" id="a45Close">×</button></div><div class="a45-msgs" id="a45Msgs"><div class="a45-msg a45-a">Speak naturally, including short pauses. I’ll wait for the complete request before acting.</div></div><div class="a45-compose"><input class="a45-input" id="a45Input" placeholder="Type or tap mic…"><button class="a45-btn a45-mic" id="a45Mic">🎙️</button><button class="a45-btn a45-send" id="a45Send">➤</button></div><div class="a45-status" id="a45Status">Ready</div></div><button class="a45-fab" id="a45Fab">🎙️</button>`;
  document.body.appendChild(host);
  const panel=q('a45Panel'),fab=q('a45Fab'),input=q('a45Input'),msgs=q('a45Msgs'),status=q('a45Status'),mic=q('a45Mic'),toast=q('a45Toast');
  const add=(text,who)=>{const d=document.createElement('div');d.className='a45-msg '+(who==='u'?'a45-u':'a45-a');d.textContent=String(text||'');msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight};
  const notice=(text,ms=6500)=>{toast.textContent=String(text||'');toast.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>toast.classList.remove('show'),ms)};
  const collapse=()=>{panel.classList.remove('open');fab.style.display='block'};
  q('a45Close').onclick=collapse;

  async function askCloud(text,myTurn){
    try{aiAbort?.abort()}catch{}const ctl=new AbortController();aiAbort=ctl;const tm=setTimeout(()=>ctl.abort(),7000);
    try{const r=await fetch('/api/ai-assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,locale:'auto',history:[]}),signal:ctl.signal});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'AI unavailable');if(myTurn!==turn)throw new DOMException('Stale','AbortError');return d}finally{clearTimeout(tm);if(aiAbort===ctl)aiAbort=null}
  }

  async function submit(raw){
    const text=String(raw||input.value||'').trim();if(!text||!isMember())return;
    const myTurn=++turn;stopSpeak();try{aiAbort?.abort()}catch{}input.value='';add(text,'u');status.textContent='Understanding…';
    const b=base(),task=b?.parse?b.parse(text):null;
    if(task){
      const reply=localReply(task,text),locale=detectLocale(text);add(reply,'a');notice(reply,8000);status.textContent='Opening service…';
      try{if(b?.route)await Promise.resolve(b.route(task))}catch{}
      speak(reply,locale);status.textContent='Speaking…';return;
    }
    try{
      const d=await askCloud(text,myTurn);if(myTurn!==turn)return;const reply=String(d.reply||'').trim()||'I’m ready for your next request.';add(reply,'a');notice(reply,8000);speak(reply,d.languageCode||detectLocale(text));
      if(d.route&&b?.route){try{await Promise.resolve(b.route({route:d.route,subsection:d.subsection||'',taskData:d.taskData||{}}))}catch{}}
      status.textContent='Speaking…';
    }catch(e){if(myTurn!==turn)return;const fallback=detectLocale(text)==='hi-IN'?'क्लाउड एआई अभी व्यस्त है। आप कैब, फ्लाइट, होटल, इंश्योरेंस या म्यूचुअल फंड की रिक्वेस्ट सीधे बोल सकते हैं।':'Cloud AI is temporarily busy. You can still ask for Cab, Flight, Hotel, Insurance or Mutual Fund services directly.';add(fallback,'a');notice(fallback,7000);speak(fallback,detectLocale(text));status.textContent='Ready'}
  }

  function clearListenTimers(){clearTimeout(silenceTimer);clearTimeout(hardTimer);silenceTimer=hardTimer=null}
  function combined(){return `${buffered} ${interim}`.replace(/\s+/g,' ').trim()}
  function stopRecognition(){try{recognition?.stop?.()}catch{}recognition=null}
  function finalizeSpeech(){
    if(!listening)return;listening=false;manualStop=true;clearListenTimers();stopRecognition();mic.textContent='🎙️';
    const text=combined();buffered='';interim='';if(text){input.value=text;status.textContent='Understood — preparing response…';submit(text)}else status.textContent='No speech heard — tap mic and try again';
  }
  function scheduleFinalize(){clearTimeout(silenceTimer);silenceTimer=setTimeout(()=>{if(listening&&combined())finalizeSpeech()},1900)}
  function startRecognizerInstance(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){status.textContent='Speech recognition unavailable — type instead';listening=false;mic.textContent='🎙️';return}
    const r=new SR();recognition=r;r.lang=langLocale();r.continuous=true;r.interimResults=true;r.maxAlternatives=1;
    r.onresult=e=>{
      let newFinal='',newInterim='';
      for(let i=e.resultIndex;i<e.results.length;i++){const t=String(e.results[i][0]?.transcript||'').trim();if(!t)continue;if(e.results[i].isFinal)newFinal+=(newFinal?' ':'')+t;else newInterim+=(newInterim?' ':'')+t}
      if(newFinal)buffered=(buffered+' '+newFinal).replace(/\s+/g,' ').trim();interim=newInterim;lastResultAt=Date.now();input.value=combined();status.textContent='Listening… I’ll wait for the full sentence';scheduleFinalize();
    };
    r.onerror=e=>{
      const code=String(e?.error||'');recognition=null;
      if(!listening)return;
      if(code==='not-allowed'||code==='service-not-allowed'){listening=false;clearListenTimers();mic.textContent='🎙️';status.textContent='Microphone permission unavailable';return}
      if(combined()){scheduleFinalize();return}
      if(code==='no-speech'){setTimeout(()=>{if(listening)startRecognizerInstance()},180);return}
      setTimeout(()=>{if(listening)startRecognizerInstance()},250);
    };
    r.onend=()=>{
      recognition=null;if(!listening||manualStop)return;
      const idle=Date.now()-lastResultAt;if(combined()&&idle>1700){finalizeSpeech();return}
      setTimeout(()=>{if(listening&&!manualStop)startRecognizerInstance()},120);
    };
    try{r.start()}catch{recognition=null;setTimeout(()=>{if(listening)startRecognizerInstance()},250)}
  }
  function startListening(){
    if(!isMember())return;if(listening){finalizeSpeech();return}
    stopSpeak();try{aiAbort?.abort()}catch{};buffered='';interim='';manualStop=false;lastResultAt=Date.now();listening=true;mic.textContent='■';status.textContent='Listening… speak naturally';startRecognizerInstance();clearTimeout(hardTimer);hardTimer=setTimeout(()=>{if(listening)finalizeSpeech()},15000)
  }

  q('a45Send').onclick=()=>submit();input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit()}});
  mic.onclick=e=>{e.preventDefault();e.stopPropagation();startListening()};
  fab.onclick=e=>{e.preventDefault();e.stopPropagation();if(!isMember())return;panel.classList.add('open');fab.style.display='none';startListening()};

  function sync(){const on=isMember();host.style.display=on?'block':'none';if(!on){if(listening){listening=false;clearListenTimers();stopRecognition()}stopSpeak();panel.classList.remove('open')}}
  setInterval(sync,500);sync();
  window.__DBEST_AI_STABLE_V45__={version:VERSION,submit,startListening,finalizeSpeech,chooseVoice};
})();