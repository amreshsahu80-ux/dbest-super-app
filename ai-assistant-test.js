(() => {
  'use strict';

  const TEST_LABEL = 'TEST ENVIRONMENT • SAMPLE RESULTS';
  const LANGS = [
    ['auto','🌐 Auto language'],['en-IN','English'],['hi-IN','हिन्दी'],['bn-IN','বাংলা'],['mr-IN','मराठी'],['te-IN','తెలుగు'],['ta-IN','தமிழ்'],['gu-IN','ગુજરાતી'],['ur-IN','اردو'],['kn-IN','ಕನ್ನಡ'],['or-IN','ଓଡ଼ିଆ'],['ml-IN','മലയാളം'],['pa-IN','ਪੰਜਾਬੀ'],['as-IN','অসমীয়া'],['ne-IN','नेपाली'],['kok-IN','कोंकणी'],['ks-IN','کٲشُر'],['mni-IN','মৈতৈলোন্ / Manipuri'],['mai-IN','मैथिली'],['sd-IN','سنڌي'],['doi-IN','डोगरी'],['brx-IN','बड़ो / Bodo'],['sat-IN','ᱥᱟᱱᱛᱟᱲᱤ'],['sa-IN','संस्कृतम्']
  ];
  const languageName = Object.fromEntries(LANGS);
  const state = {
    listening:false,
    speak:true,
    locale: localStorage.getItem('dbest_ai_locale') || 'auto',
    lastDetected:'en-IN',
    history:[],
    audio:null,
    neuralVoice:true
  };

  const host=document.createElement('div');
  host.id='dbest-ai-test-host';
  host.style.cssText='position:fixed;z-index:2147483000;right:16px;bottom:16px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif';
  document.body.appendChild(host);
  const root=host.attachShadow({mode:'open'});
  const langOptions=LANGS.map(([v,n])=>`<option value="${v}">${n}</option>`).join('');

  root.innerHTML=`
  <style>
    *{box-sizing:border-box}.fab{width:64px;height:64px;border-radius:50%;border:0;cursor:pointer;background:linear-gradient(145deg,#0a64ff,#6f3cff);color:#fff;box-shadow:0 14px 40px rgba(42,60,180,.32);font-size:27px;display:grid;place-items:center;margin-left:auto}.panel{width:min(410px,calc(100vw - 24px));height:min(710px,calc(100dvh - 90px));background:#fff;border:1px solid #e6e9f2;border-radius:24px;box-shadow:0 24px 70px rgba(15,23,42,.28);overflow:hidden;display:none;margin-bottom:12px;color:#14213d}.panel.open{display:flex;flex-direction:column}.head{padding:15px;background:linear-gradient(135deg,#071d49,#0a64ff 70%,#653cff);color:#fff}.headrow{display:flex;gap:11px;align-items:center}.mark{width:42px;height:42px;border-radius:13px;background:#fff;color:#0a64ff;font-weight:900;display:grid;place-items:center}.title{font-weight:850;font-size:17px}.sub{font-size:11px;opacity:.9;margin-top:3px}.close{margin-left:auto;border:0;background:rgba(255,255,255,.13);color:#fff;width:34px;height:34px;border-radius:10px;font-size:20px}.toptools{display:flex;gap:8px;align-items:center;margin-top:10px}.badge{padding:5px 8px;border-radius:999px;background:#fff3cd;color:#6a4b00;font-size:9px;font-weight:850}.lang{margin-left:auto;max-width:165px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.13);color:#fff;border-radius:10px;padding:7px 8px;font-size:11px;outline:none}.lang option{color:#111;background:#fff}.body{padding:14px;overflow:auto;flex:1;background:#f7f9fd}.hello{background:#fff;border:1px solid #e8edf6;border-radius:17px;padding:13px 14px;font-size:12.5px;line-height:1.5}.chips{display:flex;gap:7px;overflow:auto;padding:11px 0 4px;scrollbar-width:none}.chip{flex:0 0 auto;border:1px solid #d8e1f2;background:#fff;color:#24456f;padding:7px 10px;border-radius:999px;font-size:10.5px;font-weight:700}.msgs{display:flex;flex-direction:column;gap:10px;margin-top:10px}.msg{max-width:90%;padding:10px 12px;border-radius:15px;font-size:13px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}.user{align-self:flex-end;background:#0a64ff;color:#fff;border-bottom-right-radius:5px}.ai{align-self:flex-start;background:#fff;color:#17213a;border:1px solid #e5eaf3;border-bottom-left-radius:5px}.aihead{font-size:9px;font-weight:850;color:#718098;margin-bottom:5px;letter-spacing:.2px}.composer{padding:10px;background:#fff;border-top:1px solid #e7ebf2}.inputrow{display:flex;gap:8px;align-items:center}.input{flex:1;min-width:0;border:1px solid #ccd6e5;border-radius:14px;padding:11px 12px;font-size:13px;outline:none}.input:focus{border-color:#0a64ff;box-shadow:0 0 0 3px rgba(10,100,255,.1)}.mic,.send{width:42px;height:42px;border:0;border-radius:13px;cursor:pointer;font-size:17px}.mic{background:#eef4ff;color:#0a64ff}.mic.listening{background:#ffe8ea;color:#d91b32;animation:pulse 1s infinite}.send{background:#0a64ff;color:#fff}.foot{display:flex;justify-content:space-between;align-items:center;margin-top:7px;gap:6px;font-size:9.5px;color:#7a879a}.toggle{border:0;background:transparent;color:#4c5e76;cursor:pointer;font-weight:750}.thinking:after{content:'•••';letter-spacing:2px;animation:blink 1s infinite}@keyframes blink{50%{opacity:.35}}@keyframes pulse{50%{transform:scale(.92);opacity:.7}}@media(max-width:480px){:host{right:10px!important;bottom:10px!important}.panel{width:calc(100vw - 20px);height:calc(100dvh - 80px);border-radius:20px}.fab{width:58px;height:58px}.lang{max-width:150px}}
  </style>
  <div class="panel" id="panel" aria-label="DBest AI Assistant Test">
    <div class="head">
      <div class="headrow"><div class="mark">D</div><div><div class="title">Ask DBest AI</div><div class="sub">Same-language replies • Indian multilingual AI • Neural voice</div></div><button class="close" id="close">×</button></div>
      <div class="toptools"><span class="badge">${TEST_LABEL}</span><select class="lang" id="lang">${langOptions}</select></div>
    </div>
    <div class="body" id="body">
      <div class="hello"><b>Speak or type in your own language.</b><br>Auto mode asks the AI to identify your language and answer in the same language. For voice input, if your phone mishears Auto, choose your language once from the selector. No real booking/payment is made in this test.</div>
      <div class="chips">
        <button class="chip" data-q="I need a Goa package at 15000 per person">🏖️ Goa ₹15k</button>
        <button class="chip" data-q="मुझे 15000 रुपये में गोवा पैकेज चाहिए">🇮🇳 हिंदी</button>
        <button class="chip" data-q="আমার ১৫ হাজার টাকার মধ্যে গোয়া প্যাকেজ চাই">বাংলা</button>
        <button class="chip" data-q="I need health insurance for my family">🛡️ Insurance</button>
      </div>
      <div class="msgs" id="msgs"></div>
    </div>
    <div class="composer"><div class="inputrow"><input class="input" id="input" placeholder="Type or tap the mic…" autocomplete="off"><button class="mic" id="mic" title="Speak">🎙️</button><button class="send" id="send">➤</button></div><div class="foot"><span id="status">AI test • No live transactions</span><button class="toggle" id="voice">✨ Neural voice: On</button></div></div>
  </div>
  <button class="fab" id="fab" aria-label="Ask DBest AI" title="Ask DBest AI">🎙️</button>`;

  const $=s=>root.querySelector(s);
  const panel=$('#panel'),msgs=$('#msgs'),body=$('#body'),input=$('#input'),mic=$('#mic'),status=$('#status'),lang=$('#lang');
  lang.value=LANGS.some(x=>x[0]===state.locale)?state.locale:'auto'; state.locale=lang.value;

  function openPanel(){panel.classList.add('open');$('#fab').style.display='none';setTimeout(()=>input.focus(),80)}
  function closePanel(){panel.classList.remove('open');$('#fab').style.display='grid'}
  $('#fab').onclick=openPanel;$('#close').onclick=closePanel;
  lang.onchange=()=>{state.locale=lang.value;localStorage.setItem('dbest_ai_locale',state.locale);status.textContent=`Language: ${languageName[state.locale]||state.locale}`;if(recognition) recognition.lang=recognitionLocale()};

  function scrollBottom(){requestAnimationFrame(()=>body.scrollTop=body.scrollHeight)}
  function addUser(text){const d=document.createElement('div');d.className='msg user';d.textContent=text;msgs.appendChild(d);scrollBottom()}
  function addAI(text,locale='auto',source='AI'){const d=document.createElement('div');d.className='msg ai';const h=document.createElement('div');h.className='aihead';h.textContent=`DBEST ${source} • ${languageName[locale]||locale||'Auto'} • TEST`;const t=document.createElement('div');t.textContent=text;d.append(h,t);msgs.appendChild(d);scrollBottom();if(state.speak)speak(text,locale)}
  function thinking(){const d=document.createElement('div');d.className='msg ai thinking';d.id='thinking';d.textContent='Understanding your request ';msgs.appendChild(d);scrollBottom()}
  function stopThinking(){const x=$('#thinking');if(x)x.remove()}

  function detectScriptLocale(text){
    if(/[\u0B80-\u0BFF]/.test(text))return'ta-IN';if(/[\u0C00-\u0C7F]/.test(text))return'te-IN';if(/[\u0C80-\u0CFF]/.test(text))return'kn-IN';if(/[\u0D00-\u0D7F]/.test(text))return'ml-IN';if(/[\u0A80-\u0AFF]/.test(text))return'gu-IN';if(/[\u0A00-\u0A7F]/.test(text))return'pa-IN';if(/[\u0B00-\u0B7F]/.test(text))return'or-IN';if(/[\u0980-\u09FF]/.test(text))return'bn-IN';if(/[\u0600-\u06FF]/.test(text))return'ur-IN';if(/[\u1C50-\u1C7F]/.test(text))return'sat-IN';if(/[\uABC0-\uABFF]/.test(text))return'mni-IN';if(/[\u0900-\u097F]/.test(text))return'hi-IN';return'en-IN';
  }
  function effectiveLocale(text,serverLocale){
    if(state.locale!=='auto')return state.locale;
    if(serverLocale&&serverLocale!=='auto'){const base=serverLocale.toLowerCase();const exact=LANGS.find(x=>x[0].toLowerCase()===base);if(exact)return exact[0];const byBase=LANGS.find(x=>x[0].split('-')[0]===base.split('-')[0]);if(byBase)return byBase[0]}
    return detectScriptLocale(text);
  }

  async function callAI(text){
    const response=await fetch('/api/ai-assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,locale:state.locale,history:state.history.slice(-6)})});
    if(!response.ok)throw new Error('ai-unavailable');
    const data=await response.json();
    if(!data.reply)throw new Error('empty-ai');
    return data;
  }

  function fallbackReply(text){
    const x=text.toLowerCase();
    if(/goa|गोवा|গোয়া|கோவா|గోవా|ಗೋವಾ|ഗോവ|ગોવા/.test(x))return 'I understood your Goa package request. The live multilingual AI connection is temporarily unavailable, so this fallback cannot safely translate or quote live prices. Please try again in a moment; no booking has been made.';
    if(/insurance|policy|बीमा|इंश्योरेंस/.test(x))return 'I understood that you need insurance help. This test fallback does not make recommendations or issue a policy. Please try the AI response again shortly.';
    if(/cab|taxi|ride/.test(x))return 'I understood the cab request. This test will not create a real ride. Please try the AI response again shortly.';
    return 'I understood your request, but the multilingual AI service is temporarily unavailable. This test has not made any transaction.';
  }

  async function submit(q){
    const text=String(q||input.value||'').trim();if(!text)return;input.value='';addUser(text);thinking();status.textContent='Detecting language and preparing reply…';
    try{
      const data=await callAI(text);stopThinking();const loc=effectiveLocale(data.reply,data.languageCode);state.lastDetected=loc;addAI(data.reply,loc,'AI');state.history.push({role:'user',content:text},{role:'assistant',content:data.reply});state.history=state.history.slice(-8);status.textContent=`Reply language: ${languageName[loc]||loc} • Demo only`;
    }catch(e){stopThinking();const r=fallbackReply(text);const loc=effectiveLocale(text);addAI(r,loc,'FALLBACK');status.textContent='AI gateway unavailable • browser fallback used';}
  }
  $('#send').onclick=()=>submit();input.addEventListener('keydown',e=>{if(e.key==='Enter')submit()});root.querySelectorAll('.chip').forEach(b=>b.onclick=()=>submit(b.dataset.q));

  let currentAudio=null;
  async function speak(text,locale){
    if(!state.speak)return;
    if(currentAudio){try{currentAudio.pause()}catch{} currentAudio=null}
    if('speechSynthesis'in window)window.speechSynthesis.cancel();
    if(state.neuralVoice){
      try{
        status.textContent='Generating neural voice…';
        const r=await fetch('/api/ai-speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,locale,voice:'nova'})});
        if(!r.ok)throw new Error('neural-unavailable');
        const blob=await r.blob();const url=URL.createObjectURL(blob);const a=new Audio(url);currentAudio=a;a.onended=()=>{URL.revokeObjectURL(url);currentAudio=null;status.textContent=`Voice: Neural • ${languageName[locale]||locale}`};a.onerror=()=>{URL.revokeObjectURL(url);browserSpeak(text,locale)};await a.play();return;
      }catch(e){browserSpeak(text,locale);return;}
    }
    browserSpeak(text,locale);
  }
  function browserSpeak(text,locale){
    if(!('speechSynthesis'in window))return;
    const u=new SpeechSynthesisUtterance(text);u.lang=locale&&locale!=='auto'?locale:effectiveLocale(text);u.rate=.96;u.pitch=1;
    const voices=window.speechSynthesis.getVoices();const base=u.lang.split('-')[0].toLowerCase();const candidates=voices.filter(v=>(v.lang||'').toLowerCase().startsWith(base));const rank=v=>/neural|natural|enhanced|premium|google|wavenet/i.test(v.name)?2:1;candidates.sort((a,b)=>rank(b)-rank(a));if(candidates[0])u.voice=candidates[0];u.onend=()=>status.textContent=`Voice: Device fallback • ${languageName[u.lang]||u.lang}`;window.speechSynthesis.speak(u);
  }
  if('speechSynthesis'in window){window.speechSynthesis.getVoices();window.speechSynthesis.onvoiceschanged=()=>window.speechSynthesis.getVoices()}

  let recognition=null;const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  function recognitionLocale(){if(state.locale!=='auto')return state.locale;const nav=(navigator.language||'en-IN');if(/-IN$/i.test(nav))return nav;return state.lastDetected||'en-IN'}
  if(SpeechRecognition){
    recognition=new SpeechRecognition();recognition.interimResults=true;recognition.continuous=false;recognition.lang=recognitionLocale();
    recognition.onstart=()=>{state.listening=true;mic.classList.add('listening');mic.textContent='⏹';status.textContent=`Listening • ${languageName[recognition.lang]||recognition.lang}`};
    recognition.onresult=e=>{let finalText='',interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;e.results[i].isFinal?finalText+=t:interim+=t}input.value=finalText||interim;if(finalText)submit(finalText)};
    recognition.onerror=e=>{status.textContent=e.error==='not-allowed'?'Microphone permission is needed':'Voice input not understood — select language or type'};
    recognition.onend=()=>{state.listening=false;mic.classList.remove('listening');mic.textContent='🎙️'};
    mic.onclick=()=>{try{recognition.lang=recognitionLocale();state.listening?recognition.stop():recognition.start()}catch{status.textContent='Tap mic again or type your request'}};
  }else mic.onclick=()=>status.textContent='Voice recognition is not supported in this browser; typing still works.';

  $('#voice').onclick=()=>{state.speak=!state.speak;$('#voice').textContent=state.speak?'✨ Neural voice: On':'🔇 Voice reply: Off';if(!state.speak){if(currentAudio)currentAudio.pause();if('speechSynthesis'in window)window.speechSynthesis.cancel()}};
  window.__DBEST_AI_TEST__={version:'0.2-multilingual-neural',open:openPanel,submit,languages:LANGS.map(x=>x[0])};
})();
