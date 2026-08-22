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
  const img=(name,kind)=>{
    const words=String(name).split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
    const label=encodeURIComponent(words||'DB');
    const sub=encodeURIComponent(kind==='mf'?'MUTUAL FUND':'INSURANCE');
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="260"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#123b82"/><stop offset="1" stop-color="#2d72ff"/></linearGradient></defs><rect width="100%" height="100%" rx="28" fill="url(#g)"/><circle cx="385" cy="55" r="95" fill="#ffffff18"/><text x="40" y="118" font-family="Arial" font-size="64" font-weight="700" fill="white">${words}</text><text x="42" y="166" font-family="Arial" font-size="22" fill="#eaf1ff">${kind==='mf'?'MUTUAL FUND':'INSURANCE'}</text></svg>`)}`;
  };
  function titleOf(root){
    const candidates=[...root.querySelectorAll('h1,h2,.sectionTitle,.pageTitle')];
    return candidates.map(x=>x.textContent||'').join(' ').toLowerCase();
  }
  function isRelevant(root){
    const t=titleOf(root);
    if(/all insurance|health insurance|life insurance|motor insurance|travel insurance/.test(t)) return 'insurance';
    if(/mutual fund|mutual funds|sip/.test(t)) return 'mf';
    return '';
  }
  function build(kind){
    const brands=kind==='mf'?mfBrands:insuranceBrands;
    const heading=kind==='mf'?'Featured Mutual Fund Houses':'Featured Insurance Partners';
    const note=kind==='mf'?'Explore selected AMCs below. Use the DBest Partner Deeplink above when you are ready to transact.':'Explore selected insurers below. Use the DBest Partner Deeplink above when you are ready to transact.';
    const cards=brands.map(([name,type,desc])=>`<article class="dbestShowCard"><img src="${img(name,kind)}" alt="${esc(name)}"><div class="dbestShowBody"><h3>${esc(name)}</h3><b>${esc(type)}</b><p>${esc(desc)}</p></div></article>`).join('');
    return `<section class="dbestShowcase" data-dbest-showcase="${kind}"><div class="dbestShowIntro"><h2>${heading}</h2><p>${note}</p></div><div class="dbestShowGrid">${cards}</div><p class="dbestShowFoot">Product availability, eligibility, pricing and transaction completion are handled through the configured DBest partner deeplink.</p></section>`;
  }
  function simplify(root){
    if(!(root instanceof HTMLElement))return;
    const kind=isRelevant(root);if(!kind)return;
    if(root.querySelector(`[data-dbest-showcase="${kind}"]`))return;
    const deeplink=[...root.querySelectorAll('div,section,article')].find(el=>/deeplink|partner url/i.test(el.textContent||'') && el.children.length<15);
    root.querySelectorAll('form').forEach(el=>el.remove());
    [...root.querySelectorAll('.sub,.card,.form,.forms,.serviceForm,.productForm')].forEach(el=>{
      if(el===deeplink||el.contains(deeplink)||/deeplink|partner url/i.test(el.textContent||''))return;
      el.remove();
    });
    const temp=document.createElement('div');temp.innerHTML=build(kind);const show=temp.firstElementChild;
    if(deeplink&&deeplink.parentElement){deeplink.insertAdjacentElement('afterend',show);}else root.appendChild(show);
  }
  const style=document.createElement('style');style.textContent=`
    .dbestShowcase{margin:18px 0 28px}.dbestShowIntro{margin-bottom:12px}.dbestShowIntro h2{margin:0 0 6px;font-size:24px;color:#13213a}.dbestShowIntro p,.dbestShowFoot{margin:0;color:#687386;line-height:1.5}
    .dbestShowGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.dbestShowCard{overflow:hidden;background:#fff;border:1px solid #e2e8f2;border-radius:20px;box-shadow:0 10px 24px rgba(20,50,100,.07)}.dbestShowCard img{display:block;width:100%;height:128px;object-fit:cover}.dbestShowBody{padding:14px}.dbestShowBody h3{margin:0 0 5px;font-size:18px;color:#13213a}.dbestShowBody b{display:block;font-size:12px;color:#175cff}.dbestShowBody p{margin:7px 0 0;color:#687386;font-size:13px;line-height:1.45}.dbestShowFoot{margin-top:13px;font-size:12px}
    @media(max-width:760px){.dbestShowGrid{grid-template-columns:1fr 1fr}}@media(max-width:480px){.dbestShowGrid{grid-template-columns:1fr}.dbestShowCard img{height:112px}}
  `;document.head.appendChild(style);
  function scan(){document.querySelectorAll('.sectionContent,main,.page,.screen').forEach(simplify)}
  const obs=new MutationObserver(()=>{clearTimeout(window.__dbest_fin_scan);window.__dbest_fin_scan=setTimeout(scan,80)});obs.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',()=>setTimeout(scan,150),true);
  setTimeout(scan,300);
})();