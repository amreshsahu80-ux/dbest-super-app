(() => {
  'use strict';
  const VERSION='1.0.0-instant-route';
  let lastFast={text:'',route:'',at:0};
  const EXTERNAL=new Set(['insurance','travel','flights','mf']);
  const prevFetch=window.fetch.bind(window);

  const low=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
  const pickNumber=(text,re)=>{const m=String(text||'').match(re);return m?Number(String(m[1]).replace(/,/g,'')):undefined;};
  const cleanPlace=s=>String(s||'').trim().replace(/\s+(?:today|tomorrow|tonight|on|at|for|with|please).*$/i,'').replace(/[,.!?]+$/,'').trim();
  function pair(text){
    const raw=String(text||'').replace(/\s+/g,' ').trim();
    let m=raw.match(/\bfrom\s+(.+?)\s+to\s+(.+?)(?=\s+(?:today|tomorrow|tonight|on|at|for|with|please|by)\b|[,.!?]|$)/i);
    if(m)return{from:cleanPlace(m[1]),to:cleanPlace(m[2])};
    m=raw.match(/\bfrom\s+([^,.!?]+?)(?=\s+(?:today|tomorrow|tonight|on|at|for|with|please|by)\b|[,.!?]|$)/i);
    if(m){const p=m[1].trim().split(/\s+/).filter(Boolean);if(p.length===2)return{from:p[0],to:p[1]};}
    return{};
  }
  function moneyText(text){
    const s=String(text||'');
    let m=s.match(/(?:₹|rs\.?|inr\s*)?\s*([\d,.]+)\s*(crore|cr|lakh|lac|k|thousand)?/i);
    if(!m)return'';
    const n=String(m[1]||'').replace(/,/g,'');if(!/^\d+(?:\.\d+)?$/.test(n))return'';
    return `${n}${m[2]?' '+m[2]:''}`.trim();
  }
  function destinationFrom(text,kind){
    const raw=String(text||'').replace(/\s+/g,' ').trim();
    let m;
    if(kind==='hotel'){
      m=raw.match(/(?:hotel|stay|room)s?\s+(?:in|at|for)\s+([A-Za-z][A-Za-z .'-]{1,45}?)(?=\s+(?:for|with|from|on|under|within|budget|\d+\s*(?:adult|people|person|room|star))\b|[,.!?]|$)/i);
      if(!m)m=raw.match(/\b(?:in|at)\s+([A-Za-z][A-Za-z .'-]{1,35}?)(?=\s+(?:hotel|stay|for|with|\d+\s*(?:adult|people|person|room|star))\b|[,.!?]|$)/i);
    }else{
      m=raw.match(/\b([A-Za-z][A-Za-z .'-]{1,35})\s+(?:package|holiday|tour)\b/i);
      if(!m)m=raw.match(/(?:package|holiday|tour)\s+(?:for|to|in)\s+([A-Za-z][A-Za-z .'-]{1,35}?)(?=\s+(?:for|with|under|within|budget|\d+\s*(?:adult|people|person|day|night))\b|[,.!?]|$)/i);
    }
    return m?cleanPlace(m[1]):'';
  }
  function parse(text){
    const t=low(text), d={};let route='',subsection='';
    const cab=/\b(cab|taxi|ride|pickup|drop)\b|कैब|टैक्सी|ক্যাব|ট্যাক্সি|କ୍ୟାବ|ଟାକ୍ସି/.test(t);
    const life=/life insurance|term insurance|term plan|life cover|जीवन बीमा|टर्म इंश्योरेंस|জীবন বীমা|টার্ম ইন্স্যুরেন্স|ଜୀବନ ବୀମା/.test(t);
    const health=/health insurance|health cover|mediclaim|family floater|स्वास्थ्य बीमा|हेल्थ इंश्योरेंस|স্বাস্থ্য বীমা|হেলথ ইন্স্যুরেন্স|ସ୍ୱାସ୍ଥ୍ୟ ବୀମା/.test(t);
    const motor=/motor insurance|vehicle insurance|car insurance|bike insurance|मोटर बीमा|वाहन बीमा|মোটর বীমা|ଗାଡ଼ି ବୀମା/.test(t);
    const travelIns=/travel insurance|यात्रा बीमा|ট্রাভেল ইন্স্যুরেন্স|ଭ୍ରମଣ ବୀମା/.test(t);
    const flight=/\b(flight|air ticket|airfare)\b|फ्लाइट|हवाई टिकट|ফ্লাইট|বিমান টিকিট|ଫ୍ଲାଇଟ୍|ବିମାନ ଟିକେଟ/.test(t);
    const visa=/\bvisa\b|वीज़ा|ভিসা|ଭିସା/.test(t);
    const hotel=/\b(hotel|stay|room booking)\b|होटल|হোটেল|ହୋଟେଲ/.test(t);
    const packageQ=/\b(package|holiday|tour|itinerary)\b|पैकेज|टूर|প্যাকেজ|ট্যুর|ପ୍ୟାକେଜ|ଟୁର/.test(t);
    const mf=/mutual fund|\bsip\b|lumpsum|portfolio|म्यूचुअल फंड|एसआईपी|মিউচুয়াল ফান্ড|এসআইপি|ମ୍ୟୁଚୁଆଲ୍ ଫଣ୍ଡ/.test(t);

    if(cab){route='car';subsection='Outstation Cab';const p=pair(text);if(p.from)d.pickup=p.from;if(p.to)d.drop=p.to;}
    else if(life||health||motor||travelIns){route='insurance';subsection=life?'Life Insurance':health?'Health Insurance':motor?'Motor Insurance':'Travel Insurance';d.insuranceType=subsection;
      const cover=String(text||'').match(/(?:cover|coverage|sum insured|बीमा|कवर|কভার|ବୀମା)[^\d₹]{0,18}(?:₹|rs\.?|inr\s*)?\s*([\d,.]+\s*(?:crore|cr|lakh|lac)?)/i)||String(text||'').match(/(?:₹|rs\.?|inr\s*)\s*([\d,.]+\s*(?:crore|cr|lakh|lac))/i);if(cover)d.sumInsured=cover[1].trim();
      const pin=String(text||'').match(/\b(?:pin(?:code)?\s*)?(\d{6})\b/i);if(pin)d.pincode=pin[1];const age=String(text||'').match(/\bage\s*(?:is|of|:)?\s*(\d{1,2})\b/i);if(age)d.age=Number(age[1]);}
    else if(flight||visa){route='flights';subsection=visa&&!flight?'Visa Assistance':/hotel/.test(t)&&flight?'Flight + Hotel':'Flight Booking';const p=pair(text);if(p.from)d.from=p.from;if(p.to)d.to=p.to;
      const adults=pickNumber(text,/(\d+)\s*(?:adult|adults|people|persons|passengers|pax)\b/i);if(adults)d.adults=adults;const children=pickNumber(text,/(\d+)\s*(?:child|children|kids)\b/i);if(children!==undefined)d.children=children;const infants=pickNumber(text,/(\d+)\s*(?:infant|infants)\b/i);if(infants!==undefined)d.infants=infants;}
    else if(hotel||packageQ){route='travel';subsection=hotel&&!packageQ?'Hotel Booking':/itinerary/.test(t)?'Custom Itinerary':'Tour Package';const dest=destinationFrom(text,subsection==='Hotel Booking'?'hotel':'package');if(dest){d.destination=dest;d.destinations=dest;}
      const adults=pickNumber(text,/(\d+)\s*(?:adult|adults|people|persons|pax)\b/i);if(adults)d.adults=adults;const children=pickNumber(text,/(\d+)\s*(?:child|children|kids)\b/i);if(children!==undefined)d.children=children;const rooms=pickNumber(text,/(\d+)\s*(?:room|rooms)\b/i);if(rooms)d.rooms=rooms;const star=String(text||'').match(/\b([345])\s*[- ]?star\b/i);if(star){d.hotel=`${star[1]} Star`;d.category=d.hotel;}const budget=String(text||'').match(/(?:under|within|budget(?: of)?|per person)\s*(?:₹|rs\.?|inr\s*)?\s*([\d,]+)/i);if(budget)d.budget=Number(budget[1].replace(/,/g,''));}
    else if(mf){route='mf';subsection=/portfolio|existing fund|folio/.test(t)?'Portfolio Assistance':'Mutual Fund Investment';if(/\bsip\b|एसआईपी|এসআইপি/.test(t))d.investmentType='SIP';else if(/lump\s*sum|lumpsum/.test(t))d.investmentType='Lumpsum';const amt=String(text||'').match(/(?:sip|invest(?:ment)?|start|amount)[^\d₹]{0,18}(?:₹|rs\.?|inr\s*)?\s*([\d,]+)/i)||String(text||'').match(/(?:₹|rs\.?|inr\s*)\s*([\d,]+)/i);if(amt)d.amount=Number(amt[1].replace(/,/g,''));if(/per month|monthly|हर महीने|প্রতি মাস|ମାସିକ/.test(t))d.frequency='Monthly';}
    if(!route)return null;
    return{route,subsection,taskData:d,_fast:true};
  }

  function fastRoute(text){
    const data=parse(text);if(!data)return false;
    const now=Date.now();if(lastFast.text===String(text)&&lastFast.route===data.route&&now-lastFast.at<2500)return false;
    lastFast={text:String(text),route:data.route,at:now};
    const router=window.__DBEST_AI_TASK_ROUTER__;if(!router?.goToTask)return false;
    setTimeout(()=>{try{router.goToTask(data,text);}catch(e){console.warn('DBest fast route failed',e);}},0);
    return true;
  }

  window.fetch=function(input,init){
    const url=typeof input==='string'?input:String(input?.url||'');
    if(url.includes('/api/ai-assistant')&&init?.body){try{const body=JSON.parse(String(init.body));const msg=String(body.message||'').trim();if(msg)fastRoute(msg);}catch{}}
    return prevFetch(input,init);
  };

  window.addEventListener('dbest-ai-routing-data',e=>{
    const data=e.detail||{},text=String(data._userText||lastFast.text||'');
    if(!text||Date.now()-lastFast.at>15000||data.route!==lastFast.route)return;
    try{if(EXTERNAL.has(data.route))window.__DBEST_AI_TASK_ROUTER__?.renderExternalContext?.(data,text);}catch{}
  });

  window.__DBEST_AI_FAST_ROUTE__={version:VERSION,parse,fastRoute};
})();