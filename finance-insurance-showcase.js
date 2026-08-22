(function(){
  const insuranceBrands=[
    ['ManipalCigna','Health Insurance','Health plans, family floater and protection solutions'],
    ['Star Health','Health Insurance','Retail health and family protection plans'],
    ['Care Health','Health Insurance','Health cover and wellness-focused insurance'],
    ['HDFC ERGO','General Insurance','Motor, health and general insurance solutions'],
    ['ICICI Lombard','General Insurance','Motor, travel and general insurance solutions'],
    ['SBI Life','Life Insurance','Life protection and long-term savings solutions']
  ];
  const mfBrands=[
    ['HDFC Mutual Fund','Mutual Fund House','Equity, debt, hybrid and index fund options'],
    ['SBI Mutual Fund','Mutual Fund House','SIP and diversified mutual fund solutions'],
    ['ICICI Prudential MF','Mutual Fund House','Equity, debt, hybrid and passive solutions'],
    ['Nippon India MF','Mutual Fund House','Retail mutual funds, ETFs and index solutions'],
    ['Axis Mutual Fund','Mutual Fund House','SIP, equity, debt and hybrid schemes'],
    ['Kotak Mutual Fund','Mutual Fund House','Mutual fund and systematic investment options']
  ];
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function art(name,kind){
    const initials=String(name).split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#143873"/><stop offset="1" stop-color="#3675ff"/></linearGradient></defs><rect width="100%" height="100%" rx="28" fill="url(#g)"/><circle cx="530" cy="55" r="125" fill="#ffffff18"/><text x="44" y="128" font-family="Arial" font-size="72" font-weight="700" fill="white">${initials}</text><text x="46" y="180" font-family="Arial" font-size="24" fill="#eaf1ff">${kind==='mf'?'MUTUAL FUND':'INSURANCE'}</text></svg>`)}`;
  }
  function build(kind){
    const brands=kind==='mf'?mfBrands:insuranceBrands;
    const heading=kind==='mf'?'Featured Mutual Fund Houses':'Featured Insurance Partners';
    const note=kind==='mf'?'Explore selected AMCs below. Transactions continue through the configured DBest Partner Deeplink.':'Explore selected insurers below. Transactions continue through the configured DBest Partner Deeplink.';
    return `<section class="dbestShowcase" data-dbest-showcase="${kind}"><div class="dbestShowIntro"><h2>${heading}</h2><p>${note}</p></div><div class="dbestShowGrid">${brands.map(([n,t,d])=>`<article class="dbestShowCard"><img src="${art(n,kind)}" alt="${esc(n)}"><div class="dbestShowBody"><h3>${esc(n)}</h3><b>${esc(t)}</b><p>${esc(d)}</p></div></article>`).join('')}</div></section>`;
  }
  function detectKind(){
    const text=(document.querySelector('.sectionContent')?.innerText||document.body.innerText||'').toLowerCase();
    if(text.includes('all insurance')||text.includes('health insurance')||text.includes('motor insurance')||text.includes('life insurance')||text.includes('travel insurance')) return 'insurance';
    if(text.includes('mutual fund')||text.includes('mutual funds')||text.includes('sip')) return 'mf';
    return '';
  }
  function closestCard(el,root){
    let n=el;
    while(n&&n!==root){
      const c=(n.className||'').toString().toLowerCase();
      if(c.includes('card')||c.includes('sub')||c.includes('option')||c.includes('service')) return n;
      n=n.parentElement;
    }
    return el.parentElement;
  }
  function apply(){
    const root=document.querySelector('.sectionContent');
    if(!root)return;
    const kind=detectKind(); if(!kind)return;
    const whole=(root.innerText||'').toLowerCase();
    if(kind==='insurance'&&!whole.includes('insurance'))return;
    if(kind==='mf'&&!whole.includes('mutual fund')&&!whole.includes('sip'))return;

    // Keep deeplink block intact.
    let deeplink=null;
    const all=[...root.querySelectorAll('*')];
    for(const el of all){
      const txt=(el.innerText||'').trim();
      if(/DBest Partner Deeplink|partner URL configured|partner url configured/i.test(txt)){
        deeplink=closestCard(el,root); break;
      }
    }

    // Remove legacy forms and service-opening cards only.
    root.querySelectorAll('form').forEach(f=>f.remove());
    for(const el of [...root.querySelectorAll('*')]){
      const txt=(el.innerText||'').trim();
      if(/^Open this service\s*→?$/i.test(txt) || /Open this service\s*→/i.test(txt)){
        const card=closestCard(el,root);
        if(card && card!==deeplink && !(deeplink&&card.contains(deeplink))) card.remove();
      }
    }

    // Also remove obvious old insurance/MF category cards but never the deeplink card.
    for(const el of [...root.children]){
      if(el===deeplink || (deeplink&&el.contains(deeplink)) || el.matches('[data-dbest-showcase]')) continue;
      const txt=(el.innerText||'').trim();
      if(/^(Health Insurance|Motor Insurance|Life Insurance|Travel Insurance|Mutual Funds?|SIP)\b/i.test(txt) && /Open this service/i.test(txt)) el.remove();
    }

    const old=root.querySelector('[data-dbest-showcase]');
    if(old && old.getAttribute('data-dbest-showcase')!==kind) old.remove();
    if(!root.querySelector(`[data-dbest-showcase="${kind}"]`)){
      const temp=document.createElement('div'); temp.innerHTML=build(kind); const show=temp.firstElementChild;
      if(deeplink && deeplink.parentElement) deeplink.insertAdjacentElement('afterend',show); else root.appendChild(show);
    }
  }
  if(!document.getElementById('dbestFinShowStyle')){
    const style=document.createElement('style');style.id='dbestFinShowStyle';style.textContent=`.dbestShowcase{margin:20px 0 30px}.dbestShowIntro{margin-bottom:14px}.dbestShowIntro h2{margin:0 0 6px;font-size:24px;color:#13213a}.dbestShowIntro p{margin:0;color:#687386;line-height:1.5}.dbestShowGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.dbestShowCard{overflow:hidden;background:#fff;border:1px solid #e2e8f2;border-radius:20px;box-shadow:0 10px 24px rgba(20,50,100,.07)}.dbestShowCard img{display:block;width:100%;height:130px;object-fit:cover}.dbestShowBody{padding:14px}.dbestShowBody h3{margin:0 0 5px;font-size:18px;color:#13213a}.dbestShowBody b{display:block;font-size:12px;color:#175cff}.dbestShowBody p{margin:7px 0 0;color:#687386;font-size:13px;line-height:1.45}@media(max-width:520px){.dbestShowGrid{grid-template-columns:1fr 1fr;gap:10px}.dbestShowCard img{height:96px}.dbestShowBody{padding:11px}.dbestShowBody h3{font-size:15px}.dbestShowBody p{font-size:11px}}`;document.head.appendChild(style);
  }
  let t=null; const schedule=()=>{clearTimeout(t);t=setTimeout(apply,40)};
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',()=>{setTimeout(apply,40);setTimeout(apply,180)},true);
  setInterval(apply,700);
  setTimeout(apply,100);setTimeout(apply,500);
})();