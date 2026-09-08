(() => {
  'use strict';

  const TEST_LABEL = 'TEST ENVIRONMENT • SAMPLE RESULTS';
  const LANGS = [
    ['auto','🌐 Auto language'],['en-IN','English'],['hi-IN','हिन्दी'],['bn-IN','বাংলা'],['mr-IN','मराठी'],['te-IN','తెలుగు'],['ta-IN','தமிழ்'],['gu-IN','ગુજરાતી'],['ur-IN','اردو'],['kn-IN','ಕನ್ನಡ'],['or-IN','ଓଡ଼ିଆ'],['ml-IN','മലയാളം'],['pa-IN','ਪੰਜਾਬੀ'],['as-IN','অসমীয়া'],['ne-IN','नेपाली'],['kok-IN','कोंकणी'],['ks-IN','کٲشُر'],['mni-IN','মৈতৈলোন্ / Manipuri'],['mai-IN','मैथिली'],['sd-IN','سنڌي'],['doi-IN','डोगरी'],['brx-IN','बड़ो / Bodo'],['sat-IN','ᱥᱟᱱᱛᱟᱲᱤ'],['sa-IN','संस्कृतम्']
  ];
  const languageName = Object.fromEntries(LANGS);
  const aliases = {english:'en-IN',en:'en-IN',hindi:'hi-IN',hi:'hi-IN',bengali:'bn-IN',bangla:'bn-IN',bn:'bn-IN',marathi:'mr-IN',mr:'mr-IN',telugu:'te-IN',te:'te-IN',tamil:'ta-IN',ta:'ta-IN',gujarati:'gu-IN',gu:'gu-IN',urdu:'ur-IN',ur:'ur-IN',kannada:'kn-IN',kn:'kn-IN',odia:'or-IN',oriya:'or-IN',or:'or-IN',malayalam:'ml-IN',ml:'ml-IN',punjabi:'pa-IN',pa:'pa-IN',assamese:'as-IN',as:'as-IN',nepali:'ne-IN',ne:'ne-IN',konkani:'kok-IN',kok:'kok-IN',kashmiri:'ks-IN',ks:'ks-IN',manipuri:'mni-IN',mni:'mni-IN',maithili:'mai-IN',mai:'mai-IN',sindhi:'sd-IN',sd:'sd-IN',dogri:'doi-IN',doi:'doi-IN',bodo:'brx-IN',brx:'brx-IN',santali:'sat-IN',sat:'sat-IN',sanskrit:'sa-IN',sa:'sa-IN'};

  const savedLocale = localStorage.getItem('dbest_ai_locale') || 'auto';
  const savedDetected = localStorage.getItem('dbest_ai_last_detected') || '';
  const state = {
    speak: true,
    locale: LANGS.some(x => x[0] === savedLocale) ? savedLocale : 'auto',
    lastDetected: normalizeLocale(savedDetected),
    history: [],
    recording: false,
    recorder: null,
    stream: null,
    chunks: [],
    timer: null,
    recognition: null,
    speaking: false
  };

  const host = document.createElement('div');
  host.id = 'dbest-ai-test-host';
  host.style.cssText = 'position:fixed;z-index:2147483000;right:16px;bottom:16px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif';
  document.body.appendChild(host);
  const root = host.attachShadow({mode:'open'});
  const langOptions = LANGS.map(([v,n]) => `<option value="${v}">${n}</option>`).join('');

  root.innerHTML = `
    <style>
      *{box-sizing:border-box}.fab{width:64px;height:64px;border-radius:50%;border:0;cursor:pointer;background:linear-gradient(145deg,#0a64ff,#6f3cff);color:#fff;box-shadow:0 14px 40px rgba(42,60,180,.32);font-size:27px;display:grid;place-items:center;margin-left:auto}
      .panel{width:min(410px,calc(100vw - 24px));height:min(710px,calc(100dvh - 90px));background:#fff;border:1px solid #e6e9f2;border-radius:24px;box-shadow:0 24px 70px rgba(15,23,42,.28);overflow:hidden;display:none;margin-bottom:12px;color:#14213d}.panel.open{display:flex;flex-direction:column}
      .head{padding:15px;background:linear-gradient(135deg,#071d49,#0a64ff 70%,#653cff);color:#fff}.headrow{display:flex;gap:11px;align-items:center}.mark{width:42px;height:42px;border-radius:13px;background:#fff;color:#0a64ff;font-weight:900;display:grid;place-items:center}.title{font-weight:850;font-size:17px}.sub{font-size:11px;opacity:.9;margin-top:3px}.close{margin-left:auto;border:0;background:rgba(255,255,255,.13);color:#fff;width:34px;height:34px;border-radius:10px;font-size:20px}.toptools{display:flex;gap:8px;align-items:center;margin-top:10px}.badge{padding:5px 8px;border-radius:999px;background:#fff3cd;color:#6a4b00;font-size:9px;font-weight:850}.lang{margin-left:auto;max-width:165px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.13);color:#fff;border-radius:10px;padding:7px 8px;font-size:11px}.lang option{color:#111;background:#fff}
      .body{padding:14px;overflow:auto;flex:1;background:#f7f9fd}.hello{background:#fff;border:1px solid #e8edf6;border-radius:17px;padding:13px 14px;font-size:12.5px;line-height:1.5}.chips{display:flex;gap:7px;overflow:auto;padding:11px 0 4px;scrollbar-width:none}.chip{flex:0 0 auto;border:1px solid #d8e1f2;background:#fff;color:#24456f;padding:7px 10px;border-radius:999px;font-size:10.5px;font-weight:700}.msgs{display:flex;flex-direction:column;gap:10px;margin-top:10px}.msg{max-width:90%;padding:10px 12px;border-radius:15px;font-size:13px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}.user{align-self:flex-end;background:#0a64ff;color:#fff;border-bottom-right-radius:5px}.ai{align-self:flex-start;background:#fff;color:#17213a;border:1px solid #e5eaf3;border-bottom-left-radius:5px}.notice{align-self:center;background:#fff8df;color:#745400;border:1px solid #f1df9a;font-size:11px;max-width:96%}.aihead{font-size:9px;font-weight:850;color:#718098;margin-bottom:5px}
      .composer{padding:10px;background:#fff;border-top:1px solid #e7ebf2}.inputrow{display:flex;gap:8px;align-items:center}.input{flex:1;min-width:0;border:1px solid #ccd6e5;border-radius:14px;padding:11px 12px;font-size:13px}.mic,.send{width:42px;height:42px;border:0;border-radius:13px;cursor:pointer;font-size:17px}.mic{background:#eef4ff;color:#0a64ff}.mic.listening{background:#ffe8ea;color:#d91b32;animation:pulse 1s infinite}.send{background:#0a64ff;color:#fff}.foot{display:flex;justify-content:space-between;align-items:center;margin-top:7px;gap:6px;font-size:9.5px;color:#7a879a}.toggle{border:0;background:transparent;color:#4c5e76;cursor:pointer;font-weight:750}.thinking:after{content:'•••';letter-spacing:2px;animation:blink 1s infinite}@keyframes blink{50%{opacity:.35}}@keyframes pulse{50%{transform:scale(.92);opacity:.7}}
      @media(max-width:480px){:host{right:10px!important;bottom:10px!important}.panel{width:calc(100vw - 20px);height:calc(100dvh - 80px);border-radius:20px}.fab{width:58px;height:58px}.lang{max-width:150px}}
    </style>
    <div class="panel" id="panel">
      <div class="head">
        <div class="headrow"><div class="mark">D</div><div><div class="title">Ask DBest AI</div><div class="sub">Auto language • Same-language replies • Soft female voice</div></div><button class="close" id="close">×</button></div>
        <div class="toptools"><span class="badge">${TEST_LABEL}</span><select class="lang" id="lang">${langOptions}</select></div>
      </div>
      <div class="body" id="body">
        <div class="hello"><b>Speak naturally in your own language.</b><br>DBest detects the first spoken language, remembers it for the conversation, and answers in the same language. A soft female neural voice is used when available; the phone voice is used automatically if the neural service is busy.</div>
        <div class="chips"><button class="chip" data-q="मुझे 15000 रुपये में गोवा पैकेज चाहिए">🇮🇳 हिंदी</button><button class="chip" data-q="আমার ১৫ হাজার টাকার মধ্যে গোয়া প্যাকেজ চাই">বাংলা</button><button class="chip" data-q="ମୋତେ ୧୫ ହଜାର ଟଙ୍କା ଭିତରେ ଗୋଆ ପ୍ୟାକେଜ ଦରକାର">ଓଡ଼ିଆ</button><button class="chip" data-q="I need a Goa package at 15000 per person">English</button></div>
        <div class="msgs" id="msgs"></div>
      </div>
      <div class="composer"><div class="inputrow"><input class="input" id="input" placeholder="Type or tap the mic…" autocomplete="off"><button class="mic" id="mic">🎙️</button><button class="send" id="send">➤</button></div><div class="foot"><span id="status">Ready</span><button class="toggle" id="voice">🌸 Soft female voice: On</button></div></div>
    </div>
    <button class="fab" id="fab">🎙️</button>`;

  const $ = s => root.querySelector(s);
  const panel = $('#panel'), msgs = $('#msgs'), body = $('#body'), input = $('#input'), mic = $('#mic'), status = $('#status'), lang = $('#lang');
  lang.value = state.locale;

  $('#fab').onclick = () => { panel.classList.add('open'); $('#fab').style.display='none'; setTimeout(()=>input.focus(),60); };
  $('#close').onclick = () => { panel.classList.remove('open'); $('#fab').style.display='grid'; stopAllVoiceInput(); };
  lang.onchange = () => {
    state.locale = lang.value;
    localStorage.setItem('dbest_ai_locale', state.locale);
    if (state.locale !== 'auto') rememberDetected(state.locale);
    status.textContent = state.locale === 'auto' ? 'Auto language ready' : `Language: ${languageName[state.locale] || state.locale}`;
  };

  function normalizeLocale(v){
    const x=String(v||'').trim().toLowerCase(); if(!x)return'';
    const exact=LANGS.find(a=>a[0].toLowerCase()===x); if(exact)return exact[0];
    return aliases[x] || aliases[x.split('-')[0]] || '';
  }
  function detectScriptLocale(text){
    if(/[\u0B80-\u0BFF]/.test(text))return'ta-IN'; if(/[\u0C00-\u0C7F]/.test(text))return'te-IN'; if(/[\u0C80-\u0CFF]/.test(text))return'kn-IN'; if(/[\u0D00-\u0D7F]/.test(text))return'ml-IN'; if(/[\u0A80-\u0AFF]/.test(text))return'gu-IN'; if(/[\u0A00-\u0A7F]/.test(text))return'pa-IN'; if(/[\u0B00-\u0B7F]/.test(text))return'or-IN'; if(/[\u0980-\u09FF]/.test(text))return'bn-IN'; if(/[\u0600-\u06FF]/.test(text))return'ur-IN'; if(/[\u1C50-\u1C7F]/.test(text))return'sat-IN'; if(/[\u0900-\u097F]/.test(text))return'hi-IN'; return'';
  }
  function rememberDetected(locale){ const n=normalizeLocale(locale); if(!n)return; state.lastDetected=n; localStorage.setItem('dbest_ai_last_detected',n); }
  function effectiveLocale(text,serverLocale,detectedLocale){ if(state.locale!=='auto')return state.locale; return normalizeLocale(detectedLocale)||normalizeLocale(serverLocale)||detectScriptLocale(text)||state.lastDetected||'en-IN'; }
  function scrollBottom(){ requestAnimationFrame(()=>body.scrollTop=body.scrollHeight); }
  function addUser(text){ const d=document.createElement('div'); d.className='msg user'; d.textContent=text; msgs.appendChild(d); scrollBottom(); }
  function addAI(text,locale='auto'){ const d=document.createElement('div'); d.className='msg ai'; const h=document.createElement('div'); h.className='aihead'; h.textContent=`DBEST AI • ${languageName[locale]||locale||'Auto'} • TEST`; const t=document.createElement('div'); t.textContent=text; d.append(h,t); msgs.appendChild(d); scrollBottom(); if(state.speak)speak(text,locale); }
  function addNotice(text){ const d=document.createElement('div'); d.className='msg notice'; d.textContent=text; msgs.appendChild(d); scrollBottom(); }
  function thinking(){ stopThinking(); const d=document.createElement('div'); d.className='msg ai thinking'; d.id='thinking'; d.textContent=''; msgs.appendChild(d); scrollBottom(); }
  function stopThinking(){ const x=$('#thinking'); if(x)x.remove(); }

  async function callAI(text,detectedLocale){
    const r=await fetch('/api/ai-assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,locale:state.locale,detectedLocale:detectedLocale||'',history:state.history.slice(-6)})});
    let d={}; try{d=await r.json();}catch{}
    if(!r.ok){ const e=new Error(d.code||'ai-unavailable'); e.status=r.status; e.code=d.code||''; throw e; }
    if(!d.reply)throw new Error('empty-ai'); return d;
  }

  async function submit(q,detectedLocale='',alreadyAdded=false){
    const text=String(q||input.value||'').trim(); if(!text)return;
    input.value=''; if(!alreadyAdded)addUser(text); thinking(); status.textContent='Preparing same-language reply…';
    try{
      const data=await callAI(text,detectedLocale);
      stopThinking(); const loc=effectiveLocale(data.reply,data.languageCode,detectedLocale); rememberDetected(loc); addAI(data.reply,loc);
      state.history.push({role:'user',content:text},{role:'assistant',content:data.reply}); state.history=state.history.slice(-8);
      status.textContent=`Reply language: ${languageName[loc]||loc}`;
    }catch(e){
      stopThinking();
      const loc=effectiveLocale(text,'',detectedLocale);
      status.textContent = e.status===429 ? `AI busy • ${languageName[loc]||loc} retained • tap send again` : 'AI temporarily unavailable • tap send again';
      addNotice(e.status===429 ? '⏳ AI service is busy. Your language has been retained; please retry in a moment.' : '⚠️ AI service temporarily unavailable. Please retry.');
    }
  }
  $('#send').onclick=()=>submit(); input.addEventListener('keydown',e=>{if(e.key==='Enter')submit();}); root.querySelectorAll('.chip').forEach(b=>b.onclick=()=>submit(b.dataset.q));

  function blobToBase64(blob){ return new Promise((resolve,reject)=>{ const fr=new FileReader(); fr.onload=()=>resolve(String(fr.result||'').split(',')[1]||''); fr.onerror=reject; fr.readAsDataURL(blob); }); }

  async function transcribeAudio(blob){
    status.textContent='Detecting spoken language…';
    try{
      const audioBase64=await blobToBase64(blob);
      const r=await fetch('/api/ai-transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audioBase64,mimeType:blob.type||'audio/webm',locale:state.locale})});
      let data={}; try{data=await r.json();}catch{}
      if(!r.ok){ const e=new Error(data.code||'transcribe'); e.status=r.status; throw e; }
      const detected=state.locale!=='auto'?state.locale:(normalizeLocale(data.language)||detectScriptLocale(data.text));
      if(detected)rememberDetected(detected);
      addUser(data.text); status.textContent=`Detected: ${languageName[detected]||data.language||'Auto'}`;
      await submit(data.text,detected,true);
    }catch(e){
      if(state.lastDetected || state.locale!=='auto'){
        status.textContent=`Voice detector busy • using ${languageName[state.locale!=='auto'?state.locale:state.lastDetected]||'saved language'} next`;
        addNotice('🎙️ Auto voice detection is busy. Tap the mic again and speak; DBest will reuse your last language.');
      }else{
        status.textContent='Auto voice detection busy • select your language once';
        addNotice('🎙️ Auto voice detection is temporarily busy. Select your language once from the top menu, then tap the mic again.');
      }
    }
  }

  function stopRecorder(){
    if(!state.recording||!state.recorder)return; state.recording=false; clearTimeout(state.timer); mic.classList.remove('listening'); mic.textContent='🎙️';
    try{state.recorder.stop();}catch{}
  }
  async function startRecorder(){
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){ startBrowserRecognition(state.locale!=='auto'?state.locale:state.lastDetected); return; }
    try{
      state.stream=await navigator.mediaDevices.getUserMedia({audio:true}); state.chunks=[]; let mime='';
      for(const m of ['audio/webm;codecs=opus','audio/webm','audio/mp4']){ if(MediaRecorder.isTypeSupported?.(m)){mime=m;break;} }
      state.recorder=new MediaRecorder(state.stream,mime?{mimeType:mime}:undefined);
      state.recorder.ondataavailable=e=>{if(e.data&&e.data.size)state.chunks.push(e.data);};
      state.recorder.onstop=async()=>{ const blob=new Blob(state.chunks,{type:state.recorder?.mimeType||mime||'audio/webm'}); state.stream?.getTracks().forEach(t=>t.stop()); state.stream=null; if(blob.size>500)await transcribeAudio(blob); else status.textContent='No speech detected'; };
      state.recording=true; state.recorder.start(); mic.classList.add('listening'); mic.textContent='■'; status.textContent='Listening… tap again to stop'; state.timer=setTimeout(stopRecorder,10000);
    }catch{ status.textContent='Microphone permission is needed'; }
  }

  function startBrowserRecognition(localeHint){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){ if(!state.recording)startRecorder(); return; }
    try{
      const rec=new SR(); state.recognition=rec; const useLocale=normalizeLocale(localeHint)||normalizeLocale(navigator.language)||'en-IN'; rec.lang=useLocale; rec.interimResults=false; rec.maxAlternatives=1; rec.continuous=false;
      mic.classList.add('listening'); mic.textContent='■'; status.textContent=`Listening in ${languageName[useLocale]||useLocale}…`;
      rec.onresult=e=>{ const text=String(e.results?.[0]?.[0]?.transcript||'').trim(); mic.classList.remove('listening'); mic.textContent='🎙️'; state.recognition=null; if(!text){status.textContent='No speech detected';return;} rememberDetected(useLocale); addUser(text); submit(text,useLocale,true); };
      rec.onerror=()=>{ mic.classList.remove('listening'); mic.textContent='🎙️'; state.recognition=null; status.textContent='Voice recognition unavailable • try typing or Auto detection'; };
      rec.onend=()=>{ mic.classList.remove('listening'); mic.textContent='🎙️'; state.recognition=null; };
      rec.start();
    }catch{ status.textContent='Voice recognition unavailable'; }
  }

  function stopAllVoiceInput(){
    if(state.recording)stopRecorder(); if(state.recognition){try{state.recognition.stop();}catch{} state.recognition=null;} state.stream?.getTracks().forEach(t=>t.stop()); state.stream=null; mic.classList.remove('listening'); mic.textContent='🎙️';
  }

  mic.onclick=()=>{
    if(state.recording){stopRecorder();return;}
    if(state.recognition){try{state.recognition.stop();}catch{} return;}
    const known = state.locale!=='auto' ? state.locale : state.lastDetected;
    if(known) startBrowserRecognition(known); else startRecorder();
  };

  function preferredBrowserVoice(locale){
    const voices=speechSynthesis.getVoices?.()||[]; if(!voices.length)return null; const base=String(locale||'en').split('-')[0].toLowerCase();
    const same=voices.filter(v=>String(v.lang||'').toLowerCase().startsWith(base)); const pool=same.length?same:voices;
    const feminine=/female|woman|shimmer|samantha|victoria|karen|moira|veena|lekha|priya|heera|raveena|swara/i;
    return pool.find(v=>feminine.test(v.name||'')) || pool.find(v=>/google|microsoft/i.test(v.name||'')) || pool[0];
  }

  function browserSpeak(text,locale){
    if(!('speechSynthesis' in window))return; try{speechSynthesis.cancel();}catch{}
    const u=new SpeechSynthesisUtterance(text); u.lang=locale&&locale!=='auto'?locale:(state.lastDetected||'en-IN'); u.rate=.92; u.pitch=1.04; u.volume=.95; const v=preferredBrowserVoice(u.lang); if(v)u.voice=v; try{speechSynthesis.speak(u);}catch{}
  }

  async function speak(text,locale){
    if(!state.speak||!text)return;
    try{
      const r=await fetch('/api/ai-speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,locale,voice:'shimmer'})});
      if(!r.ok)throw new Error('speech-busy'); const blob=await r.blob(); const url=URL.createObjectURL(blob); const audio=new Audio(url); audio.onended=()=>URL.revokeObjectURL(url); await audio.play();
    }catch{ browserSpeak(text,locale); }
  }

  $('#voice').onclick=()=>{ state.speak=!state.speak; if(!state.speak){try{speechSynthesis.cancel();}catch{}} $('#voice').textContent=state.speak?'🌸 Soft female voice: On':'🔇 Voice: Off'; };

  if(state.lastDetected && state.locale==='auto') status.textContent=`Auto • last language: ${languageName[state.lastDetected]||state.lastDetected}`;
  window.__DBEST_AI_TEST__={version:'0.4-soft-female-resilient',open:()=>$('#fab').click(),submit};
})();
