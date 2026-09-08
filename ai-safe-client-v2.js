(() => {
  'use strict';
  const VERSION='2.0-section-first-voice-safe';
  const MEMBER_ROLES=new Set(['guest','promoter','prime','leader']);
  let busy=false,recorder=null,stream=null,chunks=[],recordTimer=null,lastTask=null;

  function getSession(){try{return JSON.parse(localStorage.getItem('d2_session')||'{}')||{}}catch{return{}}}
  function isMember(){const s=getSession();return !!(s.id&&MEMBER_ROLES.has(String(s.role||'')))}
  const low=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
  const clean=s=>String(s||'').trim().replace(/[,.!?]+$/,'').trim();
  const wordNums={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,'एक':1,'दो':2,'तीन':3,'चार':4,'पाँच':5,'पांच':5,'छह':6,'सात':7,'आठ':8,'नौ':9,'दस':10};

  function peopleCount(text){
    const s=String(text||'');
    let m=s.match(/(\d+)\s*(?:adult|adults|people|persons|passengers|pax|लोग|व्यक्ति)\b/i);if(m)return Number(m[1]);
    for(const [w,n] of Object.entries(wordNums))if(new RegExp(`(?:^|\\s)${w}(?:\\s+)(?:adult|adults|people|persons|passengers|pax|लोग|व्यक्ति)\\b`,'i').test(s))return n;
    return undefined;
  }
  function pair(text){
    const raw=String(text||'').replace(/\s+/g,' ').trim();
    let m=raw.match(/\bfrom\s+(.+?)\s+to\s+(.+?)(?=\s+(?:today|tomorrow|tonight|on|at|for|with|please|by)\b|[,.!?]|$)/i);
    if(m)return{from:clean(m[1]),to:clean(m[2])};
    m=raw.match(/(.+?)\s+से\s+(.+?)\s+(?:की|का|के)?\s*(?:फ्लाइट|कैब|टैक्सी|यात्रा)\b/i);
    if(m)return{from:clean(m[1]),to:clean(m[2])};
    return{};
  }
  function parse(text){
    const t=low(text),d={};let route='',subsection='';
    const cab=/\b(cab|taxi|ride|pickup|drop)\b|कैब|टैक्सी|ক্যাব|ট্যাক্সি|କ୍ୟାବ|ଟାକ୍ସି/.test(t);
    const flight=/\b(flight|air ticket|airfare)\b|फ्लाइट|हवाई टिकट|ফ্লাইট|বিমান টিকিট|ଫ୍ଲାଇଟ୍|ବିମାନ ଟିକେଟ/.test(t);
    const hotel=/\b(hotel|stay|room booking)\b|होटल|হোটেল|ହୋଟେଲ/.test(t);
    const packageQ=/\b(package|holiday|tour|itinerary)\b|पैकेज|टूर|প্যাকেজ|ট্যুর|ପ୍ୟାକେଜ|ଟୁର/.test(t);
    const life=/life insurance|term insurance|term plan|life cover|जीवन बीमा|टर्म इंश्योरेंस|জীবন বীমা|টার্ম ইন্স্যুরেন্স|ଜୀବନ ବୀମା/.test(t);
    const health=/health insurance|health cover|mediclaim|family floater|स्वास्थ्य बीमा|हेल्थ इंश्योरेंस|স্বাস্থ্য বীমা|ହେଲ୍ଥ ଇନ୍ସୁରେନ୍ସ/.test(t);
    const motor=/motor insurance|vehicle insurance|car insurance|bike insurance|मोटर बीमा|वाहन बीमा|মোটর বীমা|ଗାଡ଼ି ବୀମା/.test(t);
    const mf=/mutual fund|\bsip\b|lumpsum|portfolio|म्यूचुअल फंड|एसआईपी|মিউচুয়াল ফান্ড|এসআইপি|ମ୍ୟୁଚୁଆଲ୍ ଫଣ୍ଡ/.test(t);
    if(cab){route='car';subsection='Cab Booking';const p=pair(text);if(p.from)d.pickup=p.from;if(p.to)d.drop=p.to;}
    else if(flight){route='flights';subsection='Flight Booking';const p=pair(text);if(p.from)d.from=p.from;if(p.to)d.to=p.to;const a=peopleCount(text);if(a)d.adults=a;}
    else if(hotel||packageQ){route='travel';subsection=hotel&&!packageQ?'Hotel Booking':packageQ&&/itinerary/.test(t)?'Custom Itinerary':'Tour Package';const m=String(text).match(/(?:hotel|stay|package|tour|पैकेज|होटल)\s+(?:in|at|for|to|में|के लिए)?\s*([A-Za-z][A-Za-z .'-]{1,45})/i);if(m)d.destination=clean(m[1]);const a=peopleCount(text);if(a)d.adults=a;const star=String(text).match(/\b([345])\s*[- ]?star\b/i);if(star)d.category=`${star[1]} Star`;}
    else if(life||health||motor){route='insurance';subsection=life?'Life Insurance':health?'Health Insurance':'Motor Insurance';d.insuranceType=subsection;const c=String(text).match(/(?:₹|rs\.?|inr\s*)?\s*([\d,.]+\s*(?:crore|cr|lakh|lac))/i);if(c)d.sumInsured=c[1].trim();}
    else if(mf){route='mf';subsection=/portfolio/.test(t)?'Portfolio Assistance':'Mutual Fund Investment';if(/\bsip\b|एसआईपी|এসআইপি/.test(t))d.investmentType='SIP';const a=String(text).match(/(?:₹|rs\.?|inr\s*)?\s*([\d,]+)\s*(?:per month|monthly|\/month)?/i);if(a)d.amount=Number(a[1].replace(/,/g,''));if(/per month|monthly|हर महीने|प्रति माह|প্রতি মাস|ମାସିକ/.test(t))d.frequency='Monthly';}
    return route?{route,subsection,taskData:d}:null;
  }

  function detectLocale(text){const s=String(text||'');if(/[\u0900-\u097F]/.test(s))return'hi-IN';if(/[\u0980-\u09FF]/.test(s))return'bn-IN';if(/[\u0B00-\u0B7F]/.test(s))return'or-IN';return'en-IN'}
  function ackFor(task,text){const l=detectLocale(text),sub=task?.subsection||'service';if(l==='hi-IN')return `ज़रूर, मैं आपको ${sub} सेक्शन में ले जा रही हूँ।`;if(l==='bn-IN')return `অবশ্যই, আমি আপনাকে ${sub} বিভাগে নিয়ে যাচ্ছি।`;if(l==='or-IN')return `ନିଶ୍ଚୟ, ମୁଁ ଆପଣଙ୍କୁ ${sub} ବିଭାଗକୁ ନେଉଛି।`;return `Sure. I’m taking you to the ${sub} section.`}
  function browserSpeak(text,locale){try{if(!('speechSynthesis' in window)||!text)return false;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(String(text));u.lang=locale||'en-IN';u.rate=.98;u.pitch=1.03;window.speechSynthesis.speak(u);return true}catch{return false}}

  const host=document.createElement('div');host.id='dbest-ai-safe-host';host.style.cssText='position:fixed;right:14px;bottom:14px;z-index:2147483000;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;pointer-events:none';document.body.appendChild(host);
  host.innerHTML=`<style>#dbest-ai-safe-host *{box-sizing:border-box}.dbsa-fab,.dbsa-panel{pointer-events:auto}.dbsa-fab{width:58px;height:58px;border:0;border-radius:50%;background:linear-gradient(145deg,#0a64ff,#6f3cff);color:white;font-size:25px;box-shadow:0 12px 34px #1b3da755;cursor:pointer}.dbsa-panel{display:none;width:min(360px,calc(100vw - 28px));max-height:min(450px,calc(100dvh - 110px));background:#fff;border:1px solid #e1e7f0;border-radius:20px;box-shadow:0 20px 55px #10204444;overflow:hidden;margin-bottom:10px}.dbsa-panel.open{display:flex;flex-direction:column}.dbsa-head{background:linear-gradient(135deg,#0a3d9f,#1768ff,#6a43ff);color:white;padding:13px;display:flex;align-items:center;gap:10px}.dbsa-title{font-weight:850}.dbsa-sub{font-size:10px;opacity:.9}.dbsa-close{margin-left:auto;width:34px;height:34px;border:0;border-radius:10px;background:#ffffff22;color:white;font-size:20px}.dbsa-msgs{padding:12px;background:#f6f8fc;overflow:auto;min-height:100px;max-height:270px;display:flex;flex-direction:column;gap:8px}.dbsa-msg{padding:9px 11px;border-radius:13px;font-size:12.5px;line-height:1.45;max-width:90%;white-space:pre-wrap}.dbsa-u{align-self:flex-end;background:#1268ff;color:#fff}.dbsa-a{align-self:flex-start;background:#fff;border:1px solid #e3e8f1;color:#18243c}.dbsa-compose{padding:10px;border-top:1px solid #e5e9f1;display:flex;gap:7px;background:#fff}.dbsa-input{flex:1;min-width:0;border:1px solid #cfd8e7;border-radius:12px;padding:10px 11px;font-size:16px}.dbsa-btn{width:40px;height:40px;border:0;border-radius:12px;cursor:pointer}.dbsa-mic{background:#eef4ff}.dbsa-send{background:#1268ff;color:white}.dbsa-status{padding:0 11px 9px;background:#fff;color:#6f7b8e;font-size:10px}.dbsa-toast{display:none;pointer-events:none;margin-bottom:9px;max-width:320px;background:#172033;color:white;padding:9px 11px;border-radius:12px;font-size:11px;box-shadow:0 10px 28px #0004}.dbsa-toast.show{display:block}@media(max-width:480px){#dbest-ai-safe-host{right:10px!important;bottom:10px!important}}</style><div class="dbsa-toast" id="dbsaToast"></div><div class="dbsa-panel" id="dbsaPanel"><div class="dbsa-head"><div><div class="dbsa-title">Ask DBest AI</div><div class="dbsa-sub">Member AI • safe section-first routing</div></div><button class="dbsa-close" id="dbsaClose">×</button></div><div class="dbsa-msgs" id="dbsaMsgs"><div class="dbsa-msg dbsa-a">Speak or type naturally. I’ll take you to the right DBest section without blocking the screen.</div></div><div class="dbsa-compose"><input class="dbsa-input" id="dbsaInput" placeholder="Type or tap mic…"><button class="dbsa-btn dbsa-mic" id="dbsaMic">🎙️</button><button class="dbsa-btn dbsa-send" id="dbsaSend">➤</button></div><div class="dbsa-status" id="dbsaStatus">Ready</div></div><button class="dbsa-fab" id="dbsaFab">🎙️</button>`;
  const byId=id=>document.getElementById(id),panel=byId('dbsaPanel'),fab=byId('dbsaFab'),input=byId('dbsaInput'),msgs=byId('dbsaMsgs'),status=byId('dbsaStatus'),toast=byId('dbsaToast'),mic=byId('dbsaMic');
  function sync(){const on=isMember();host.style.display=on?'block':'none';if(!on){panel.classList.remove('open');busy=false}}
  function add(text,who){const d=document.createElement('div');d.className='dbsa-msg '+(who==='u'?'dbsa-u':'dbsa-a');d.textContent=text;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight}
  function notice(text,ms=5000){toast.textContent=text;toast.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>toast.classList.remove('show'),ms)}
  function collapse(){panel.classList.remove('open');fab.style.display='block'}
  fab.onclick=()=>{if(!isMember())return;panel.classList.add('open');fab.style.display='none';setTimeout(()=>input.focus(),60)};
  byId('dbsaClose').onclick=collapse;

  function mergeTask(a,b){if(!a)return b;if(!b)return a;return{route:b.route||a.route,subsection:b.subsection||a.subsection,taskData:{...(a.taskData||{}),...(b.taskData||{})}}}
  function placeholders(url,task){const d=task.taskData||{},vals={FROM:d.from||d.pickup||'',TO:d.to||d.drop||'',DESTINATION:d.destination||d.to||d.drop||'',ADULTS:d.adults||'',CHILDREN:d.children||'',ROOMS:d.rooms||'',SUM_INSURED:d.sumInsured||'',AMOUNT:d.amount||'',INVESTMENT_TYPE:d.investmentType||'',FREQUENCY:d.frequency||'',SUBSECTION:task.subsection||''};let out=String(url||'');for(const [k,v] of Object.entries(vals))if(v!==''&&v!=null)out=out.replaceAll(`{${k}}`,encodeURIComponent(String(v)));return out}
  function serviceId(task){return task.route==='insurance'?'insurance':task.route==='mf'?'mf':'flights'}
  function targetWords(task){const s=String(task.subsection||'').toLowerCase();if(s.includes('life'))return['life'];if(s.includes('health'))return['health'];if(s.includes('motor'))return['motor'];if(s.includes('hotel'))return['hotel'];if(s.includes('package')||s.includes('itinerary'))return['package','tour'];if(s.includes('flight'))return['flight'];if(s.includes('portfolio'))return['portfolio'];if(task.route==='mf')return['mutual','sip'];return[]}

  async function openCab(task){
    const pickup=String(task.taskData?.pickup||''),drop=String(task.taskData?.drop||'');let ui=window.DBEST_CAB_SELECTED_UI;
    try{if((!ui||typeof ui.open!=='function')&&window.DBEST_CAB_ENTRY_CAPTURE?.ensure)ui=await window.DBEST_CAB_ENTRY_CAPTURE.ensure()}catch{}
    ui=window.DBEST_CAB_SELECTED_UI||ui;if(!ui?.open){if(typeof window.openRidePlatform==='function')window.openRidePlatform();return false}
    const geo=navigator.geolocation,orig=geo&&geo.getCurrentPosition;let patched=false;if(pickup&&orig){try{geo.getCurrentPosition=function(ok,err){if(err)setTimeout(()=>err({code:1,message:'AI pickup supplied'}),0)};patched=true}catch{}}
    try{ui.open()}finally{if(patched)try{geo.getCurrentPosition=orig}catch{}}
    const apply=()=>{const p=byId('cab6P'),d=byId('cab6D');if(p&&pickup){p.value=pickup;p.setAttribute('value',pickup)}if(d&&drop){d.value=drop;d.setAttribute('value',drop)}};apply();[80,250,700,1400].forEach(ms=>setTimeout(apply,ms));return true
  }

  function openPartner(task){
    if(!isMember())return false;const id=serviceId(task);let link=null;try{if(typeof links!=='undefined'&&links?.[id]?.url&&links[id].enabled!==false)link=links[id]}catch{}
    if(!link?.url||typeof window.externalGo!=='function'){notice('Partner link is not configured for this service.',4500);return false}
    const originalUrl=link.url,originalOpen=window.open;let blockedUrl='';
    try{
      link.url=placeholders(originalUrl,task);
      window.open=function(url,target,features){let w=null;try{w=originalOpen.call(window,url,target,features)}catch{}if(!w){blockedUrl=String(url||'');return null}return w};
      window.externalGo(id);
      if(blockedUrl)setTimeout(()=>{try{location.assign(blockedUrl)}catch{}},60);
      return true;
    }catch(e){notice('Unable to open partner site. Please try again.',4500);return false}
    finally{window.open=originalOpen;try{link.url=originalUrl}catch{}}
  }

  function renderSectionBanner(task){
    const roots=[...document.querySelectorAll('.sectionContent')].filter(el=>{try{const r=el.getBoundingClientRect();return r.width>0&&r.height>0}catch{return false}});const root=roots.pop();if(!root)return false;
    let box=root.querySelector('#dbestAiSafeContext');if(!box){box=document.createElement('div');box.id='dbestAiSafeContext';box.style.cssText='margin:0 0 14px;padding:14px;border-radius:16px;background:linear-gradient(135deg,#eef5ff,#f5f0ff);border:1px solid #d7e3ff;color:#173b72;box-shadow:0 8px 22px rgba(32,68,140,.10)';root.prepend(box)}
    const pairs=Object.entries(task.taskData||{}).filter(([,v])=>v!==''&&v!=null).slice(0,8);box.innerHTML='';
    const h=document.createElement('div');h.style.cssText='font-weight:900;font-size:15px';h.textContent='✨ DBest AI selected: '+(task.subsection||'Service');box.appendChild(h);
    const p=document.createElement('div');p.style.cssText='font-size:11px;color:#5c6d86;margin-top:5px';p.textContent=pairs.length?'Captured: '+pairs.map(([k,v])=>k+': '+v).join(' • '):'Your request has been carried to this section.';box.appendChild(p);
    const btn=document.createElement('button');btn.type='button';btn.textContent='Continue to Partner →';btn.style.cssText='margin-top:10px;border:0;border-radius:11px;padding:10px 14px;background:#1768ff;color:#fff;font-weight:850;font-size:12px;cursor:pointer';btn.onclick=()=>openPartner(task);box.appendChild(btn);
    const show=root.querySelector('[data-dbest-showcase]');if(show){const words=targetWords(task);let best=null,bestScore=0;for(const c of show.querySelectorAll('.dbestShowCard')){const s=String(c.innerText||'').toLowerCase();let sc=0;words.forEach((w,i)=>{if(s.includes(w))sc+=10-i});if(sc>bestScore){bestScore=sc;best=c}}if(best){show.querySelectorAll('.dbestShowCard').forEach(c=>{c.style.outline='';c.style.boxShadow=''});best.style.outline='3px solid #1768ff';best.style.outlineOffset='3px';best.style.boxShadow='0 14px 30px rgba(23,104,255,.20)';setTimeout(()=>best.scrollIntoView({behavior:'smooth',block:'center'}),120)}}
    return true;
  }
  function openExternalSection(task){
    const id=serviceId(task);try{sessionStorage.setItem('dbest_ai_last_member_task_v1',JSON.stringify({...task,at:Date.now()}))}catch{}
    if(typeof window.openService!=='function')return false;window.openService(id);[80,180,350,700,1200].forEach(ms=>setTimeout(()=>renderSectionBanner(task),ms));return true
  }
  async function route(task){if(!task)return false;collapse();notice(`Opening ${task.subsection||'DBest service'}…`,2200);if(task.route==='car')return openCab(task);if(['insurance','travel','flights','mf'].includes(task.route))return openExternalSection(task);return false}

  async function askAI(text){const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),10000);try{const r=await fetch('/api/ai-assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,locale:'auto',history:[]}),signal:ac.signal});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'AI unavailable');return d}finally{clearTimeout(timer)}}
  async function cloudSpeak(text,locale){if(!text||!isMember())return false;const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),6500);try{const r=await fetch('/api/ai-speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:String(text).slice(0,500),locale:locale||'en-IN'}),signal:ac.signal});if(!r.ok)return false;const blob=await r.blob();const u=URL.createObjectURL(blob),a=new Audio(u);return await new Promise(resolve=>{a.onended=()=>{URL.revokeObjectURL(u);resolve(true)};a.onerror=()=>{URL.revokeObjectURL(u);resolve(false)};const pr=a.play();if(pr?.catch)pr.catch(()=>{URL.revokeObjectURL(u);resolve(false)})})}catch{return false}finally{clearTimeout(timer)}}

  async function submit(raw){
    const text=String(raw||input.value||'').trim();if(!text||busy||!isMember())return;busy=true;input.value='';add(text,'u');status.textContent='Working…';
    const local=parse(text);lastTask=local;if(local){browserSpeak(ackFor(local,text),detectLocale(text));route(local).catch(()=>{})}
    try{
      const d=await askAI(text);const server=d.route?{route:d.route,subsection:d.subsection||'',taskData:d.taskData||{}}:null;lastTask=mergeTask(local,server);
      const reply=String(d.reply||'').trim();if(reply){notice(reply,7000);if(!local){const ok=await cloudSpeak(reply,d.languageCode||detectLocale(text));if(!ok)browserSpeak(reply,d.languageCode||detectLocale(text))}}
      if(!local&&lastTask)route(lastTask).catch(()=>{});else if(local&&lastTask&&['insurance','travel','flights','mf'].includes(lastTask.route)){[50,250,650].forEach(ms=>setTimeout(()=>renderSectionBanner(lastTask),ms))}
      if(local?.route==='car'&&lastTask){const p=lastTask.taskData?.pickup,dst=lastTask.taskData?.drop;if(p||dst){const apply=()=>{const a=byId('cab6P'),b=byId('cab6D');if(a&&p)a.value=p;if(b&&dst)b.value=dst};[50,250,700].forEach(ms=>setTimeout(apply,ms))}}
      status.textContent='Ready';
    }catch(e){status.textContent='AI temporarily unavailable';notice('DBest AI reply is temporarily unavailable. The selected DBest section remains usable.',4500)}finally{busy=false}
  }
  byId('dbsaSend').onclick=()=>submit();input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit()}});

  async function stopRecord(){if(recorder&&recorder.state!=='inactive')recorder.stop()}
  mic.onclick=async()=>{if(!isMember()||busy)return;if(recorder&&recorder.state==='recording'){stopRecord();return}try{stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};recorder.onstop=async()=>{clearTimeout(recordTimer);mic.textContent='🎙️';try{stream?.getTracks().forEach(t=>t.stop())}catch{}const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});const buf=await blob.arrayBuffer();let bin='';const bytes=new Uint8Array(buf);for(let i=0;i<bytes.length;i+=8192)bin+=String.fromCharCode(...bytes.subarray(i,i+8192));status.textContent='Understanding voice…';const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),10000);try{const r=await fetch('/api/ai-transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audioBase64:btoa(bin),mimeType:blob.type,locale:'auto'}),signal:ac.signal});const d=await r.json().catch(()=>({}));if(r.ok&&d.text){input.value=d.text;submit(d.text)}else status.textContent='Voice unavailable — type instead'}catch{status.textContent='Voice unavailable — type instead'}finally{clearTimeout(tm)}};recorder.start();mic.textContent='■';status.textContent='Listening… tap again to stop';recordTimer=setTimeout(()=>stopRecord(),8000)}catch{status.textContent='Microphone permission unavailable'}};

  setInterval(sync,400);sync();window.__DBEST_AI_SAFE_V2__={version:VERSION,parse,route,renderSectionBanner,openPartner};
})();