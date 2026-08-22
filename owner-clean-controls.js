(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function isOwner(){try{return window.session&&session.role==='owner'}catch(e){return false}}
  function cleanOverlays(){if(!document.getElementById('dbestShowcaseOwnerModal')&&!document.getElementById('dbestShowcaseEditModal'))document.body.style.overflow='';}
  function openFinanceSection(kind){
    if(!isOwner())return typeof window.ownerLogin==='function'?window.ownerLogin():null;
    const isIns=kind==='insurance', id=isIns?'insurance':'mf';
    const title=isIns?'Insurance Section Control':'Mutual Fund Section Control';
    const icon=isIns?'🛡️':'📈';
    const l=(window.links&&window.links[id])||{};
    if(typeof window.sectionScreen!=='function')return window.toast?.('Owner section screen unavailable');
    const top=typeof window.sectionTopBar==='function'?window.sectionTopBar(icon+' '+title,'Deeplink • Images • Display','owner()'):`<div style="display:flex;gap:10px;align-items:center"><button class="btn soft" onclick="owner()">← Back</button><h2>${title}</h2></div>`;
    window.sectionScreen(`${top}<div class="sectionContent ownerStudio"><div class="payoutIntro"><b>${isIns?'Insurance':'Mutual Fund'} controls only.</b><br><small>Manage partner deeplink and the customer-facing image/text cards here. Promoter/User payout rules are managed separately in Payout Studio.</small></div><div class="cards"><div class="card"><b>🖼 ${isIns?'Insurer':'Mutual Fund House'} Cards</b><small style="display:block;margin:6px 0 12px;color:var(--m)">Add, edit, hide/show, reorder or replace card images and text.</small><button class="btn" type="button" data-dbest-finance-visual="${kind}">Manage Images & Cards</button></div><div class="card"><b>🔗 Partner Deeplink</b><form class="form" onsubmit="saveLink(event,'${id}')"><div class="f full"><label>Partner Name</label><input name="partner" value="${esc(l.partner||'')}"></div><div class="f full"><label>External URL</label><input name="url" value="${esc(l.url||'')}" placeholder="https://..."></div><div class="f full"><label>Button Label</label><input name="buttonLabel" value="${esc(l.buttonLabel||('Continue to '+(l.partner||'Partner')))}"></div><div class="f full"><label><input type="checkbox" name="enabled" ${l.enabled!==false&&l.url?'checked':''}> Enabled</label></div><div class="f full"><button class="btn">Save ${isIns?'Insurance':'Mutual Fund'} Deeplink</button></div></form></div></div></div>`);
    setTimeout(()=>{document.querySelector(`[data-dbest-finance-visual="${kind}"]`)?.addEventListener('click',()=>window.DBEST_SHOWCASE_ADMIN?.openManager?.(kind));},0);
  }
  window.ownerInsuranceSectionControl=()=>openFinanceSection('insurance');
  window.ownerMutualFundSectionControl=()=>openFinanceSection('mutual_fund');

  function addSectionControls(){
    if(!isOwner())return;
    const root=document.querySelector('.sectionContent.owner55'); if(!root)return;
    document.getElementById('dbestOwnerVisualControl')?.remove();
    if(document.getElementById('dbestOwnerInsuranceControl'))return;
    const groups=[...root.querySelectorAll('.owner55Group')];
    const platform=groups.find(g=>/Platform & Experience/i.test(g.innerText||''))||groups[0];
    const grid=platform?.querySelector('.owner55Grid'); if(!grid)return;
    const ins=document.createElement('button');ins.id='dbestOwnerInsuranceControl';ins.className='owner55Action';ins.innerHTML='<span>🛡️</span><b>Insurance Section</b><small>Only Insurance deeplink, insurer cards, images, text, order and visibility.</small>';ins.onclick=window.ownerInsuranceSectionControl;
    const mf=document.createElement('button');mf.id='dbestOwnerMutualFundControl';mf.className='owner55Action';mf.innerHTML='<span>📈</span><b>Mutual Fund Section</b><small>Only Mutual Fund deeplink, AMC cards, images, text, order and visibility.</small>';mf.onclick=window.ownerMutualFundSectionControl;
    grid.append(ins,mf);
  }
  function routeOwnerControl(e){
    if(!isOwner())return; const b=e.target.closest?.('button'); if(!b)return; const t=(b.innerText||'').trim().toLowerCase();
    if(t.includes('insurance section')){e.preventDefault();e.stopImmediatePropagation();cleanOverlays();return window.ownerInsuranceSectionControl();}
    if(t.includes('mutual fund section')){e.preventDefault();e.stopImmediatePropagation();cleanOverlays();return window.ownerMutualFundSectionControl();}
    if(t.includes('tile media studio')||t==='tile media'||t.startsWith('tile media\n')){if(typeof window.ownerTileMediaStudio==='function'){e.preventDefault();e.stopImmediatePropagation();cleanOverlays();return window.ownerTileMediaStudio();}}
    if(t.includes('deeplink integrations')||t.includes('deeplink integration studio')||t==='deeplinks'||t.includes('external deeplinks')){if(typeof window.ownerDeeplinkStudio==='function'){e.preventDefault();e.stopImmediatePropagation();cleanOverlays();return window.ownerDeeplinkStudio();}}
    if(t.includes('payout studio')||t==='payouts'||t.startsWith('payout rules')){if(typeof window.ownerPayoutStudio==='function'){e.preventDefault();e.stopImmediatePropagation();cleanOverlays();return window.ownerPayoutStudio();}}
  }
  document.addEventListener('click',routeOwnerControl,true);
  const observer=new MutationObserver(()=>{cleanOverlays();addSectionControls();});observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(addSectionControls,250);
  window.DBEST_OWNER_CLEAN_CONTROLS={refresh:addSectionControls,insurance:window.ownerInsuranceSectionControl,mutualFund:window.ownerMutualFundSectionControl};
})();