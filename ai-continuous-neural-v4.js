(() => {
  'use strict';
  const VERSION='4.2-continuous-neural-direct-mic';
  const MEMBER_ROLES=new Set(['guest','promoter','prime','leader']);
  let turnId=0, aiAbort=null, transcribeAbort=null, ttsAbort=null;
  let recorder=null, stream=null, chunks=[], recordTimer=null;
  let audioCtx=null, currentSource=null, currentAudio=null, currentUtterance=null, activeVoiceResolve=null, activeVoiceTimer=null;

  const session=()=>{try{return JSON.parse(localStorage.getItem('d2_session')||'{}')||{}}catch{return{}}};
  const isMember=()=>{const s=session();return !!(s.id&&MEMBER_ROLES.has(String(s.role||'')))};
  const api=()=>window.__DBEST_AI_SAFE_V3__||null;

  function unlockAudio(){
    try{
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
      if(!audioCtx)audioCtx=new AC();
      if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
      if(audioCtx.state==='running'){
        const b=audioCtx.createBuffer(1,1,22050),src=audioCtx.createBufferSource(),g=audioCtx.createGain();
        g.gain.value=0;src.buffer=b;src.connect(g);g.connect(audioCtx.destination);src.start(0);
      }
      return audioCtx;
    }catch{return null}
  }
  function settleVoice(v=false){
    clearTimeout(activeVoiceTimer);activeVoiceTimer=null;
    const r=activeVoiceResolve;activeVoiceResolve=null;
    if(r)try{r(v)}catch{}
  }
  function stopVoice(){
    try{ttsAbort?.abort()}catch{}ttsAbort=null;
    settleVoice(false);
    try{currentSource?.stop()}catch{}currentSource=null;
    try{if(currentAudio){currentAudio.pause();currentAudio.removeAttribute('src');currentAudio.load?.()}}catch{}currentAudio=null;
    try{if(currentUtterance&&'speechSynthesis'in window)window.speechSynthesis.cancel()}catch{}currentUtterance=null;
  }
  function fallbackSpeak(text,locale,myTurn){
    try{
      if(myTurn!==turnId||!('speechSynthesis'in window)||!text)return false;
      const u=new SpeechSynthesisUtterance(String(text));currentUtterance=u;u.lang=locale||'en-IN';u.rate=.96;u.pitch=1.01;
      u.onend=u.onerror=()=>{if(currentUtterance===u)currentUtterance=null};window.speechSynthesis.speak(u);return true;
    }catch{return false}
  }
  async function neuralSpeak(text,locale,myTurn){
    if(!text||myTurn!==turnId||!isMember())return false;
    const ctl=new AbortController();ttsAbort=ctl;const fetchTimeout=setTimeout(()=>ctl.abort(),12000);
    try{
      const r=await fetch('/api/ai-speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:String(text).slice(0,900),locale:locale||'en-IN',voiceStyle:'natural-female'}),signal:ctl.signal});
      if(!r.ok||myTurn!==turnId)return false;
      const buf=await r.arrayBuffer();if(myTurn!==turnId)return false;
      const ctx=unlockAudio();
      if(ctx){
        try{
          if(ctx.state==='suspended')await ctx.resume();
          const decoded=await ctx.decodeAudioData(buf.slice(0));if(myTurn!==turnId)return false;
          return await new Promise(resolve=>{
            activeVoiceResolve=resolve;
            const src=ctx.createBufferSource();currentSource=src;src.buffer=decoded;src.connect(ctx.destination);
            const done=v=>{if(currentSource===src)currentSource=null;if(activeVoiceResolve===resolve){activeVoiceResolve=null;clearTimeout(activeVoiceTimer);activeVoiceTimer=null}resolve(v)};
            src.onended=()=>done(true);
            activeVoiceTimer=setTimeout(()=>{try{src.stop()}catch{}done(false)},Math.max(5000,Math.min(30000,(decoded.duration+4)*1000)));
            src.start(0);
          });
        }catch{}
      }
      const blob=new Blob([buf],{type:r.headers.get('content-type')||'audio/wav'}),url=URL.createObjectURL(blob),a=new Audio(url);currentAudio=a;
      return await new Promise(resolve=>{
        activeVoiceResolve=resolve;
        const done=v=>{try{URL.revokeObjectURL(url)}catch{}if(currentAudio===a)currentAudio=null;if(activeVoiceResolve===resolve){activeVoiceResolve=null;clearTimeout(activeVoiceTimer);activeVoiceTimer=null}resolve(v)};
        a.onended=()=>done(true);a.onerror=()=>done(false);
        activeVoiceTimer=setTimeout(()=>{try{a.pause()}catch{}done(false)},30000);
        const p=a.play();if(p?.catch)p.catch(()=>done(false));
      });
    }catch{return false}finally{clearTimeout(fetchTimeout);if(ttsAbort===ctl)ttsAbort=null}
  }

  const old=document.getElementById('dbest-ai-safe-host');if(old)old.remove();
  const old4=document.getElementById('dbest-ai-v4-host');if(old4)old4.remove();
  const host=document.createElement('div');host.id='dbest-ai-v4-host';host.style.cssText='position:fixed;right:12px;bottom:12px;z-index:2147483200;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;pointer-events:none';
  host.innerHTML=`<style>#dbest-ai-v4-host *{box-sizing:border-box}.a4-fab,.a4-panel{pointer-events:auto}.a4-fab{width:60px;height:60px;border:0;border-radius:50%;background:linear-gradient(145deg,#075ff5,#6b42ff);color:#fff;font-size:25px;box-shadow:0 12px 32px #183b9b55}.a4-panel{display:none;width:min(380px,calc(100vw - 24px));max-height:min(480px,calc(100dvh - 90px));background:#fff;border:1px solid #dfe6f2;border-radius:20px;overflow:hidden;box-shadow:0 20px 55px #10204444;margin-bottom:10px}.a4-panel.open{display:flex;flex-direction:column}.a4-head{background:linear-gradient(135deg,#0b3f9d,#1769ff,#6945ff);color:#fff;padding:13px;display:flex;align-items:center;gap:9px}.a4-title{font-size:16px;font-weight:900}.a4-sub{font-size:10px;opacity:.9}.a4-close{margin-left:auto;width:34px;height:34px;border:0;border-radius:10px;background:#ffffff22;color:#fff;font-size:20px}.a4-msgs{padding:12px;min-height:110px;max-height:285px;overflow:auto;background:#f6f8fc;display:flex;flex-direction:column;gap:8px}.a4-msg{padding:9px 11px;border-radius:13px;font-size:12.5px;line-height:1.45;max-width:92%;white-space:pre-wrap}.a4-u{align-self:flex-end;background:#1268ff;color:#fff}.a4-a{align-self:flex-start;background:#fff;border:1px solid #e3e8f1;color:#17243c}.a4-compose{padding:10px;border-top:1px solid #e5e9f1;display:flex;gap:7px}.a4-input{flex:1;min-width:0;border:1px solid #ced8e8;border-radius:12px;padding:10px 11px;font-size:16px}.a4-btn{width:42px;height:42px;border:0;border-radius:12px}.a4-mic{background:#edf4ff}.a4-send{background:#1268ff;color:#fff}.a4-status{padding:0 11px 10px;color:#63728a;font-size:10px}.a4-toast{display:none;pointer-events:none;margin-bottom:9px;max-width:335px;background:#172033;color:#fff;padding:10px 12px;border-radius:12px;font-size:11px;box-shadow:0 10px 28px #0004}.a4-toast.show{display:block}</style><div class="a4-toast" id="a4Toast"></div><div class="a4-panel" id="a4Panel"><div class="a4-head"><div><div class="a4-title">Ask DBest AI</div><div class="a4-sub">Continuous member AI • Gemini neural female voice</div></div><button class="a4-close" id="a4Close">×</button></div><div class="a4-msgs" id="a4Msgs"><div class="a4-msg a4-a">Tap the floating mic and speak. You can ask another request immediately after every response.</div></div><div class="a4-compose"><input class="a4-input" id="a4Input" placeholder="Type or tap mic…"><button class="a4-btn a4-mic" id="a4Mic">🎙️</button><button class="a4-btn a4-send" id="a4Send">➤</button></div><div class="a4-status" id="a4Status">Ready for your next request</div></div><button class="a4-fab" id="a4Fab">🎙️</button>`;
  document.body.appendChild(host);
  const q=id=>document.getElementById(id),panel=q('a4Panel'),fab=q('a4Fab'),input=q('a4Input'),msgs=q('a4Msgs'),status=q('a4Status'),mic=q('a4Mic'),toast=q('a4Toast');
  const add=(text,who)=>{const d=document.createElement('div');d.className='a4-msg '+(who==='u'?'a4-u':'a4-a');d.textContent=String(text||'');msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight};
  const notice=(text,ms=6500)=>{toast.textContent=String(text||'');toast.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>toast.classList.remove('show'),ms)};
  const collapse=()=>{panel.classList.remove('open');fab.style.display='block'};
  const sync=()=>{const on=isMember();host.style.display=on?'block':'none';if(!on){panel.classList.remove('open');stopVoice();stopRecording()}};
  q('a4Close').onclick=collapse;

  function mergeTask(a,b){if(!a)return b;if(!b)return a;return{route:b.route||a.route,subsection:b.subsection||a.subsection,taskData:{...(a.taskData||{}),...(b.taskData||{})}}}
  async function askAI(text,myTurn){
    try{aiAbort?.abort()}catch{}const ctl=new AbortController();aiAbort=ctl;const tm=setTimeout(()=>ctl.abort(),12000);
    try{const r=await fetch('/api/ai-assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,locale:'auto',history:[]}),signal:ctl.signal});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'AI unavailable');if(myTurn!==turnId)throw new DOMException('Stale turn','AbortError');return d}finally{clearTimeout(tm);if(aiAbort===ctl)aiAbort=null}
  }

  async function submit(raw){
    const text=String(raw||input.value||'').trim();if(!text||!isMember())return;
    const myTurn=++turnId;
    try{aiAbort?.abort()}catch{};try{transcribeAbort?.abort()}catch{};stopVoice();unlockAudio();
    input.value='';add(text,'u');status.textContent='Understanding…';
    const base=api(),local=base?.parse?base.parse(text):null;
    if(local&&base?.route){collapse();notice(`Opening ${local.subsection||'DBest service'}…`,2600);Promise.resolve(base.route(local)).catch(()=>{})}
    try{
      const d=await askAI(text,myTurn);if(myTurn!==turnId)return;
      const server=d.route?{route:d.route,subsection:d.subsection||'',taskData:d.taskData||{}}:null,task=mergeTask(local,server),reply=String(d.reply||'').trim(),locale=d.languageCode||'en-IN';
      if(!local&&task&&base?.route){collapse();notice(`Opening ${task.subsection||'DBest service'}…`,2600);Promise.resolve(base.route(task)).catch(()=>{})}
      if(reply){
        notice(reply,9000);status.textContent='Speaking… you can ask the next request anytime';
        neuralSpeak(reply,locale,myTurn).then(ok=>{if(!ok&&myTurn===turnId)fallbackSpeak(reply,locale,myTurn);if(myTurn===turnId)status.textContent='Ready for your next request'}).catch(()=>{if(myTurn===turnId){fallbackSpeak(reply,locale,myTurn);status.textContent='Ready for your next request'}});
      }else status.textContent='Ready for your next request';
    }catch(e){if(myTurn!==turnId)return;if(e?.name!=='AbortError'){status.textContent='Ready — AI reply temporarily unavailable';notice('The DBest section remains usable. You can ask another request now.',4500)}}
  }
  q('a4Send').onclick=()=>{unlockAudio();submit()};
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();unlockAudio();submit()}});

  function stopRecording(){
    clearTimeout(recordTimer);recordTimer=null;
    try{if(recorder&&recorder.state!=='inactive')recorder.stop()}catch{}
  }
  async function beginRecording(){
    if(!isMember())return;
    stopVoice();unlockAudio();try{transcribeAbort?.abort()}catch{};transcribeAbort=null;
    if(recorder&&recorder.state==='recording'){stopRecording();return}
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];const rec=new MediaRecorder(stream);recorder=rec;
      rec.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
      rec.onstop=async()=>{
        clearTimeout(recordTimer);recordTimer=null;mic.textContent='🎙️';
        const mime=rec.mimeType||'audio/webm';try{stream?.getTracks().forEach(t=>t.stop())}catch{}stream=null;if(recorder===rec)recorder=null;
        const blob=new Blob(chunks,{type:mime});chunks=[];if(!blob.size){status.textContent='Ready for your next request';return}
        status.textContent='Understanding voice…';
        try{
          const buf=await blob.arrayBuffer();let bin='';const bytes=new Uint8Array(buf);for(let i=0;i<bytes.length;i+=8192)bin+=String.fromCharCode(...bytes.subarray(i,i+8192));
          const ctl=new AbortController();transcribeAbort=ctl;const tm=setTimeout(()=>ctl.abort(),12000);
          try{
            const r=await fetch('/api/ai-transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audioBase64:btoa(bin),mimeType:mime,locale:'auto'}),signal:ctl.signal});
            const d=await r.json().catch(()=>({}));
            if(r.ok&&d.text){input.value=d.text;submit(d.text)}else status.textContent='Voice unavailable — tap mic and try again';
          }finally{clearTimeout(tm);if(transcribeAbort===ctl)transcribeAbort=null}
        }catch(e){if(e?.name!=='AbortError')status.textContent='Voice unavailable — tap mic and try again'}
      };
      rec.onerror=()=>{try{stream?.getTracks().forEach(t=>t.stop())}catch{}stream=null;recorder=null;mic.textContent='🎙️';status.textContent='Ready — tap mic and try again'};
      rec.start();mic.textContent='■';status.textContent='Listening… tap again to stop';recordTimer=setTimeout(stopRecording,8500);
    }catch{stream=null;recorder=null;mic.textContent='🎙️';status.textContent='Microphone permission unavailable'}
  }

  mic.onclick=()=>{unlockAudio();beginRecording()};
  fab.onclick=e=>{
    e.preventDefault();e.stopPropagation();unlockAudio();if(!isMember())return;
    panel.classList.add('open');fab.style.display='none';status.textContent='Starting microphone…';
    beginRecording();
  };

  document.addEventListener('visibilitychange',()=>{if(!document.hidden)unlockAudio()});
  setInterval(sync,500);sync();
  window.__DBEST_AI_CONTINUOUS_V4__={version:VERSION,submit,neuralSpeak,stopVoice,beginRecording,stopRecording};
})();