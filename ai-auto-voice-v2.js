(() => {
  'use strict';
  let recorder=null,stream=null,chunks=[],timer=null,recording=false;
  const toBase64=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||'').split(',')[1]||'');r.onerror=reject;r.readAsDataURL(blob);});
  function setup(){
    const host=document.querySelector('#dbest-ai-test-host');
    const root=host&&host.shadowRoot;
    if(!root){setTimeout(setup,120);return;}
    const mic=root.querySelector('#mic'),status=root.querySelector('#status'),lang=root.querySelector('#lang');
    if(!mic||!status||!lang){setTimeout(setup,120);return;}
    if(mic.dataset.autoVoiceV2==='1')return;
    mic.dataset.autoVoiceV2='1';

    async function stop(){
      if(!recording||!recorder)return;
      recording=false;clearTimeout(timer);mic.classList.remove('listening');mic.textContent='🎙️';
      try{recorder.stop();}catch{}
    }
    async function start(){
      if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){status.textContent='This browser cannot record voice • please use Chrome';return;}
      try{
        stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];let mime='';
        for(const m of ['audio/webm;codecs=opus','audio/webm','audio/mp4']){if(MediaRecorder.isTypeSupported?.(m)){mime=m;break;}}
        recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
        recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
        recorder.onstop=async()=>{
          const blob=new Blob(chunks,{type:recorder?.mimeType||mime||'audio/webm'});
          stream?.getTracks().forEach(t=>t.stop());stream=null;
          if(blob.size<500){status.textContent='No speech detected';return;}
          try{
            status.textContent=lang.value==='auto'?'Detecting this spoken language…':'Transcribing voice…';
            const audioBase64=await toBase64(blob);
            const r=await fetch('/api/ai-transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audioBase64,mimeType:blob.type||'audio/webm',locale:lang.value})});
            let data={};try{data=await r.json();}catch{}
            if(!r.ok||!data.text)throw new Error(data.code||'transcription_unavailable');
            const detected=String(data.language||lang.value||'auto');
            status.textContent=`Detected: ${detected}`;
            if(window.__DBEST_AI_TEST__?.submit) await window.__DBEST_AI_TEST__.submit(data.text,detected);
          }catch(err){status.textContent='Voice detection temporarily unavailable • tap mic and retry';}
        };
        recording=true;recorder.start();mic.classList.add('listening');mic.textContent='■';status.textContent=lang.value==='auto'?'Listening • Auto detects every turn':'Listening…';timer=setTimeout(stop,10000);
      }catch{status.textContent='Microphone permission is needed';}
    }
    mic.onclick=()=>{if(recording)stop();else start();};
    const hello=root.querySelector('.hello');
    if(hello)hello.innerHTML='<b>Speak naturally in any major Indian language.</b><br>In Auto mode, DBest detects every spoken turn independently, replies in the same language, and uses the multilingual female cloud voice when supported.';
    status.textContent='Ready • Auto detects every voice turn';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
