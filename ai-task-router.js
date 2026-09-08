(() => {
  'use strict';

  const ROUTE_LABELS={join:'Join N Earn',car:'Cab Booking',insurance:'Insurance',travel:'Hotels & Packages',flights:'Flights / Visa',store:'Marketplace',govt:'PAN / DL / ITR',loans:'Banking & Loans',rail:'Rail',repair:'Repair Services',friends:'Friendz Network',jobs:'Home Jobs',vahan:'VAHAN Services',wallet:'My Wallet',mf:'Mutual Funds',other:'Other Services'};
  const SUB_INDEX={
    govt:{'PAN Application':0,'Driving Licence':1,'ITR Filing':2,'Certificates':3},
    loans:{'Personal Loan':0,'Business Loan':1,'Home Loan':2},
    rail:{'Rail Booking':0,'PNR Assistance':1},
    repair:{'Mobile Repair':0,'AC Service':1,'Appliance Repair':2},
    friends:{'Join Community':0,'Local Partner':1},
    jobs:{'Job Search':0,'Job Application':1},
    vahan:{'RC Service':0,'Vehicle Documentation':1},
    wallet:{'Wallet History':0,'Wallet History Request':0,'Rewards':1},
    other:{'Add Your Business':0,'Real Estate':1,'Other Request':2}
  };
  const EXTERNAL_GUIDED=new Set(['insurance','travel','flights','mf']);
  const SAFE_DIRECT_FORMS=new Set(['govt','loans','rail','repair','friends','jobs','vahan','wallet','other']);
  const SAFE_CONTEXT_KEYS=new Set(['pickup','drop','origin','from','fromCity','destination','destinations','to','budget','date','departure','departureDate','return','returnDate','startDate','checkin','checkout','dates','travellers','passengers','adults','children','infants','rooms','duration','hotel','category','meal','transport','cabin','airline','sumInsured','coverAmount','insuranceType','members','familyMembers','investmentType','amount','frequency','risk','goal','monthlyInvest','pincode']);
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
    const url=typeof input==='string'?input:String(input?.url||'');let reqMessage='';
    if(url.includes('/api/ai-assistant')&&init?.body){try{reqMessage=String(JSON.parse(String(init.body)).message||'');latestUserText=reqMessage;}catch{}}
    if(url.includes('/api/ai-speech'))lastSpeechRequestAt=Date.now();
    const response=await previousFetch(input,init);
    if(url.includes('/api/ai-assistant')&&response.ok){response.clone().json().then(d=>{latestAI={...d,_userText:reqMessage||latestUserText,_at:Date.now()};window.__DBEST_LAST_AI_DATA__=latestAI;window.dispatchEvent(new CustomEvent('dbest-ai-routing-data',{detail:latestAI}));}).catch(()=>{});}
    if(url.includes('/api/ai-speech')&&response.ok){
      const started=lastSpeechRequestAt;
      response.clone().blob().then(blob=>{setTimeout(()=>{if(Date.now()-lastMediaPlayAt<3500||lastMediaPlayAt>=started)return;try{unlockAudio();const u=URL.createObjectURL(blob),a=new Audio(u);a.onended=()=>URL.revokeObjectURL(u);a.play().catch(()=>URL.revokeObjectURL(u));}catch{}},2200);}).catch(()=>{});
    }
    return response;
  };

  function inferRoute(text){
    const t=String(text||'').toLowerCase();
    if(/cab|taxi|ride|pickup|drop|airport transfer/.test(t))return'car';
    if(/life insurance|term insurance|health insurance|health cover|motor insurance|travel insurance|\binsurance\b|\bpolicy\b/.test(t))return'insurance';
    if(/flight|air ticket|airfare|visa/.test(t))return'flights';
    if(/hotel|package|holiday|tour|itinerary|goa|travel/.test(t))return'travel';
    if(/grocery|food|restaurant|medicine|pharmacy|marketplace|shop|order/.test(t))return'store';
    if(/pan |itr|income tax|driving licence|certificate/.test(t))return'govt';
    if(/loan|banking|home loan|personal loan|business loan/.test(t))return'loans';
    if(/train|rail|pnr/.test(t))return'rail';
    if(/repair|ac service|mobile repair|appliance/.test(t))return'repair';
    if(/job|hiring|vacancy|employment/.test(t))return'jobs';
    if(/rc |vehicle document|vahan/.test(t))return'vahan';
    if(/mutual fund|\bsip\b|lumpsum|portfolio|investment/.test(t))return'mf';
    if(/wallet|cashback|reward/.test(t))return'wallet';
    if(/membership|promoter|join|team|referral|earn/.test(t))return'join';
    return'none';
  }

  function inferSubsection(route,text,current=''){
    if(current)return current;
    const t=String(text||'').toLowerCase();
    if(route==='insurance'){
      if(/life insurance|term insurance|term plan|life cover/.test(t))return'Life Insurance';
      if(/motor insurance|vehicle insurance|car insurance|bike insurance/.test(t))return'Motor Insurance';
      if(/travel insurance/.test(t))return'Travel Insurance';
      if(/health insurance|mediclaim|health cover|family floater/.test(t))return'Health Insurance';
      return'Insurance';
    }
    if(route==='flights'){
      if(/visa/.test(t))return'Visa Assistance';
      if(/flight\s*\+\s*hotel|flight.*hotel|hotel.*flight/.test(t))return'Flight + Hotel';
      return'Flight Booking';
    }
    if(route==='travel'){
      if(/hotel|stay|room/.test(t))return'Hotel Booking';
      if(/itinerary/.test(t))return'Custom Itinerary';
      return'Tour Package';
    }
    if(route==='mf'){
      if(/portfolio|existing fund|existing investment|folio/.test(t))return'Portfolio Assistance';
      return'Mutual Fund Investment';
    }
    return current;
  }

  function inferCabPair(text,data){
    const out={...(data||{})};if(out.pickup&&out.drop)return out;
    const raw=String(text||'').replace(/\s+/g,' ').trim();
    let m=raw.match(/\bfrom\s+(.+?)\s+to\s+(.+?)(?=\s+(?:today|tomorrow|tonight|on|at|now|please|for|with)\b|[,.!?]|$)/i);
    if(m){if(!out.pickup)out.pickup=m[1].trim();if(!out.drop)out.drop=m[2].trim();return out;}
    m=raw.match(/\bfrom\s+([^,.!?]+?)(?=\s+(?:today|tomorrow|tonight|on|at|now|please|for|with)\b|[,.!?]|$)/i);
    if(m){const p=m[1].trim().split(/\s+/).filter(Boolean);if(p.length===2){if(!out.pickup)out.pickup=p[0];if(!out.drop)out.drop=p[1];}}
    return out;
  }

  function normalizeTaskData(route,text,taskData){
    const d={...(taskData||{})};
    if(route==='car')return inferCabPair(text,d);
    if(route==='insurance'){
      if(d.coverAmount&&!d.sumInsured)d.sumInsured=d.coverAmount;
      if(d.familyMembers&&!d.members)d.members=d.familyMembers;
      const t=String(text||'').toLowerCase();
      if(!d.insuranceType){if(/life|term/.test(t))d.insuranceType='Life Insurance';else if(/motor|vehicle|car insurance|bike insurance/.test(t))d.insuranceType='Motor Insurance';else if(/travel insurance/.test(t))d.insuranceType='Travel Insurance';else if(/health|mediclaim|family floater/.test(t))d.insuranceType='Health Insurance';}
    }
    if(route==='flights'){
      if(d.origin&&!d.from)d.from=d.origin;
      if(d.destination&&!d.to)d.to=d.destination;
      if(d.date&&!d.departure)d.departure=d.date;
      if(d.departureDate&&!d.departure)d.departure=d.departureDate;
      if(d.returnDate&&!d.return)d.return=d.returnDate;
    }
    if(route==='travel'){
      if(d.destination&&!d.destinations)d.destinations=d.destination;
      if(d.date&&!d.startDate)d.startDate=d.date;
      if(d.departureDate&&!d.startDate)d.startDate=d.departureDate;
    }
    if(route==='mf'){
      const t=String(text||'').toLowerCase();
      if(!d.investmentType){if(/\bsip\b/.test(t))d.investmentType='SIP';else if(/lump\s*sum|lumpsum/.test(t))d.investmentType='Lumpsum';else if(/bond|fixed income/.test(t))d.investmentType='Bonds / Fixed Income';}
    }
    return d;
  }

  function prepareData(data,text){
    const route=data?.route&&data.route!=='none'?data.route:inferRoute(text);
    const subsection=inferSubsection(route,text,String(data?.subsection||''));
    return {...(data||{}),route,subsection,taskData:normalizeTaskData(route,text,data?.taskData||{})};
  }

  function marketType(data,text){const v=String(data?.taskData?.marketType||data?.subsection||text||'').toLowerCase();if(/medicine|pharmacy/.test(v))return'medicine';if(/restaurant|food/.test(v))return'restaurant';if(/digital/.test(v))return'digital';return'grocery';}

  function safeCssEscape(v){try{return CSS.escape(v)}catch{return String(v).replace(/[^a-zA-Z0-9_-]/g,'\\$&')}}
  function setField(name,value){
    if(value===undefined||value===null||value==='')return false;
    const el=document.querySelector(`[name="${safeCssEscape(name)}"]`)||(name==='pickup'?document.querySelector('#ridePickup'):null);if(!el)return false;
    let v=String(value);
    if(el.type==='number'){const m=v.replace(/,/g,'').match(/\d+(?:\.\d+)?/);if(m)v=m[0];}
    if(el.type==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
    if(el.tagName==='SELECT'){const low=v.toLowerCase();const opt=[...el.options].find(o=>String(o.value).toLowerCase()===low||String(o.text).toLowerCase()===low||String(o.text).toLowerCase().includes(low));if(!opt)return false;v=opt.value;}
    el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true;
  }

  function prefill(data){
    const d=data?.taskData||{};let count=0,done=new Set();
    for(const [k,v] of Object.entries(d)){if(setField(k,v)){count++;done.add(k);}}
    const aliases={
      origin:['from','fromCity','pickup'],fromCity:['from','fromCity','pickup'],from:['from','fromCity','pickup'],
      destination:['destination','destinations','to','drop'],destinations:['destinations','destination','to'],to:['to','destination','destinations','drop'],drop:['drop','destination','to'],pickup:['pickup','fromCity','from'],
      budget:['budget'],travellers:['travellers','pax','adults','passengers'],passengers:['passengers','adults'],date:['departure','startDate','travelDate','departDate','date'],departureDate:['departure','departDate','startDate'],returnDate:['return','returnDate'],
      checkin:['checkin'],checkout:['checkout'],rooms:['rooms'],adults:['adults'],children:['children'],infants:['infants'],duration:['duration'],startDate:['startDate'],
      pincode:['pincode','pin'],sumInsured:['sumInsured'],coverAmount:['sumInsured'],members:['members'],familyMembers:['members'],
      amount:['amount','loanAmount'],loanAmount:['loanAmount'],investmentType:['investmentType'],frequency:['frequency'],risk:['risk'],goal:['goal'],monthlyInvest:['monthlyInvest'],
      cabin:['cabin'],airline:['airline'],hotel:['hotel','category'],category:['category','hotel'],meal:['meal'],transport:['transport'],marketType:['marketType']
    };
    for(const [k,names] of Object.entries(aliases)){if(d[k]===undefined||done.has(k))continue;for(const n of names){if(setField(n,d[k])){count++;break;}}}
    return count;
  }

  function stabilizeCabPrefill(data){
    const d=data?.taskData||{};if(!d.pickup&&!d.drop)return;
    const touched={pickup:false,drop:false};
    const bind=()=>{
      const p=document.querySelector('#ridePickup')||document.querySelector('[name="pickup"]'),q=document.querySelector('[name="drop"]');
      if(p&&!p.dataset.dbestAiTouch){p.dataset.dbestAiTouch='1';p.addEventListener('input',e=>{if(e.isTrusted)touched.pickup=true;});}
      if(q&&!q.dataset.dbestAiTouch){q.dataset.dbestAiTouch='1';q.addEventListener('input',e=>{if(e.isTrusted)touched.drop=true;});}
    };
    [100,400,900,1800,3500,6500,10000,14500].forEach(ms=>setTimeout(()=>{bind();if(d.pickup&&!touched.pickup)setField('pickup',d.pickup);if(d.drop&&!touched.drop)setField('drop',d.drop);},ms));
  }

  function showGuide(data,text,prefilled){
    document.getElementById('dbest-ai-guide-card')?.remove();
    const route=data.route||inferRoute(text),label=data.subsection||ROUTE_LABELS[route]||'DBest Service',card=document.createElement('div');card.id='dbest-ai-guide-card';
    card.style.cssText='position:fixed;left:12px;right:12px;bottom:14px;z-index:2147481500;max-width:760px;margin:auto;background:#fff;border:1px solid #dce5f3;border-radius:18px;box-shadow:0 16px 45px rgba(13,34,74,.24);padding:12px 14px;font-family:Inter,system-ui,Arial;color:#16335f';
    const request=String(text||'').slice(0,180),known=Object.entries(data?.taskData||{}).filter(([k,v])=>SAFE_CONTEXT_KEYS.has(k)&&v!==''&&v!=null).slice(0,6).map(([k,v])=>`${k}: ${v}`).join(' • ');
    card.innerHTML=`<div style="display:flex;gap:10px;align-items:flex-start"><div style="font-size:22px">✨</div><div style="flex:1"><b>DBest AI Guided Mode • ${label}</b><div style="font-size:12px;margin-top:4px;color:#5e6e84">${prefilled?`${prefilled} detail${prefilled===1?'':'s'} auto-filled from your request. `:''}Review the destination section and continue there.</div>${known?`<div style="font-size:11px;margin-top:6px;padding:7px 9px;background:#eef8f3;border-radius:10px">Captured: ${known.replace(/[<>]/g,'')}</div>`:''}<div style="font-size:11px;margin-top:6px;padding:7px 9px;background:#f3f7ff;border-radius:10px">Your request: ${request.replace(/[<>]/g,'')}</div></div><button id="dbestGuideClose" style="border:0;background:#eef3ff;border-radius:10px;width:34px;height:34px">×</button></div>`;
    document.body.appendChild(card);card.querySelector('#dbestGuideClose').onclick=()=>card.remove();setTimeout(()=>{if(card.isConnected)card.remove();},18000);
  }

  function externalServiceId(route){if(route==='insurance')return'insurance';if(route==='mf')return'mf';if(route==='travel'||route==='flights')return'flights';return route;}

  function targetKeywords(data,text){
    const sub=String(data?.subsection||'').toLowerCase(),t=String(text||'').toLowerCase();
    if(data.route==='insurance'){
      if(/life|term/.test(sub+' '+t))return['life insurance','term plan','life'];
      if(/motor|vehicle|car insurance|bike insurance/.test(sub+' '+t))return['motor insurance','motor','general insurance'];
      if(/travel insurance/.test(sub+' '+t))return['travel insurance'];
      return['health insurance','health'];
    }
    if(data.route==='flights'){
      if(/visa/.test(sub+' '+t))return['visa'];
      if(/hotel/.test(sub+' '+t))return['flight','hotel'];
      return['flights','flight','air travel'];
    }
    if(data.route==='travel'){
      if(/hotel/.test(sub+' '+t))return['hotels','hotel','hotel stays'];
      return['holiday packages','packages','domestic holidays','international holidays'];
    }
    if(data.route==='mf'){
      if(/portfolio/.test(sub+' '+t))return['mutual fund','portfolio'];
      if(/\bsip\b/.test(sub+' '+t)||String(data?.taskData?.investmentType||'').toLowerCase()==='sip')return['mutual fund','sip'];
      return['mutual fund'];
    }
    return[];
  }

  function storeExternalContext(data,text){
    const safe={route:data.route,subsection:data.subsection,taskData:{},request:String(text||'').slice(0,500),at:Date.now()};
    for(const [k,v] of Object.entries(data.taskData||{}))if(SAFE_CONTEXT_KEYS.has(k)&&v!==''&&v!=null)safe.taskData[k]=v;
    try{sessionStorage.setItem('dbest_ai_external_context',JSON.stringify(safe))}catch{}
    window.__DBEST_AI_EXTERNAL_CONTEXT__=safe;
  }

  function cardScore(card,words){
    const s=String(card?.innerText||'').toLowerCase();let score=0;
    for(let i=0;i<words.length;i++){const w=String(words[i]||'').toLowerCase();if(!w)continue;if(s.includes(w))score+=10-i;}
    return score;
  }

  function renderExternalContext(data,text){
    const root=[...document.querySelectorAll('.sectionContent')].filter(el=>{try{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'}catch{return false}}).pop();
    if(!root)return false;
    const show=root.querySelector('[data-dbest-showcase]');if(!show)return false;
    let banner=root.querySelector('#dbestAiSectionContext');
    const safePairs=Object.entries(data.taskData||{}).filter(([k,v])=>SAFE_CONTEXT_KEYS.has(k)&&v!==''&&v!=null).slice(0,7);
    if(!banner){banner=document.createElement('div');banner.id='dbestAiSectionContext';banner.style.cssText='margin:0 0 12px;padding:13px 14px;border-radius:16px;background:linear-gradient(135deg,#eef5ff,#f3efff);border:1px solid #d9e4ff;color:#173b72;box-shadow:0 8px 20px rgba(27,65,145,.08)';root.insertBefore(banner,show);}
    banner.innerHTML=`<div style="font-weight:900;font-size:14px">✨ DBest AI selected: ${String(data.subsection||ROUTE_LABELS[data.route]||'Service').replace(/[<>]/g,'')}</div><div style="font-size:11px;color:#5d6b82;margin-top:4px">We have taken you to the relevant DBest section instead of opening a generic lead form.</div>${safePairs.length?`<div style="font-size:11px;margin-top:8px"><b>Captured:</b> ${safePairs.map(([k,v])=>`${k}: ${String(v).replace(/[<>]/g,'')}`).join(' • ')}</div>`:''}`;

    root.querySelectorAll('.dbestShowCard[data-dbest-ai-target="1"]').forEach(c=>{c.removeAttribute('data-dbest-ai-target');c.style.outline='';c.style.boxShadow='';});
    const cards=[...show.querySelectorAll('.dbestShowCard')],words=targetKeywords(data,text);
    let best=null,bestScore=0;for(const c of cards){const sc=cardScore(c,words);if(sc>bestScore){bestScore=sc;best=c;}}
    if(!best&&cards.length===1)best=cards[0];
    if(best){best.dataset.dbestAiTarget='1';best.style.outline='3px solid #2f67f6';best.style.outlineOffset='3px';best.style.boxShadow='0 16px 34px rgba(47,103,246,.24)';setTimeout(()=>{try{best.scrollIntoView({behavior:'smooth',block:'center'})}catch{}},60);}
    const n=prefill(data);showGuide(data,text,n);
    return true;
  }

  function openExternalGuided(data,text){
    storeExternalContext(data,text);
    const serviceId=externalServiceId(data.route);
    if(typeof window.openService!=='function')return false;
    window.openService(serviceId);
    [80,180,350,650,1000,1600,2600,4200].forEach(ms=>setTimeout(()=>renderExternalContext(data,text),ms));
    return true;
  }

  function goToTask(rawData,text){
    const data=prepareData(rawData,text),route=data.route;if(!route||route==='none')return;
    unlockAudio();try{document.querySelector('#dbest-ai-test-host')?.shadowRoot?.querySelector('#close')?.click();}catch{}
    let opened=false;
    try{
      if(route==='car'&&typeof window.openRidePlatform==='function'){window.openRidePlatform();opened=true;}
      else if(route==='store'){const type=marketType(data,text);if(typeof window.openMarketplace==='function'){window.openMarketplace(type);opened=true;}else if(typeof window.openCommerceHub==='function'){window.openCommerceHub();opened=true;}}
      else if(EXTERNAL_GUIDED.has(route)){opened=openExternalGuided(data,text);}
      else{const idx=SUB_INDEX[route]?.[String(data?.subsection||'')];if(SAFE_DIRECT_FORMS.has(route)&&Number.isInteger(idx)&&typeof window.openContentForm==='function'){window.openContentForm(route,idx);opened=true;}else if(typeof window.openService==='function'){window.openService(route);opened=true;}}
    }catch(e){console.warn('DBest AI navigation error',e);}
    if(opened&&!EXTERNAL_GUIDED.has(route)){
      setTimeout(()=>{const n=prefill(data);showGuide(data,text,n);if(route==='car')stabilizeCabPrefill(data);},260);
      if(route!=='car')setTimeout(()=>prefill(data),900);
    }
  }

  function attachAction(msg){
    if(!msg||msg.dataset.dbestTaskAction==='1'||msg.classList.contains('thinking'))return;
    const root=document.querySelector('#dbest-ai-test-host')?.shadowRoot;if(!root)return;
    const users=[...root.querySelectorAll('.msg.user')],text=latestAI?._userText||users.at(-1)?.textContent||latestUserText;
    setTimeout(()=>{const data=prepareData(latestAI||{route:inferRoute(text),subsection:'',taskData:{}},text),route=data.route;if(!route||route==='none')return;msg.dataset.dbestTaskAction='1';const wrap=document.createElement('div');wrap.style.cssText='margin-top:9px;padding-top:9px;border-top:1px solid #e5ebf5';const btn=document.createElement('button');btn.type='button';btn.textContent=`→ Continue in DBest • ${data.subsection||ROUTE_LABELS[route]||'Open Section'}`;btn.style.cssText='width:100%;border:0;border-radius:11px;padding:9px 10px;background:#0a64ff;color:#fff;font-weight:800;font-size:11px;cursor:pointer';btn.onclick=()=>goToTask(data,text);wrap.appendChild(btn);msg.appendChild(wrap);},180);
  }

  function setup(){const root=document.querySelector('#dbest-ai-test-host')?.shadowRoot;if(!root){setTimeout(setup,150);return;}const msgs=root.querySelector('#msgs');if(!msgs){setTimeout(setup,150);return;}root.addEventListener('pointerdown',unlockAudio,{capture:true,passive:true});new MutationObserver(muts=>{for(const m of muts)for(const n of m.addedNodes){if(n.nodeType===1&&n.matches?.('.msg.ai:not(.thinking)'))attachAction(n);}}).observe(msgs,{childList:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
  window.__DBEST_AI_TASK_ROUTER__={goToTask,prepareData,renderExternalContext,version:'0.3-external-guided-routing'};
})();
