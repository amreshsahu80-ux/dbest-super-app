(() => {
  'use strict';

  const ROUTE_LABELS={join:'Join N Earn',car:'Cab Booking',insurance:'Insurance',travel:'Hotels & Packages',flights:'Flights / Visa',store:'Marketplace',govt:'PAN / DL / ITR',loans:'Banking & Loans',rail:'Rail',repair:'Repair Services',friends:'Friendz Network',jobs:'Home Jobs',vahan:'VAHAN Services',wallet:'My Wallet',mf:'Mutual Funds',other:'Other Services'};
  const SUB_INDEX={
    travel:{'Hotel Booking':0,'Tour Package':1,'Custom Itinerary':2},
    govt:{'PAN Application':0,'Driving Licence':1,'ITR Filing':2,'Certificates':3},
    rail:{'Rail Booking':0,'PNR Assistance':1},
    repair:{'Mobile Repair':0,'AC Service':1,'Appliance Repair':2},
    jobs:{'Job Search':0,'Job Application':1},
    vahan:{'RC Service':0,'Vehicle Documentation':1},
    friends:{'Join Community':0,'Local Partner':1},
    other:{'Add Your Business':0,'Real Estate':1,'Other Request':2}
  };
  const SAFE_DIRECT_FORMS=new Set(['travel','govt','rail','repair','jobs','vahan','friends','other']);
  let latestAI=null,latestUserText='',ctx=null,lastMediaPlayAt=0,lastSpeechRequestAt=0;

  const nativePlay=window.HTMLMediaElement&&HTMLMediaElement.prototype.play;
  if(nativePlay&&!HTMLMediaElement.prototype.__dbestTracked){
    HTMLMediaElement.prototype.__dbestTracked=true;
    HTMLMediaElement.prototype.play=function(...args){lastMediaPlayAt=Date.now();return nativePlay.apply(this,args);};
  }

  function unlockAudio(){
    try{
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      if(!ctx)ctx=new AC();if(ctx.state==='suspended')ctx.resume().catch(()=>{});
      const src=ctx.createBufferSource(),gain=ctx.createGain();gain.gain.value=0;src.buffer=ctx.createBuffer(1,1,22050);src.connect(gain);gain.connect(ctx.destination);src.start(0);
    }catch{}
  }

  document.addEventListener('pointerdown',unlockAudio,{capture:true,passive:true});

  const previousFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:String(input?.url||'');
    let reqMessage='';
    if(url.includes('/api/ai-assistant')&&init?.body){try{reqMessage=String(JSON.parse(String(init.body)).message||'');latestUserText=reqMessage;}catch{}}
    if(url.includes('/api/ai-speech'))lastSpeechRequestAt=Date.now();
    const response=await previousFetch(input,init);
    if(url.includes('/api/ai-assistant')&&response.ok){
      response.clone().json().then(d=>{latestAI={...d,_userText:reqMessage||latestUserText,_at:Date.now()};window.__DBEST_LAST_AI_DATA__=latestAI;window.dispatchEvent(new CustomEvent('dbest-ai-routing-data',{detail:latestAI}));}).catch(()=>{});
    }
    if(url.includes('/api/ai-speech')&&response.ok){
      const started=lastSpeechRequestAt;
      response.clone().blob().then(blob=>{
        setTimeout(()=>{
          if(Date.now()-lastMediaPlayAt<3500||lastMediaPlayAt>=started)return;
          try{unlockAudio();const u=URL.createObjectURL(blob),a=new Audio(u);a.onended=()=>URL.revokeObjectURL(u);a.play().catch(()=>URL.revokeObjectURL(u));}catch{}
        },2200);
      }).catch(()=>{});
    }
    return response;
  };

  function inferRoute(text){
    const t=String(text||'').toLowerCase();
    if(/cab|taxi|ride|pickup|drop|airport transfer/.test(t))return'car';
    if(/insurance|policy|health cover|motor insurance|term insurance/.test(t))return'insurance';
    if(/flight|air ticket|visa/.test(t))return'flights';
    if(/hotel|package|holiday|tour|itinerary|goa|travel/.test(t))return'travel';
    if(/grocery|food|restaurant|medicine|pharmacy|marketplace|shop|order/.test(t))return'store';
    if(/pan |itr|income tax|driving licence|certificate/.test(t))return'govt';
    if(/loan|banking|home loan|personal loan|business loan/.test(t))return'loans';
    if(/train|rail|pnr/.test(t))return'rail';
    if(/repair|ac service|mobile repair|appliance/.test(t))return'repair';
    if(/job|hiring|vacancy|employment/.test(t))return'jobs';
    if(/rc |vehicle document|vahan/.test(t))return'vahan';
    if(/mutual fund|\bsip\b|portfolio|investment/.test(t))return'mf';
    if(/wallet|cashback|reward/.test(t))return'wallet';
    if(/membership|promoter|join|team|referral|earn/.test(t))return'join';
    return'none';
  }

  function marketType(data,text){
    const v=String(data?.taskData?.marketType||data?.subsection||text||'').toLowerCase();
    if(/medicine|pharmacy/.test(v))return'medicine';if(/restaurant|food/.test(v))return'restaurant';if(/digital/.test(v))return'digital';return'grocery';
  }

  function setField(name,value){
    if(value===undefined||value===null||value==='')return false;
    const el=document.querySelector(`[name="${CSS.escape(name)}"]`)||(name==='pickup'?document.querySelector('#ridePickup'):null);if(!el)return false;
    let v=String(value);
    if(el.type==='number'){const m=v.replace(/,/g,'').match(/\d+(?:\.\d+)?/);if(m)v=m[0];}
    if(el.tagName==='SELECT'){const opt=[...el.options].find(o=>o.value.toLowerCase()===v.toLowerCase()||o.text.toLowerCase()===v.toLowerCase());if(!opt)return false;v=opt.value;}
    el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true;
  }

  function prefill(data){
    const d=data?.taskData||{};let count=0;
    for(const [k,v] of Object.entries(d))if(setField(k,v))count++;
    const aliases={origin:['fromCity','from','pickup'],from:['fromCity','from','pickup'],destination:['destinations','destination','to','drop'],drop:['drop','destination','to'],pickup:['pickup','fromCity','from'],budget:['budget'],travellers:['pax','travellers','adults','passengers'],passengers:['passengers','adults'],date:['startDate','travelDate','departDate','date'],pincode:['pincode','pin'],sumInsured:['sumInsured']};
    for(const [k,names] of Object.entries(aliases)){if(d[k]===undefined)continue;for(const n of names){if(setField(n,d[k])){count++;break;}}}
    return count;
  }

  function showGuide(data,text,prefilled){
    document.getElementById('dbest-ai-guide-card')?.remove();
    const route=data.route||inferRoute(text),label=ROUTE_LABELS[route]||'DBest Service',card=document.createElement('div');card.id='dbest-ai-guide-card';
    card.style.cssText='position:fixed;left:12px;right:12px;bottom:14px;z-index:2147481500;max-width:760px;margin:auto;background:#fff;border:1px solid #dce5f3;border-radius:18px;box-shadow:0 16px 45px rgba(13,34,74,.24);padding:12px 14px;font-family:Inter,system-ui,Arial;color:#16335f';
    const request=String(text||'').slice(0,180);
    card.innerHTML=`<div style="display:flex;gap:10px;align-items:flex-start"><div style="font-size:22px">✨</div><div style="flex:1"><b>DBest AI Guided Mode • ${label}</b><div style="font-size:12px;margin-top:4px;color:#5e6e84">${prefilled?`${prefilled} detail${prefilled===1?'':'s'} from your request filled where possible. `:''}Please review the remaining fields before continuing.</div><div style="font-size:11px;margin-top:6px;padding:7px 9px;background:#f3f7ff;border-radius:10px">Your request: ${request.replace(/[<>]/g,'')}</div></div><button id="dbestGuideClose" style="border:0;background:#eef3ff;border-radius:10px;width:34px;height:34px">×</button></div>`;
    document.body.appendChild(card);card.querySelector('#dbestGuideClose').onclick=()=>card.remove();setTimeout(()=>{if(card.isConnected)card.remove();},16000);
  }

  function goToTask(data,text){
    const route=(data?.route&&data.route!=='none'?data.route:inferRoute(text));if(!route||route==='none')return;
    unlockAudio();
    try{document.querySelector('#dbest-ai-test-host')?.shadowRoot?.querySelector('#close')?.click();}catch{}
    let opened=false;
    try{
      if(route==='car'&&typeof window.openRidePlatform==='function'){window.openRidePlatform();opened=true;}
      else if(route==='store'){
        const type=marketType(data,text);if(typeof window.openMarketplace==='function'){window.openMarketplace(type);opened=true;}else if(typeof window.openCommerceHub==='function'){window.openCommerceHub();opened=true;}
      }else{
        const idx=SUB_INDEX[route]?.[String(data?.subsection||'')];
        if(SAFE_DIRECT_FORMS.has(route)&&Number.isInteger(idx)&&typeof window.openContentForm==='function'){window.openContentForm(route,idx);opened=true;}
        else if(typeof window.openService==='function'){window.openService(route);opened=true;}
      }
    }catch(e){console.warn('DBest AI navigation error',e);}
    if(opened)setTimeout(()=>showGuide({...data,route},text,prefill(data)),300);
  }

  function attachAction(msg){
    if(!msg||msg.dataset.dbestTaskAction==='1'||msg.classList.contains('thinking'))return;
    const root=document.querySelector('#dbest-ai-test-host')?.shadowRoot;if(!root)return;
    const users=[...root.querySelectorAll('.msg.user')],text=latestAI?._userText||users.at(-1)?.textContent||latestUserText;
    setTimeout(()=>{
      const data=latestAI||{route:inferRoute(text),subsection:'',taskData:{}};const route=data.route&&data.route!=='none'?data.route:inferRoute(text);if(!route||route==='none')return;
      msg.dataset.dbestTaskAction='1';
      const wrap=document.createElement('div');wrap.style.cssText='margin-top:9px;padding-top:9px;border-top:1px solid #e5ebf5';
      const btn=document.createElement('button');btn.type='button';btn.textContent=`→ Continue in DBest • ${data.subsection||ROUTE_LABELS[route]||'Open Section'}`;btn.style.cssText='width:100%;border:0;border-radius:11px;padding:9px 10px;background:#0a64ff;color:#fff;font-weight:800;font-size:11px;cursor:pointer';btn.onclick=()=>goToTask({...data,route},text);wrap.appendChild(btn);msg.appendChild(wrap);
    },180);
  }

  function setup(){
    const root=document.querySelector('#dbest-ai-test-host')?.shadowRoot;if(!root){setTimeout(setup,150);return;}const msgs=root.querySelector('#msgs');if(!msgs){setTimeout(setup,150);return;}
    root.addEventListener('pointerdown',unlockAudio,{capture:true,passive:true});
    new MutationObserver(muts=>{for(const m of muts)for(const n of m.addedNodes){if(n.nodeType===1&&n.matches?.('.msg.ai:not(.thinking)'))attachAction(n);}}).observe(msgs,{childList:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
  window.__DBEST_AI_TASK_ROUTER__={goToTask,version:'0.1-guided'};
})();
