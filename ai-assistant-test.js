(() => {
  'use strict';

  const TEST_LABEL = 'TEST ENVIRONMENT • SAMPLE RESULTS';
  const state = { listening: false, speak: true, lastIntent: null, context: {} };

  const host = document.createElement('div');
  host.id = 'dbest-ai-test-host';
  host.style.cssText = 'position:fixed;z-index:2147483000;right:16px;bottom:16px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif';
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });

  root.innerHTML = `
    <style>
      *{box-sizing:border-box}.fab{width:64px;height:64px;border-radius:50%;border:0;cursor:pointer;background:linear-gradient(145deg,#0a64ff,#6f3cff);color:#fff;box-shadow:0 14px 40px rgba(42,60,180,.32);font-size:27px;display:grid;place-items:center;margin-left:auto;transition:.2s}.fab:hover{transform:translateY(-2px)}
      .panel{width:min(390px,calc(100vw - 24px));height:min(680px,calc(100dvh - 100px));background:#fff;border:1px solid #e6e9f2;border-radius:24px;box-shadow:0 24px 70px rgba(15,23,42,.28);overflow:hidden;display:none;margin-bottom:12px;color:#14213d}.panel.open{display:flex;flex-direction:column}.head{padding:16px;background:linear-gradient(135deg,#071d49,#0a64ff 70%,#653cff);color:#fff}.headrow{display:flex;gap:12px;align-items:center}.mark{width:42px;height:42px;border-radius:13px;background:#fff;color:#0a64ff;font-weight:900;display:grid;place-items:center}.title{font-weight:850;font-size:17px;line-height:1.1}.sub{font-size:12px;opacity:.85;margin-top:4px}.close{margin-left:auto;border:0;background:rgba(255,255,255,.13);color:#fff;width:34px;height:34px;border-radius:10px;font-size:20px;cursor:pointer}.badge{display:inline-flex;margin-top:11px;padding:5px 9px;border-radius:999px;background:#fff3cd;color:#6a4b00;font-size:10px;font-weight:800;letter-spacing:.2px}.body{padding:14px;overflow:auto;flex:1;background:#f7f9fd}.hello{background:#fff;border:1px solid #e8edf6;border-radius:17px;padding:13px 14px;font-size:13px;line-height:1.45;box-shadow:0 4px 16px rgba(15,23,42,.04)}.chips{display:flex;gap:7px;overflow:auto;padding:11px 0 4px;scrollbar-width:none}.chip{flex:0 0 auto;border:1px solid #d8e1f2;background:#fff;color:#24456f;padding:7px 10px;border-radius:999px;font-size:11px;font-weight:700;cursor:pointer}.msgs{display:flex;flex-direction:column;gap:10px;margin-top:10px}.msg{max-width:88%;padding:10px 12px;border-radius:15px;font-size:13px;line-height:1.45;white-space:pre-wrap}.user{align-self:flex-end;background:#0a64ff;color:#fff;border-bottom-right-radius:5px}.ai{align-self:flex-start;background:#fff;color:#17213a;border:1px solid #e5eaf3;border-bottom-left-radius:5px}.label{font-size:10px;font-weight:800;color:#6b7b93;margin-bottom:4px}.cards{display:grid;gap:8px;margin-top:9px}.card{background:#f8fbff;border:1px solid #dbe8fb;border-radius:13px;padding:10px}.card b{font-size:13px}.price{font-size:15px;font-weight:900;color:#0759d5;margin-top:4px}.meta{font-size:11px;color:#596b82;margin-top:3px}.actions{display:flex;gap:6px;margin-top:8px}.small{border:0;background:#e9f2ff;color:#0759d5;padding:7px 9px;border-radius:9px;font-size:10px;font-weight:800;cursor:pointer}.composer{padding:10px;background:#fff;border-top:1px solid #e7ebf2}.inputrow{display:flex;gap:8px;align-items:center}.input{flex:1;min-width:0;border:1px solid #ccd6e5;border-radius:14px;padding:11px 12px;font-size:13px;outline:none}.input:focus{border-color:#0a64ff;box-shadow:0 0 0 3px rgba(10,100,255,.1)}.mic,.send{width:42px;height:42px;border:0;border-radius:13px;cursor:pointer;font-size:17px}.mic{background:#eef4ff;color:#0a64ff}.mic.listening{background:#ffe8ea;color:#d91b32;animation:pulse 1s infinite}.send{background:#0a64ff;color:#fff}.foot{display:flex;justify-content:space-between;align-items:center;margin-top:7px;font-size:10px;color:#7a879a}.toggle{border:0;background:transparent;color:#4c5e76;cursor:pointer;font-weight:700}@keyframes pulse{50%{transform:scale(.92);opacity:.7}}.thinking:after{content:'•••';letter-spacing:2px;animation:blink 1s infinite}@keyframes blink{50%{opacity:.35}}
      @media(max-width:480px){:host{right:10px!important;bottom:10px!important}.panel{width:calc(100vw - 20px);height:min(720px,calc(100dvh - 84px));border-radius:20px}.fab{width:58px;height:58px}}
    </style>
    <div class="panel" id="panel" aria-label="DBest AI Assistant Test">
      <div class="head"><div class="headrow"><div class="mark">D</div><div><div class="title">Ask DBest AI</div><div class="sub">Speak naturally • Hindi • English • Hinglish</div></div><button class="close" id="close" aria-label="Close">×</button></div><div class="badge">${TEST_LABEL}</div></div>
      <div class="body" id="body">
        <div class="hello"><b>What can I help you find?</b><br>Try speaking: “I need a Goa package at ₹15,000 per person.” This prototype uses sample options only and does not make bookings or payments.</div>
        <div class="chips">
          <button class="chip" data-q="I need a Goa package at 15000 per person">🏖️ Goa ₹15k</button>
          <button class="chip" data-q="I need health insurance for my family">🛡️ Health insurance</button>
          <button class="chip" data-q="Book a cab to railway station">🚕 Cab</button>
          <button class="chip" data-q="Show grocery offers under 500 rupees">🛒 Marketplace</button>
        </div>
        <div class="msgs" id="msgs"></div>
      </div>
      <div class="composer"><div class="inputrow"><input class="input" id="input" placeholder="Type or tap the mic…" autocomplete="off"><button class="mic" id="mic" title="Speak">🎙️</button><button class="send" id="send" title="Send">➤</button></div><div class="foot"><span id="status">Demo data • No live transactions</span><button class="toggle" id="voice">🔊 Voice reply: On</button></div></div>
    </div>
    <button class="fab" id="fab" aria-label="Ask DBest AI" title="Ask DBest AI">🎙️</button>`;

  const $ = (s) => root.querySelector(s);
  const panel = $('#panel'), msgs = $('#msgs'), body = $('#body'), input = $('#input'), mic = $('#mic'), status = $('#status');
  const escapeHtml = (s='') => String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function openPanel(){ panel.classList.add('open'); $('#fab').style.display='none'; setTimeout(()=>input.focus(),100); }
  function closePanel(){ panel.classList.remove('open'); $('#fab').style.display='grid'; }
  $('#fab').onclick=openPanel; $('#close').onclick=closePanel;

  function addUser(text){ const d=document.createElement('div'); d.className='msg user'; d.textContent=text; msgs.appendChild(d); scrollBottom(); }
  function addAI(html, speakText){ const d=document.createElement('div'); d.className='msg ai'; d.innerHTML=html; msgs.appendChild(d); scrollBottom(); if(state.speak && speakText) speak(speakText); }
  function scrollBottom(){ requestAnimationFrame(()=>{body.scrollTop=body.scrollHeight;}); }
  function thinking(){ const d=document.createElement('div'); d.className='msg ai thinking'; d.id='thinking'; d.textContent='Finding the best demo response '; msgs.appendChild(d); scrollBottom(); }
  function stopThinking(){ const x=$('#thinking'); if(x)x.remove(); }

  function speak(text){
    if(!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text.replace(/₹/g,'rupees '));
    u.lang = /[\u0900-\u097F]/.test(text) ? 'hi-IN' : 'en-IN';
    u.rate=.98; window.speechSynthesis.speak(u);
  }

  function moneyFrom(text){
    const t=text.toLowerCase().replace(/,/g,'');
    let m=t.match(/(?:₹|rs\.?|rupees?)?\s*(\d+(?:\.\d+)?)\s*(k|thousand|lakh|lac)?/i);
    if(!m) return null; let v=Number(m[1]); const unit=m[2]; if(unit==='k'||unit==='thousand')v*=1000; if(unit==='lakh'||unit==='lac')v*=100000; return v>=1000?v:null;
  }
  function detectIntent(t){
    const x=t.toLowerCase();
    if(/goa|trip|tour|package|hotel|flight|holiday|travel|vacation/.test(x)) return 'travel';
    if(/insurance|policy|health cover|term plan|motor cover|mediclaim/.test(x)) return 'insurance';
    if(/cab|taxi|ride|airport drop|station drop/.test(x)) return 'cab';
    if(/grocery|grocer|marketplace|shopping|buy|order|vegetable|medicine/.test(x)) return 'marketplace';
    if(/earning|payout|promoter|team business|downline|commission/.test(x)) return 'account';
    return 'general';
  }

  function travelReply(text){
    const budget=moneyFrom(text)||state.context.budget||15000; state.context.budget=budget;
    const goa=/goa/i.test(text)||state.context.destination==='Goa'; if(goa) state.context.destination='Goa';
    const origin=(text.match(/(?:from|से)\s+([a-zA-Z\u0900-\u097F ]{2,24})/i)||[])[1]; if(origin) state.context.origin=origin.trim();
    const hasDate=/oct|nov|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|today|tomorrow|\d{1,2}[\/-]\d{1,2}/i.test(text);
    if(!state.context.origin && !hasDate){
      return {html:`<div class="label">TRAVEL • BUDGET MATCH</div>Yes—around <b>₹${budget.toLocaleString('en-IN')} per person</b> can be workable for a Goa land package. To narrow it properly, tell me <b>your departure city and travel month/dates</b>.<div class="cards"><div class="card"><b>Indicative 3N Goa</b><div class="price">₹13,800–₹15,200 pp</div><div class="meta">3★ stay • Breakfast • Local transfers • Sample estimate</div></div></div>`, speak:`Yes. A Goa package around ${budget} rupees per person can be workable. Please tell me your departure city and travel month or dates.`};
    }
    const cards=[
      ['Goa Saver • 3 Nights',Math.max(10900,budget-1200),'3★ stay • Breakfast • Station/airport transfer'],
      ['Goa Comfort • 3 Nights',Math.max(11900,budget-300),'3★+ stay • Breakfast • Transfers • Sightseeing'],
      ['Goa Flex • 4 Nights',budget+1250,'3★ stay • Breakfast • Transfers • Slightly above budget']
    ].map((c,i)=>`<div class="card"><b>${c[0]}</b><div class="price">₹${c[1].toLocaleString('en-IN')} pp</div><div class="meta">${c[2]}</div><div class="actions"><button class="small" data-follow="Tell me more about option ${i+1}">View</button><button class="small" data-follow="Customize option ${i+1} under my budget">Customize</button></div></div>`).join('');
    return {html:`<div class="label">TRAVEL • 3 SAMPLE MATCHES</div>I found demo combinations around your <b>₹${budget.toLocaleString('en-IN')}</b> target.${state.context.origin?` Departure: <b>${escapeHtml(state.context.origin)}</b>.`:''}<div class="cards">${cards}</div><div class="meta" style="margin-top:8px">⚠️ Test results only. Live supplier prices/availability are not connected yet.</div>`, speak:`I found three sample Goa combinations close to your budget. These are test results only. Live supplier availability is not connected yet.`};
  }

  function insuranceReply(){
    return {html:`<div class="label">INSURANCE • NEEDS ANALYSIS</div>I can help shortlist plans, but I should first ask for <b>ages, family members, pincode and desired cover</b>.<div class="cards"><div class="card"><b>Example comparison flow</b><div class="meta">Cover ₹10L / ₹20L / ₹25L • Network hospitals • Waiting periods • Co-pay • Premium</div><div class="actions"><button class="small" data-follow="2 adults age 40 and 36, two children, cover 10 lakh">Try sample family</button></div></div></div><div class="meta" style="margin-top:8px">Regulated recommendation/final suitability would remain advisor-controlled.</div>`, speak:'For health insurance, I can shortlist options. I need the ages, family members, pincode and desired cover first.'};
  }
  function cabReply(){
    return {html:`<div class="label">CAB • DEMO FLOW</div>I can start a cab request. I would confirm <b>pickup, destination, ride time and passenger count</b>, then show available Vaahaks and fares.<div class="cards"><div class="card"><b>Sample local ride</b><div class="price">Fare shown after route check</div><div class="meta">Mini • Sedan • Auto • Bike, depending on availability</div></div></div><div class="meta" style="margin-top:8px">No real cab will be booked in this test.</div>`, speak:'I can start a cab request. Please confirm pickup, destination, ride time and passenger count. No real cab will be booked in this test.'};
  }
  function marketplaceReply(text){
    const budget=moneyFrom(text)||500;
    return {html:`<div class="label">MARKETPLACE • DEMO SEARCH</div>Here are example offer groups under <b>₹${budget.toLocaleString('en-IN')}</b>.<div class="cards"><div class="card"><b>Daily Essentials Combo</b><div class="price">₹449</div><div class="meta">Sample vendor catalogue • Demo only</div></div><div class="card"><b>Fresh Basket</b><div class="price">₹389</div><div class="meta">Sample vegetables & essentials • Demo only</div></div></div>`, speak:`I found sample marketplace combinations under ${budget} rupees. Live vendor inventory is not connected yet.`};
  }
  function accountReply(){
    return {html:`<div class="label">ACCOUNT • SECURE DATA</div>This is where a logged-in Leader/Promoter could ask “What is my team business today?” or “How much is my payout?”<br><br><b>Personal DBest account data is intentionally disabled in this prototype.</b>`, speak:'Secure account questions are planned, but personal DBest account data is intentionally disabled in this prototype.'};
  }
  function generalReply(){
    return {html:`<div class="label">DBEST AI • TEST</div>I can currently demonstrate <b>Travel, Insurance, Cab and Marketplace</b>. Try speaking naturally, for example: “Goa package under 15 thousand per person.”`, speak:'In this test I can demonstrate travel, insurance, cab and marketplace. Try asking naturally.'};
  }

  function answer(text){
    const intent=detectIntent(text); state.lastIntent=intent;
    let r;
    if(intent==='travel'||(state.lastIntent==='travel'&&state.context.destination)) r=travelReply(text);
    else if(intent==='insurance') r=insuranceReply(text);
    else if(intent==='cab') r=cabReply(text);
    else if(intent==='marketplace') r=marketplaceReply(text);
    else if(intent==='account') r=accountReply(text);
    else if(state.context.destination && (/ranchi|kolkata|delhi|mumbai|nov|dec|oct|jan|feb|mar/i.test(text))) r=travelReply(text);
    else r=generalReply();
    setTimeout(()=>{stopThinking();addAI(r.html,r.speak);bindFollowups();status.textContent='Demo data • No live transactions';},420);
  }

  function submit(q){ const text=(q||input.value).trim(); if(!text)return; input.value=''; addUser(text); thinking(); status.textContent='Understanding request…'; answer(text); }
  $('#send').onclick=()=>submit(); input.addEventListener('keydown',e=>{if(e.key==='Enter')submit();});
  root.querySelectorAll('.chip').forEach(b=>b.onclick=()=>submit(b.dataset.q));
  function bindFollowups(){ root.querySelectorAll('[data-follow]').forEach(b=>{if(!b.dataset.bound){b.dataset.bound='1';b.onclick=()=>submit(b.dataset.follow);}}); }

  let recognition=null;
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(SpeechRecognition){
    recognition=new SpeechRecognition(); recognition.lang='en-IN'; recognition.interimResults=true; recognition.continuous=false;
    recognition.onstart=()=>{state.listening=true;mic.classList.add('listening');mic.textContent='⏹';status.textContent='Listening… speak now';};
    recognition.onresult=(e)=>{let finalText='', interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)finalText+=t;else interim+=t;} input.value=finalText||interim;if(finalText)submit(finalText);};
    recognition.onerror=(e)=>{status.textContent=e.error==='not-allowed'?'Microphone permission is needed':'Voice input unavailable — please type';};
    recognition.onend=()=>{state.listening=false;mic.classList.remove('listening');mic.textContent='🎙️'; if(status.textContent.startsWith('Listening'))status.textContent='Demo data • No live transactions';};
    mic.onclick=()=>{try{state.listening?recognition.stop():recognition.start();}catch(e){status.textContent='Tap mic again or type your request';}};
  } else {
    mic.onclick=()=>{status.textContent='Voice recognition is not supported in this browser; typing works.';};
  }

  $('#voice').onclick=()=>{state.speak=!state.speak;$('#voice').textContent=state.speak?'🔊 Voice reply: On':'🔇 Voice reply: Off';if(!state.speak&&'speechSynthesis'in window)window.speechSynthesis.cancel();};

  // Signal for automated smoke tests without exposing any production API.
  window.__DBEST_AI_TEST__={version:'0.1-test',open:openPanel,submit};
})();