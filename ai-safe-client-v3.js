(() => {
  'use strict';
  const VERSION='3.0-persistent-voice-partner-prefill';
  const MEMBER_ROLES=new Set(['guest','promoter','prime','leader']);
  let busy=false, recorder=null, stream=null, chunks=[], recordTimer=null, lastTask=null;
  let audioCtx=null, voiceChain=Promise.resolve();
  const utterances=new Set();

  function getSession(){try{return JSON.parse(localStorage.getItem('d2_session')||'{}')||{}}catch{return{}}}
  function isMember(){const s=getSession();return !!(s.id&&MEMBER_ROLES.has(String(s.role||'')))}
  const low=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
  const clean=s=>String(s||'').trim().replace(/[,.!?]+$/,'').trim();
  const wordNums={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,'एक':1,'दो':2,'तीन':3,'चार':4,'पाँच':5,'पांच':5,'छह':6,'सात':7,'आठ':8,'नौ':9,'दस':10};

  function peopleCount(text){
    const s=String(text||'');
    let m=s.match(/(\d+)\s*(?:adult|adults|people|persons|passengers|pax|लोग|व्यक्ति)\b/i);
    if(m)return Number(m[1]);
    for(const [w,n] of Object.entries(wordNums)){
      if(new RegExp(`(?:^|\\s)${w}(?:\\s+)(?:adult|adults|people|persons|passengers|pax|लोग|व्यक्ति)\\b`,'i').test(s))return n;
    }
    return undefined;
  }
  function countOf(text,words){
    const s=String(text||'');
    let m=s.match(new RegExp(`(\\d+)\\s*(?:${words})\\b`,'i'));if(m)return Number(m[1]);
    for(const [w,n] of Object.entries(wordNums)){
      if(new RegExp(`(?:^|\\s)${w}(?:\\s+)(?:${words})\\b`,'i').test(s))return n;
    }
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
  function dateHints(text,d){
    const raw=String(text||'');
    const dep=raw.match(/\b(?:on|depart(?:ure)?(?: on)?|travel(?: on)?)\s+([0-3]?\d(?:st|nd|rd|th)?\s+[A-Za-z]+(?:\s+\d{4})?|\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i);
    const ret=raw.match(/\breturn(?:ing)?(?: on)?\s+([0-3]?\d(?:st|nd|rd|th)?\s+[A-Za-z]+(?:\s+\d{4})?|\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i);
    if(dep)d.departure=clean(dep[1]); if(ret)d.return=clean(ret[1]);
    const ci=raw.match(/\bcheck\s*-?in(?: on)?\s+([^,.;]+?)(?=\s+check\s*-?out\b|[,.;]|$)/i);
    const co=raw.match(/\bcheck\s*-?out(?: on)?\s+([^,.;]+?)(?=[,.;]|$)/i);
    if(ci)d.checkin=clean(ci[1]);if(co)d.checkout=clean(co[1]);
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

    if(cab){
      route='car';subsection='Cab Booking';const p=pair(text);if(p.from)d.pickup=p.from;if(p.to)d.drop=p.to;dateHints(text,d);
    } else if(flight){
      route='flights';subsection='Flight Booking';const p=pair(text);if(p.from)d.from=p.from;if(p.to)d.to=p.to;
      const a=peopleCount(text),c=countOf(text,'child|children|kids|बच्चे|बच्चा'),i=countOf(text,'infant|infants|शिशु');
      if(a)d.adults=a;if(c!==undefined)d.children=c;if(i!==undefined)d.infants=i;dateHints(text,d);
    } else if(hotel||packageQ){
      route='travel';subsection=hotel&&!packageQ?'Hotel Booking':packageQ&&/itinerary/.test(t)?'Custom Itinerary':'Tour Package';
      let m=String(text).match(/(?:hotel|stay|package|tour|पैकेज|होटल)\s+(?:in|at|for|to|में|के लिए)?\s*([A-Za-z][A-Za-z .'-]{1,45})/i);
      if(m)d.destination=clean(m[1]);
      const a=peopleCount(text),rooms=countOf(text,'room|rooms|कमरा|कमरे');if(a)d.adults=a;if(rooms)d.rooms=rooms;
      const star=String(text).match(/\b([345])\s*[- ]?star\b/i);if(star)d.category=`${star[1]} Star`;
      const budget=String(text).match(/(?:budget(?: of)?|under|within)\s*(?:₹|rs\.?|inr\s*)?\s*([\d,]+)/i);if(budget)d.budget=Number(budget[1].replace(/,/g,''));
      dateHints(text,d);
    } else if(life||health||motor){
      route='insurance';subsection=life?'Life Insurance':health?'Health Insurance':'Motor Insurance';d.insuranceType=subsection;
      const c=String(text).match(/(?:₹|rs\.?|inr\s*)?\s*([\d,.]+\s*(?:crore|cr|lakh|lac))/i);if(c)d.sumInsured=c[1].trim();
      const pin=String(text).match(/\b(\d{6})\b/);if(pin)d.pincode=pin[1];
      const age=String(text).match(/\bage\s*(?:is|of|:)?\s*(\d{1,2})\b/i);if(age)d.age=Number(age[1]);
    } else if(mf){
      route='mf';subsection=/portfolio/.test(t)?'Portfolio Assistance':'Mutual Fund Investment';
      if(/\bsip\b|एसआईपी|এসআইপি/.test(t))d.investmentType='SIP';else if(/lump\s*sum|lumpsum/.test(t))d.investmentType='Lumpsum';
      const a=String(text).match(/(?:₹|rs\.?|inr\s*)?\s*([\d,]+)\s*(?:per month|monthly|\/month)?/i);if(a)d.amount=Number(a[1].replace(/,/g,''));
      if(/per month|monthly|हर महीने|प्रति माह|প্রতি মাস|ମାସିକ/.test(t))d.frequency='Monthly';
    }
    return route?{route,subsection,taskData:d}:null;
  }

  function detectLocale(text){
    const s=String(text||'');if(/[\u0900-\u097F]/.test(s))return'hi-IN';if(/[\u0980-\u09FF]/.test(s))return'bn-IN';if(/[\u0B00-\u0B7F]/.test(s))return'or-IN';return'en-IN';
  }
  function ackFor(task,text){
    const l=detectLocale(text),sub=task?.subsection||'service';
    if(l==='hi-IN')return `ज़रूर। मैंने आपकी जानकारी नोट कर ली है और ${sub} सेक्शन खोल रही हूँ।`;
    if(l==='bn-IN')return `অবশ্যই। আপনার তথ্য নোট করেছি এবং ${sub} বিভাগ খুলছি।`;
    if(l==='or-IN')return `ନିଶ୍ଚୟ। ଆପଣଙ୍କ ତଥ୍ୟ ନୋଟ କରି ${sub} ବିଭାଗ ଖୋଲୁଛି।`;
    return `Sure. I have your details and I’m opening the ${sub} section.`;
  }

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
  function browserSpeak(text,locale){
    try{
      if(!('speechSynthesis' in window)||!text)return false;
      const u=new SpeechSynthesisUtterance(String(text));u.lang=locale||'en-IN';u.rate=.96;u.pitch=1.02;
      utterances.add(u);u.onend=u.onerror=()=>utterances.delete(u);
      window.speechSynthesis.speak(u);return true;
    }catch{return false}
  }
  async function cloudVoiceNow(text,locale){
    if(!text||!isMember())return false;
    const ctx=unlockAudio(),ac=new AbortController(),tm=setTimeout(()=>ac.abort(),9000);
    try{
      const r=await fetch('/api/ai-speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:String(text).slice(0,650),locale:locale||'en-IN'}),signal:ac.signal});
      if(!r.ok)return false;
      const buf=await r.arrayBuffer();
      if(ctx){
        try{
          if(ctx.state==='suspended')await ctx.resume();
          const decoded=await ctx.decodeAudioData(buf.slice(0));
          await new Promise(resolve=>{const src=ctx.createBufferSource();src.buffer=decoded;src.connect(ctx.destination);src.onended=resolve;src.start(0)});
          return true;
        }catch{}
      }
      const blob=new Blob([buf],{type:r.headers.get('content-type')||'audio/wav'}),u=URL.createObjectURL(blob),a=new Audio(u);
      return await new Promise(resolve=>{a.onended=()=>{URL.revokeObjectURL(u);resolve(true)};a.onerror=()=>{URL.revokeObjectURL(u);resolve(false)};const p=a.play();if(p?.catch)p.catch(()=>{URL.revokeObjectURL(u);resolve(false)})});
    }catch{return false}finally{clearTimeout(tm)}
  }
  function queueCloudVoice(text,locale){
    voiceChain=voiceChain.then(async()=>{const ok=await cloudVoiceNow(text,locale);if(!ok)browserSpeak(text,locale)}).catch(()=>{});
    return voiceChain;
  }

  const host=document.createElement('div');host.id='dbest-ai-safe-host';host.style.cssText='position:fixed;right:14px;bottom:14px;z-index:2147483000;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;pointer-events:none';document.body.appendChild(host);
  host.innerHTML=`<style>#dbest-ai-safe-host *{box-sizing:border-box}.dbsa-fab,.dbsa-panel{pointer-events:auto}.dbsa-fab{width:58px;height:58px;border:0;border-radius:50%;background:linear-gradient(145deg,#0a64ff,#6f3cff);color:#fff;font-size:25px;box-shadow:0 12px 34px #1b3da755;cursor:pointer}.dbsa-panel{display:none;width:min(370px,calc(100vw - 28px));max-height:min(470px,calc(100dvh - 110px));background:#fff;border:1px solid #e1e7f0;border-radius:20px;box-shadow:0 20px 55px #10204444;overflow:hidden;margin-bottom:10px}.dbsa-panel.open{display:flex;flex-direction:column}.dbsa-head{background:linear-gradient(135deg,#0a3d9f,#1768ff,#6a43ff);color:#fff;padding:13px;display:flex;align-items:center;gap:10px}.dbsa-title{font-weight:850}.dbsa-sub{font-size:10px;opacity:.9}.dbsa-close{margin-left:auto;width:34px;height:34px;border:0;border-radius:10px;background:#ffffff22;color:#fff;font-size:20px}.dbsa-msgs{padding:12px;background:#f6f8fc;overflow:auto;min-height:100px;max-height:290px;display:flex;flex-direction:column;gap:8px}.dbsa-msg{padding:9px 11px;border-radius:13px;font-size:12.5px;line-height:1.45;max-width:92%;white-space:pre-wrap}.dbsa-u{align-self:flex-end;background:#1268ff;color:#fff}.dbsa-a{align-self:flex-start;background:#fff;border:1px solid #e3e8f1;color:#18243c}.dbsa-compose{padding:10px;border-top:1px solid #e5e9f1;display:flex;gap:7px;background:#fff}.dbsa-input{flex:1;min-width:0;border:1px solid #cfd8e7;border-radius:12px;padding:10px 11px;font-size:16px}.dbsa-btn{width:40px;height:40px;border:0;border-radius:12px;cursor:pointer}.dbsa-mic{background:#eef4ff}.dbsa-send{background:#1268ff;color:#fff}.dbsa-status{padding:0 11px 9px;background:#fff;color:#6f7b8e;font-size:10px}.dbsa-toast{display:none;pointer-events:none;margin-bottom:9px;max-width:330px;background:#172033;color:#fff;padding:9px 11px;border-radius:12px;font-size:11px;box-shadow:0 10px 28px #0004}.dbsa-toast.show{display:block}@media(max-width:480px){#dbest-ai-safe-host{right:10px!important;bottom:10px!important}}</style><div class="dbsa-toast" id="dbsaToast"></div><div class="dbsa-panel" id="dbsaPanel"><div class="dbsa-head"><div><div class="dbsa-title">Ask DBest AI</div><div class="dbsa-sub">Member AI • persistent voice • partner prefill</div></div><button class="dbsa-close" id="dbsaClose">×</button></div><div class="dbsa-msgs" id="dbsaMsgs"><div class="dbsa-msg dbsa-a">Speak or type naturally. I’ll carry your details to the right DBest section and prefill partner links where supported.</div></div><div class="dbsa-compose"><input class="dbsa-input" id="dbsaInput" placeholder="Type or tap mic…"><button class="dbsa-btn dbsa-mic" id="dbsaMic">🎙️</button><button class="dbsa-btn dbsa-send" id="dbsaSend">➤</button></div><div class="dbsa-status" id="dbsaStatus">Ready</div></div><button class="dbsa-fab" id="dbsaFab">🎙️</button>`;
  const byId=id=>document.getElementById(id),panel=byId('dbsaPanel'),fab=byId('dbsaFab'),input=byId('dbsaInput'),msgs=byId('dbsaMsgs'),status=byId('dbsaStatus'),toast=byId('dbsaToast'),mic=byId('dbsaMic');
  function sync(){const on=isMember();host.style.display=on?'block':'none';if(!on){panel.classList.remove('open');busy=false}}
  function add(text,who){const d=document.createElement('div');d.className='dbsa-msg '+(who==='u'?'dbsa-u':'dbsa-a');d.textContent=text;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight}
  function notice(text,ms=5000){toast.textContent=text;toast.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>toast.classList.remove('show'),ms)}
  function collapse(){panel.classList.remove('open');fab.style.display='block'}
  fab.onclick=()=>{unlockAudio();if(!isMember())return;panel.classList.add('open');fab.style.display='none';setTimeout(()=>input.focus(),60)};
  byId('dbsaClose').onclick=collapse;
  byId('dbsaSend').addEventListener('pointerdown',unlockAudio,{passive:true});
  mic.addEventListener('pointerdown',unlockAudio,{passive:true});
  input.addEventListener('keydown',e=>{if(e.key==='Enter')unlockAudio()});

  function mergeTask(a,b){if(!a)return b;if(!b)return a;return{route:b.route||a.route,subsection:b.subsection||a.subsection,taskData:{...(a.taskData||{}),...(b.taskData||{})}}}
  function serviceId(task){return task.route==='insurance'?'insurance':task.route==='mf'?'mf':'flights'}
  function targetWords(task){const s=String(task.subsection||'').toLowerCase();if(s.includes('life'))return['life'];if(s.includes('health'))return['health'];if(s.includes('motor'))return['motor'];if(s.includes('hotel'))return['hotel'];if(s.includes('package')||s.includes('itinerary'))return['package','tour'];if(s.includes('flight'))return['flight'];if(s.includes('portfolio'))return['portfolio'];if(task.route==='mf')return['mutual','sip'];return[]}
  function normalizedFields(task){
    const d=task?.taskData||{};
    return {
      FROM:d.from||d.origin||d.fromCity||d.pickup||'',ORIGIN:d.from||d.origin||d.fromCity||d.pickup||'',TO:d.to||d.destination||d.destinations||d.drop||'',DESTINATION:d.destination||d.destinations||d.to||d.drop||'',PICKUP:d.pickup||d.from||'',DROP:d.drop||d.to||'',DEPARTURE:d.departure||d.departureDate||d.date||d.startDate||'',RETURN:d.return||d.returnDate||'',CHECKIN:d.checkin||d.startDate||'',CHECKOUT:d.checkout||'',ADULTS:d.adults||'',CHILDREN:d.children||'',INFANTS:d.infants||'',ROOMS:d.rooms||'',BUDGET:d.budget||'',CATEGORY:d.category||d.hotel||'',SUM_INSURED:d.sumInsured||d.coverAmount||'',PINCODE:d.pincode||'',AMOUNT:d.amount||d.monthlyInvest||'',INVESTMENT_TYPE:d.investmentType||'',FREQUENCY:d.frequency||'',RISK:d.risk||'',GOAL:d.goal||'',SUBSECTION:task?.subsection||''
    };
  }
  function buildPartnerUrl(link,task){
    const fields=normalizedFields(task),used=[],mappingUsed=[];let out=String(link?.deeplinkTemplate||link?.url||'');
    for(const [k,v] of Object.entries(fields)){if(v===undefined||v===null||v==='')continue;const token=`{${k}}`;if(out.includes(token)){out=out.replaceAll(token,encodeURIComponent(String(v)));used.push(k)}}
    const map=(link&&typeof link.aiPrefillMap==='object'&&link.aiPrefillMap)||(link&&typeof link.prefillMap==='object'&&link.prefillMap)||(link&&typeof link.queryMap==='object'&&link.queryMap)||null;
    if(map&&out){try{const u=new URL(out,location.href);for(const [dbestKey,partnerParam] of Object.entries(map)){const key=String(dbestKey||'').toUpperCase(),param=String(partnerParam||'').trim(),value=fields[key];if(param&&value!==undefined&&value!==null&&value!==''){u.searchParams.set(param,String(value));mappingUsed.push(key)}}out=u.toString()}catch{}}
    return{url:out,prefillKeys:[...new Set([...used,...mappingUsed])],supported:used.length>0||mappingUsed.length>0};
  }

  async function openCab(task){
    const pickup=String(task.taskData?.pickup||''),drop=String(task.taskData?.drop||'');let ui=window.DBEST_CAB_SELECTED_UI;
    try{if((!ui||typeof ui.open!=='function')&&window.DBEST_CAB_ENTRY_CAPTURE?.ensure)ui=await window.DBEST_CAB_ENTRY_CAPTURE.ensure()}catch{}ui=window.DBEST_CAB_SELECTED_UI||ui;
    if(!ui?.open){if(typeof window.openRidePlatform==='function')window.openRidePlatform({pickup,drop});return false}
    const geo=navigator.geolocation,orig=geo&&geo.getCurrentPosition;let patched=false;if(pickup&&orig){try{geo.getCurrentPosition=function(ok,err){if(err)setTimeout(()=>err({code:1,message:'AI pickup supplied'}),0)};patched=true}catch{}}
    try{ui.open()}finally{if(patched)try{geo.getCurrentPosition=orig}catch{}}
    const apply=()=>{const p=byId('cab6P'),d=byId('cab6D');if(p&&pickup){p.value=pickup;p.setAttribute('value',pickup)}if(d&&drop){d.value=drop;d.setAttribute('value',drop)}};apply();[80,250,700,1400].forEach(ms=>setTimeout(apply,ms));return true;
  }

  function openPartner(task){
    if(!isMember())return false;const id=serviceId(task);let link=null;try{if(typeof links!=='undefined'&&links?.[id]?.url&&links[id].enabled!==false)link=links[id]}catch{}
    if(!link?.url||typeof window.externalGo!=='function'){notice('Partner link is not configured for this service.',4500);return false}
    const built=buildPartnerUrl(link,task),originalUrl=link.url,originalTemplate=link.deeplinkTemplate,originalOpen=window.open;let blockedUrl='';
    try{
      link.url=built.url||originalUrl;
      window.open=function(url,target,features){let w=null;try{w=originalOpen.call(window,url,target,features)}catch{}if(!w){blockedUrl=String(url||'');return null}return w};
      window.externalGo(id);if(blockedUrl)setTimeout(()=>{try{location.assign(blockedUrl)}catch{}},60);return true;
    }catch(e){notice('Unable to open partner site. Please try again.',4500);return false}
    finally{window.open=originalOpen;try{link.url=originalUrl;if(originalTemplate!==undefined)link.deeplinkTemplate=originalTemplate}catch{}}
  }

  function renderSectionBanner(task){
    const root=document.getElementById('sectionRoot');if(!root)return false;const existing=document.getElementById('dbestAiSectionContextV3');if(existing)existing.remove();
    let link=null;try{const id=serviceId(task);if(typeof links!=='undefined')link=links?.[id]}catch{}const built=link?.url?buildPartnerUrl(link,task):{supported:false,prefillKeys:[]};
    const box=document.createElement('div');box.id='dbestAiSectionContextV3';box.style.cssText='margin:12px 0 16px;padding:14px;border:1px solid #b9d3ff;border-radius:15px;background:linear-gradient(135deg,#f7faff,#edf4ff);box-shadow:0 8px 22px rgba(23,104,255,.10)';
    const title=document.createElement('div');title.style.cssText='font-weight:900;color:#123d8c;font-size:14px';title.textContent='✨ DBest AI • '+(task.subsection||'Request');box.appendChild(title);
    const d=task.taskData||{},pairs=Object.entries(d).filter(([,v])=>v!==undefined&&v!==null&&v!=='').slice(0,9);const p=document.createElement('div');p.style.cssText='font-size:11px;color:#52657f;margin-top:6px;line-height:1.55';p.textContent=pairs.length?'Captured: '+pairs.map(([k,v])=>k+': '+v).join(' • '):'Your request has been carried to this section.';box.appendChild(p);
    const pref=document.createElement('div');pref.style.cssText='font-size:11px;margin-top:7px;font-weight:750;color:'+(built.supported?'#0b7a4b':'#8a5a00');pref.textContent=built.supported?'Partner prefill ready for: '+built.prefillKeys.join(', '):'Partner prefill needs a supported deeplink/API mapping. DBest will not guess unknown partner field names.';box.appendChild(pref);
    const btn=document.createElement('button');btn.type='button';btn.textContent='Continue to Partner →';btn.style.cssText='margin-top:10px;border:0;border-radius:11px;padding:10px 14px;background:#1768ff;color:#fff;font-weight:850;font-size:12px;cursor:pointer';btn.onclick=()=>{unlockAudio();openPartner(task)};box.appendChild(btn);
    const content=root.querySelector('.sectionContent')||root.firstElementChild||root;content.prepend(box);
    const show=root.querySelector('[data-dbest-showcase]');if(show){const words=targetWords(task);let best=null,bestScore=0;for(const c of show.querySelectorAll('.dbestShowCard')){const s=String(c.innerText||'').toLowerCase();let sc=0;words.forEach((w,i)=>{if(s.includes(w))sc+=10-i});if(sc>bestScore){bestScore=sc;best=c}}if(best){show.querySelectorAll('.dbestShowCard').forEach(c=>{c.style.outline='';c.style.boxShadow=''});best.style.outline='3px solid #1768ff';best.style.outlineOffset='3px';best.style.boxShadow='0 14px 30px rgba(23,104,255,.20)';setTimeout(()=>best.scrollIntoView({behavior:'smooth',block:'center'}),120)}}
    return true;
  }
  function openExternalSection(task){const id=serviceId(task);try{sessionStorage.setItem('dbest_ai_last_member_task_v1',JSON.stringify({...task,at:Date.now()}))}catch{}if(typeof window.openService!=='function')return false;window.openService(id);[80,180,350,700,1200].forEach(ms=>setTimeout(()=>renderSectionBanner(task),ms));return true}
  async function route(task){if(!task)return false;collapse();notice(`Opening ${task.subsection||'DBest service'}…`,2200);if(task.route==='car')return openCab(task);if(['insurance','travel','flights','mf'].includes(task.route))return openExternalSection(task);return false}

  async function askAI(text){const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),10000);try{const r=await fetch('/api/ai-assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,locale:'auto',history:[]}),signal:ac.signal});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'AI unavailable');return d}finally{clearTimeout(timer)}}

  async function submit(raw){
    const text=String(raw||input.value||'').trim();if(!text||busy||!isMember())return;busy=true;input.value='';add(text,'u');status.textContent='Working…';unlockAudio();
    const local=parse(text);lastTask=local;if(local){const ack=ackFor(local,text),locale=detectLocale(text);browserSpeak(ack,locale);route(local).catch(()=>{})}
    try{
      const d=await askAI(text),server=d.route?{route:d.route,subsection:d.subsection||'',taskData:d.taskData||{}}:null;lastTask=mergeTask(local,server);const reply=String(d.reply||'').trim(),locale=d.languageCode||detectLocale(text);
      if(reply){notice(reply,8000);queueCloudVoice(reply,locale)}
      if(!local&&lastTask)route(lastTask).catch(()=>{});else if(local&&lastTask&&['insurance','travel','flights','mf'].includes(lastTask.route)){[250,700].forEach(ms=>setTimeout(()=>renderSectionBanner(lastTask),ms))}
      status.textContent='Ready';
    }catch(e){status.textContent='AI temporarily unavailable';notice('DBest AI response is temporarily unavailable. Your selected DBest section remains usable.',4500);if(local)queueCloudVoice(ackFor(local,text),detectLocale(text))}
    finally{busy=false}
  }
  byId('dbsaSend').onclick=()=>submit();input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit()}});

  async function stopRecord(){if(recorder&&recorder.state!=='inactive')recorder.stop()}
  mic.onclick=async()=>{
    unlockAudio();if(!isMember()||busy)return;if(recorder&&recorder.state==='recording'){stopRecord();return}
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
      recorder.onstop=async()=>{
        clearTimeout(recordTimer);mic.textContent='🎙️';try{stream?.getTracks().forEach(t=>t.stop())}catch{}const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'}),buf=await blob.arrayBuffer();let bin='';const bytes=new Uint8Array(buf);for(let i=0;i<bytes.length;i+=8192)bin+=String.fromCharCode(...bytes.subarray(i,i+8192));status.textContent='Understanding voice…';const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),12000);
        try{const r=await fetch('/api/ai-transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audioBase64:btoa(bin),mimeType:blob.type,locale:'auto'}),signal:ac.signal});const d=await r.json().catch(()=>({}));if(r.ok&&d.text){input.value=d.text;submit(d.text)}else status.textContent='Voice unavailable — type instead'}catch{status.textContent='Voice unavailable — type instead'}finally{clearTimeout(tm)}
      };
      recorder.start();mic.textContent='■';status.textContent='Listening… tap again to stop';recordTimer=setTimeout(()=>stopRecord(),8000);
    }catch{status.textContent='Microphone permission unavailable'}
  };

  document.addEventListener('visibilitychange',()=>{if(!document.hidden){try{if(audioCtx?.state==='suspended')audioCtx.resume()}catch{}}});setInterval(sync,350);sync();window.__DBEST_AI_SAFE_V3__={version:VERSION,parse,route,buildPartnerUrl,queueCloudVoice,unlockAudio};
})();