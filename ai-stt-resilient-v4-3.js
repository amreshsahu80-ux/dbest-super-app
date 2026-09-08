(() => {
  'use strict';
  const VERSION='4.3-browser-stt-primary';
  const LANG_MAP={en:'en-IN',hi:'hi-IN',bn:'bn-IN',od:'or-IN',or:'or-IN',ta:'ta-IN',te:'te-IN',mr:'mr-IN',gu:'gu-IN',pa:'pa-IN',kn:'kn-IN',ml:'ml-IN',ur:'ur-IN',as:'as-IN'};
  let recognition=null, active=false, hadResult=false, fallbackStarted=false;

  function preferredLocale(){
    try{
      const app=String(localStorage.getItem('d2_lang')||'').toLowerCase().trim();
      if(LANG_MAP[app])return LANG_MAP[app];
    }catch{}
    const nav=String(navigator.language||'en-IN');
    return nav.includes('-')?nav:'en-IN';
  }
  function q(id){return document.getElementById(id)}
  function status(text){const el=q('a4Status');if(el)el.textContent=text}
  function stopCurrent(){
    if(recognition&&active){try{recognition.stop()}catch{}}
    active=false;
    const mic=q('a4Mic');if(mic)mic.textContent='🎙️';
  }
  function fallbackToRecorder(){
    if(fallbackStarted)return;
    fallbackStarted=true;active=false;
    const mic=q('a4Mic');if(mic)mic.textContent='🎙️';
    const api=window.__DBEST_AI_CONTINUOUS_V4__;
    if(api?.beginRecording){status('Using Gemini voice detection…');setTimeout(()=>api.beginRecording(),60)}
    else status('Voice unavailable — type instead');
  }
  function submitTranscript(text){
    const t=String(text||'').trim();if(!t)return;
    const input=q('a4Input');if(input)input.value=t;
    status('Understood — preparing response…');
    const api=window.__DBEST_AI_CONTINUOUS_V4__;
    if(api?.submit)api.submit(t);else status('AI temporarily unavailable');
  }
  function startBrowserRecognition(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){fallbackToRecorder();return}
    if(active){stopCurrent();return}
    hadResult=false;fallbackStarted=false;
    try{
      recognition=new SR();
      recognition.lang=preferredLocale();
      recognition.continuous=false;
      recognition.interimResults=true;
      recognition.maxAlternatives=1;
      active=true;
      const mic=q('a4Mic');if(mic)mic.textContent='■';
      status('Listening… tap again to stop');
      let finalText='';
      recognition.onresult=e=>{
        let interim='';
        for(let i=e.resultIndex;i<e.results.length;i++){
          const txt=String(e.results[i][0]?.transcript||'');
          if(e.results[i].isFinal)finalText+=txt;else interim+=txt;
        }
        const input=q('a4Input');if(input)input.value=(finalText||interim).trim();
        if(finalText.trim())hadResult=true;
      };
      recognition.onerror=e=>{
        active=false;const mic=q('a4Mic');if(mic)mic.textContent='🎙️';
        const code=String(e?.error||'');
        if(code==='not-allowed'||code==='service-not-allowed')status('Microphone permission unavailable');
        else if(code==='no-speech')status('No speech heard — tap mic and try again');
        else fallbackToRecorder();
      };
      recognition.onend=()=>{
        active=false;const mic=q('a4Mic');if(mic)mic.textContent='🎙️';
        const input=q('a4Input'),text=String(input?.value||'').trim();
        if((hadResult||text)&&text){submitTranscript(text);return}
        if(!fallbackStarted&&status&&!hadResult)status('Ready — tap mic and speak again');
      };
      recognition.start();
    }catch{active=false;fallbackToRecorder()}
  }
  function bind(){
    const mic=q('a4Mic'),fab=q('a4Fab'),panel=q('a4Panel');
    if(!mic||!fab||!panel)return false;
    mic.onclick=e=>{e.preventDefault();e.stopPropagation();try{window.__DBEST_AI_CONTINUOUS_V4__?.stopVoice?.()}catch{};startBrowserRecognition()};
    fab.onclick=e=>{e.preventDefault();e.stopPropagation();panel.classList.add('open');fab.style.display='none';try{window.__DBEST_AI_CONTINUOUS_V4__?.stopVoice?.()}catch{};startBrowserRecognition()};
    window.__DBEST_AI_STT_V43__={version:VERSION,start:startBrowserRecognition,stop:stopCurrent,locale:preferredLocale};
    return true;
  }
  let tries=0;const timer=setInterval(()=>{tries++;if(bind()||tries>40)clearInterval(timer)},100);
})();