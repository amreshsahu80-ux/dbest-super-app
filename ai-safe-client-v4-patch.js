(() => {
  'use strict';
  const VERSION='4.0-multiturn-neural-primary';
  const MEMBER_ROLES=new Set(['guest','promoter','prime','leader']);
  let turnBusy=false, recorder=null, stream=null, chunks=[], recordTimer=null;
  let turnSeq=0, voiceSeq=0, currentVoiceAbort=null, currentAudio=null, audioCtx=null;

  const session=()=>{try{return JSON.parse(localStorage.getItem('d2_session')||'{}')||{}}catch{return{}}};
  const isMember=()=>{const s=session();return !!(s.id&&MEMBER_ROLES.has(String(s.role||'')))};
  const getApi=()=>window.__DBEST_AI_SAFE_V3__||null;
  const byId=id=>document.getElementById(id);
  const localeOf=text=>{const s=String(text||'');if(/[\u0900-\u097F]/.test(s))return'hi-IN';if(/[\u0980-\u09FF]/.test(s))return'bn-IN';if(/[\u0B00-\u0B7F]/.test(s))return'or-IN';return'en-IN'};
  const ackFor=(task,text)=>{const l=localeOf(text),sub=task?.subsection||'service';if(l==='hi-IN')return `ज़रूर। आपकी जानकारी मिल गई है। मैं ${sub} सेक्शन खोल रही हूँ।`;if(l==='bn-IN')return `অবশ্যই। আপনার তথ্য পেয়েছি। আমি ${sub} বিভাগ খুলছি।`;if(l==='or-IN')return `ନିଶ୍ଚୟ। ଆପଣଙ୍କ ତଥ୍ୟ ମିଳିଛି। ମୁଁ ${sub} ବିଭାଗ ଖୋଲୁଛି।`;return `Sure. I have your details. I’m opening the ${sub} section.`};

  function ensureAudio(){
    try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;if(!audioCtx)audioCtx=new AC();if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});return audioCtx}catch{return null}
  }
  function unlockAudio(){
    const ctx=ensureAudio();
    try{if(ctx&&ctx.state==='running'){const b=ctx.createBuffer(1,1,22050),src=ctx.createBufferSource(),g=ctx.createGain();g.gain.value=0;src.buffer=b;src.connect(g);g.connect(ctx.destination);src.start(0)}}catch{}
  }
  function stopVoice(){
    voiceSeq++;
    try{currentVoiceAbort?.abort()}catch{}currentVoiceAbort=null;
    try{if(currentAudio){currentAudio.pause();currentAudio.src='';}}catch{}currentAudio=null;
    try{window.speechSynthesis?.cancel()}catch{}
  }
  function browserFallback(text,locale,token){
    try{if(token!==voiceSeq||!('speechSynthesis' in window))return false;const u=new SpeechSynthesisUtterance(String(text));u.lang=locale||'en-IN';u.rate=.94;u.pitch=1.01;window.speechSynthesis.speak(u);return true}catch{return false}
  }
  async function neuralSpeak(text,locale,token){
    if(!text||!isMember()||token!==voiceSeq)return false;
    const ac=new AbortController();currentVoiceAbort=ac;const tm=setTimeout(()=>ac.abort(),11000);
    try{
      const r=await fetch('/api/ai-speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:String(text).slice(0,700),locale:locale||'en-IN'}),signal:ac.signal});
      if(!r.ok||token!==voiceSeq)return false;
      const buf=await r.arrayBuffer();if(token!==voiceSeq)return false;
      const ctx=ensureAudio();
      if(ctx){
        try{if(ctx.state==='suspended')await ctx.resume();const decoded=await Promise.race([ctx.decodeAudioData(buf.slice(0)),new Promise((_,rej)=>setTimeout(()=>rej(new Error('decode timeout')),3500))]);if(token!==voiceSeq)return false;const src=ctx.createBufferSource();src.buffer=decoded;src.connect(ctx.destination);src.start(0);return true}catch{}
      }
      const blob=new Blob([buf],{type:r.headers.get('content-type')||'audio/wav'}),url=URL.createObjectURL(blob),a=new Audio(url);currentAudio=a;a.playsInline=true;
      a.onended=a.onerror=()=>{try{URL.revokeObjectURL(url)}catch{}if(currentAudio===a)currentAudio=null};
      await a.play();return true;
    }catch{return false}finally{clearTimeout(tm);if(currentVoiceAbort===ac)currentVoiceAbort=null}
  }
  function speak(text,locale){
    const token=voiceSeq;
    neuralSpeak(text,locale,token).then(ok=>{if(!ok&&token===voiceSeq)browserFallback(text,locale,token)}).catch(()=>{if(token===voiceSeq)browserFallback(text,locale,token)});
  }

  function mergeTask(a,b){if(!a)return b;if(!b)return a;return{route:b.route||a.route,subsection:b.subsection||a.subsection,taskData:{...(a.taskData||{}),...(b.taskData||{})}}}
  async function askAI(text){const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),10000);try{const r=await fetch('/api/ai-assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,locale:'auto',history:[]}),signal:ac.signal});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'AI unavailable');return d}finally{clearTimeout(tm)}}

  function status(t){const e=byId('dbsaStatus');if(e)e.textContent=t}
  function notice(t,ms=6500){const e=byId('dbsaToast');if(!e)return;e.textContent=t;e.classList.add('show');clearTimeout(e._v4t);e._v4t=setTimeout(()=>e.classList.remove('show'),ms)}
  function addMsg(text,who){const box=byId('dbsaMsgs');if(!box)return;const d=document.createElement('div');d.className='dbsa-msg '+(who==='u'?'dbsa-u':'dbsa-a');d.textContent=text;box.appendChild(d);box.scrollTop=box.scrollHeight}
  function hardReset(){turnBusy=false;try{stream?.getTracks().forEach(t=>t.stop())}catch{}stream=null;recorder=null;chunks=[];clearTimeout(recordTimer);recordTimer=null;const m=byId('dbsaMic');if(m)m.textContent='🎙️';status('Ready')}

  async function submit(textRaw){
    const input=byId('dbsaInput'),text=String(textRaw||input?.value||'').trim();
    if(!text||turnBusy||!isMember())return;
    turnBusy=true;const myTurn=++turnSeq;stopVoice();unlockAudio();if(input)input.value='';addMsg(text,'u');status('Working…');
    const api=getApi(),local=api?.parse?.(text)||null,locale=localeOf(text);
    if(local){speak(ackFor(local,text),locale);try{api?.route?.(local)}catch{}}
    try{
      const d=await askAI(text);if(myTurn!==turnSeq)return;
      const server=d.route?{route:d.route,subsection:d.subsection||'',taskData:d.taskData||{}}:null,task=mergeTask(local,server),reply=String(d.reply||'').trim(),replyLocale=d.languageCode||locale;
      if(reply){notice(reply,8000);speak(reply,replyLocale)}
      if(!local&&task){try{api?.route?.(task)}catch{}}
      else if(local&&task&&['insurance','travel','flights','mf'].includes(task.route)){setTimeout(()=>{try{api?.route?.(task)}catch{}},450)}
    }catch{if(myTurn===turnSeq)notice('DBest AI is temporarily unavailable. Please try again.',4500)}
    finally{if(myTurn===turnSeq)hardReset()}
  }

  async function transcribe(blob){
    const buf=await blob.arrayBuffer();let bin='';const bytes=new Uint8Array(buf);for(let i=0;i<bytes.length;i+=8192)bin+=String.fromCharCode(...bytes.subarray(i,i+8192));
    const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),12000);try{const r=await fetch('/api/ai-transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audioBase64:btoa(bin),mimeType:blob.type,locale:'auto'}),signal:ac.signal});const d=await r.json().catch(()=>({}));if(!r.ok||!d.text)throw new Error('transcribe failed');return String(d.text).trim()}finally{clearTimeout(tm)}
  }
  async function onMic(){
    unlockAudio();if(!isMember()||turnBusy)return;
    if(recorder&&recorder.state==='recording'){try{recorder.stop()}catch{}return}
    hardReset();status('Listening… tap again to stop');const mic=byId('dbsaMic');if(mic)mic.textContent='■';
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];recorder=new MediaRecorder(stream);
      recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
      recorder.onstop=async()=>{clearTimeout(recordTimer);recordTimer=null;const type=recorder?.mimeType||'audio/webm',blob=new Blob(chunks,{type});try{stream?.getTracks().forEach(t=>t.stop())}catch{}stream=null;recorder=null;chunks=[];if(mic)mic.textContent='🎙️';status('Understanding voice…');try{const text=await transcribe(blob);const input=byId('dbsaInput');if(input)input.value=text;await submit(text)}catch{hardReset();status('Voice unavailable — please try again or type')}};
      recorder.start();recordTimer=setTimeout(()=>{try{if(recorder?.state==='recording')recorder.stop()}catch{}},8000);
    }catch{hardReset();status('Microphone permission unavailable')}
  }

  function install(){
    const oldSend=byId('dbsaSend'),oldMic=byId('dbsaMic'),oldInput=byId('dbsaInput');if(!oldSend||!oldMic||!oldInput||!getApi())return false;
    const send=oldSend.cloneNode(true),mic=oldMic.cloneNode(true),input=oldInput.cloneNode(true);oldSend.replaceWith(send);oldMic.replaceWith(mic);oldInput.replaceWith(input);
    send.addEventListener('pointerdown',unlockAudio,{passive:true});mic.addEventListener('pointerdown',unlockAudio,{passive:true});
    send.onclick=()=>submit();mic.onclick=onMic;input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();unlockAudio();submit()}});
    const sub=document.querySelector('#dbest-ai-safe-host .dbsa-sub');if(sub)sub.textContent='Member AI • multi-turn • Gemini neural voice';
    hardReset();window.__DBEST_AI_SAFE_V4__={version:VERSION,submit,onMic,stopVoice};return true;
  }
  let tries=0;const timer=setInterval(()=>{if(install()||++tries>40)clearInterval(timer)},100);
})();