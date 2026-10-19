(function(){
'use strict';
const VERSION='2.5.0-protected-partner-handoffs';
const esc2=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const keyFor=(id,i)=>Number.isInteger(i)?`${id}::${i}`:String(id||'');
function linkFor(id,i){
  try{
    const central=(window.DBEST_PUBLIC_LINKS&&typeof window.DBEST_PUBLIC_LINKS==='object')?window.DBEST_PUBLIC_LINKS:null;
    if(central){
      if(Number.isInteger(i)&&central[keyFor(id,i)]?.url)return central[keyFor(id,i)];
      if(central[String(id)]?.url)return central[String(id)];
    }
    if(Number.isInteger(i)&&typeof links!=='undefined'&&links?.[keyFor(id,i)]?.url)return links[keyFor(id,i)];
    return typeof links!=='undefined'?(links?.[String(id)]||null):null;
  }catch(e){return null}
}
function sectionById(id){try{return services.find(s=>String(s?.[0])===String(id))||null}catch(e){return null}}
function saveUniversalLink(e,key){
  e.preventDefault();
  try{
    const f=new FormData(e.target);
    links[key]={partner:String(f.get('partner')||'').trim(),url:String(f.get('url')||'').trim(),buttonLabel:String(f.get('buttonLabel')||'').trim(),enabled:f.get('enabled')==='on'};
    if(typeof save==='function')save();
    window.DBEST_OWNER_CONTROL_LIVE?.syncOwnerSettings?.().catch?.(()=>{});
    if(typeof toast==='function')toast('Deeplink saved for '+key);
    window.ownerDeeplinkStudio?.();
  }catch(err){console.error(err);if(typeof toast==='function')toast('Could not save deeplink')}
}
window.saveUniversalLink=saveUniversalLink;

function formHtml(key,title,subLabel){
  let l={};try{l=links?.[key]||{}}catch(e){}
  return `<form class="form" onsubmit="saveUniversalLink(event,'${esc2(key)}')" style="margin-top:8px">
    <div class="f"><label>Partner / Destination Name</label><input name="partner" value="${esc2(l.partner||'')}"></div>
    <div class="f"><label>Button Label</label><input name="buttonLabel" value="${esc2(l.buttonLabel||'Continue to Partner')}"></div>
    <div class="f full"><label>Destination URL</label><input name="url" value="${esc2(l.url||'')}" placeholder="https://partner.example/path?ref={DBEST_TX_ID}"></div>
    <div class="f full"><label><input type="checkbox" name="enabled" ${l.url&&l.enabled!==false?'checked':''}> Enabled</label><small style="display:block;color:#687386;margin-top:4px">${esc2(subLabel||title)} • Supports {DBEST_TX_ID}, {USER_ID}, {SECTION_ID}, {SUBSECTION}.</small></div>
    <div class="f full"><button class="mini">Save Deeplink</button></div>
  </form>`;
}

window.ownerDeeplinkStudio=function(){
  try{
    if(!session||session.role!=='owner')return typeof ownerLogin==='function'?ownerLogin():null;
    const cards=(services||[]).map(s=>{
      const id=String(s[0]),title=String(s[1]||id),subs=Array.isArray(s[5])?s[5]:[];
      const configured=(links?.[id]?.url?1:0)+subs.filter((_,i)=>links?.[keyFor(id,i)]?.url).length;
      return `<details class="card" style="padding:14px" ${configured?'open':''}><summary style="cursor:pointer;font-weight:900">${esc2(s[2]||'🔗')} ${esc2(title)} <small style="color:#687386">• ${configured} configured</small></summary>
        <div class="notice" style="margin-top:10px"><b>Section-level destination</b><br><small>Optional link for the whole ${esc2(title)} section.</small></div>${formHtml(id,title,'Section level')}
        ${subs.length?`<h4 style="margin:16px 0 7px">Subsection Deeplinks</h4>${subs.map((sub,i)=>`<div style="border-top:1px solid #e8edf5;padding-top:10px;margin-top:10px"><b>${esc2(sub)}</b>${formHtml(keyFor(id,i),title,String(sub))}</div>`).join('')}`:'<div class="notice" style="margin-top:10px">This section has no configured subsections.</div>'}
      </details>`;
    }).join('');
    sectionScreen(`${sectionTopBar('🔗 Deeplink Integration Studio','Every section • Every subsection • Transaction tracking','ownerOperations()')}<div class="sectionContent ownerStudio"><div class="payoutIntro"><b>Owner-managed deeplinks are available across the complete DBest platform.</b><br><small>Each section and subsection can have its own destination. External handoffs generate a DBest Internal Transaction ID and pass it to the destination.</small></div><div style="display:grid;gap:10px;margin-top:12px">${cards}</div></div>`);
  }catch(err){console.error(err);if(typeof toast==='function')toast('Deeplink Studio could not open')}
};

window.dbestUniversalExternalGo=function(id,i){
  try{
    const liveSession=(()=>{try{return JSON.parse(localStorage.getItem('d2_session')||'{}')}catch(e){return{}}})();
    const activeSession=(window.session&&window.session.id)?window.session:liveSession;
    if(!activeSession?.id||activeSession.role==='visitor'){
      if(typeof toast==='function')toast('Please login to continue to the partner service');
      try{if(typeof loginChoice==='function')loginChoice();else if(typeof account==='function')account();else location.href='/preview-member-login-v2.html?return='+encodeURIComponent(location.pathname+location.search)}catch(e){try{location.href='/preview-member-login-v2.html'}catch(_){}}
      return;
    }
    const s=sectionById(id);if(!s)return typeof toast==='function'&&toast('Section not found');
    const idx=Number.isInteger(i)?i:null,l=linkFor(id,idx);
    if(!l?.url||l.enabled===false)return typeof toast==='function'&&toast('Deeplink is not configured or is disabled');
    const sub=idx!==null?(s[5]?.[idx]||'External Partner Transaction'):String(s[1]||'Partner Handoff');
    const userId=String(activeSession?.id||'guest');
    let destination=null;
    try{
      destination=new URL(String(l.url),location.href);
      if(destination.protocol!=='https:')throw new Error('partner_url_must_be_https');
    }catch(badLink){
      if(typeof toast==='function')toast('This partner link is invalid. Please contact DBest support.');
      return;
    }
    const dedupeKey=[String(id),idx===null?'section':idx,String(activeSession.id)].join(':');
    const now=Date.now();
    if(window.__dbestLastPartnerHandoff?.key===dedupeKey&&now-window.__dbestLastPartnerHandoff.time<1800)return;
    window.__dbestLastPartnerHandoff={key:dedupeKey,time:now};
    let txId='';
    let trackedTx=null;
    let url=destination.toString();
    // Tracking must never prevent a valid partner handoff.
    try{
      if(typeof addTx==='function'&&activeSession?.id){
        const x=addTx(activeSession.id,s[1],sub,'','Redirected / Pending',l.partner||'',{details:'External partner deeplink initiated',source:'Partner Deeplink',partnerUrl:l.url,sectionId:id,subIndex:idx,serviceSubtype:sub,buttonLabel:l.buttonLabel||''});
        txId=String(x?.id||'');
        trackedTx=x||null;
        if(typeof save==='function')save();
      }
    }catch(trackErr){console.warn('DBest deeplink tracking skipped',trackErr)}
    url=url.replaceAll('{DBEST_TX_ID}',txId).replaceAll('{USER_ID}',userId).replaceAll('{SECTION_ID}',String(id)).replaceAll('{SUBSECTION}',String(sub));
    // Preserve the Owner's partner/referral query parameters; only append DBest tracking.
    const u=destination;
    if(txId)u.searchParams.set('dbest_tx_id',txId);
    if(userId&&userId!=='guest')u.searchParams.set('dbest_user_id',userId);
    u.searchParams.set('dbest_section',String(id));
    u.searchParams.set('dbest_subsection',String(sub));
    url=u.toString();
    if(trackedTx){
      trackedTx.partnerUrl=url;
      trackedTx.meta={...(trackedTx.meta||{}),partnerUrl:url,subIndex:idx,serviceSubtype:sub};
      try{if(typeof save==='function')save()}catch(e){}
    }
    // Android-friendly same-tab navigation. Never create a payment or mark a referral successful.
    try{window.location.assign(url)}catch(navErr){window.location.href=url}
  }catch(err){console.error(err);if(typeof toast==='function')toast('Could not open partner destination')}
};
function deeplinkCard(id,i){
  const s=sectionById(id),l=linkFor(id,i);if(!s||!l?.url||l.enabled===false)return '';
  const inherited=Number.isInteger(i)&&!(window.DBEST_PUBLIC_LINKS?.[keyFor(id,i)]?.url||(typeof links!=='undefined'&&links?.[keyFor(id,i)]?.url));
  return `<div data-dbest-universal-deeplink="1" class="card" style="margin:10px 0 14px;border:1px solid #cfe0ff;background:linear-gradient(135deg,#f7faff,#eef4ff)"><small>🔗 DBest Partner Deeplink${inherited?' • Section default':''}</small><b style="font-size:17px;margin-top:4px">${esc2(l.partner||s[1]+' Partner')}</b><small>Tracked with a DBest Internal Transaction ID.</small><button class="btn" style="margin-top:9px" onclick="dbestUniversalExternalGo('${esc2(id)}'${Number.isInteger(i)?','+i:''})">${esc2(l.buttonLabel||'Continue to Partner')} ↗</button></div>`;
}
function injectNow(id,i,targetRoot){
  try{
    const h=deeplinkCard(id,i);if(!h)return false;
    // A delayed callback must never insert a partner CTA into a later Cab/Marketplace page.
    const root=targetRoot;
    if(!root||root.isConnected===false)return false;
    const existing=root.querySelector('[data-dbest-universal-deeplink]');
    if(existing){
      // Core UI can render an empty placeholder before central links finish loading.
      // Replace it with the live configured card instead of treating it as complete.
      existing.outerHTML=h;
      return true;
    }
    const hero=root.querySelector('.sectionHero');if(hero)hero.insertAdjacentHTML('afterend',h);else root.insertAdjacentHTML('afterbegin',h);
    return true;
  }catch(e){return false}
}
let publicRefresh=null;
function ensurePublicLinks(){
  if(window.DBEST_PUBLIC_CONFIG?.links&&Object.keys(window.DBEST_PUBLIC_CONFIG.links).length)return Promise.resolve(true);
  if(publicRefresh)return publicRefresh;
  const fetcher=window.DBEST_OWNER_CONTROL_LIVE?.refreshPublic;
  if(typeof fetcher!=='function')return Promise.resolve(false);
  publicRefresh=Promise.resolve().then(()=>fetcher()).then(()=>true,()=>false).finally(()=>{publicRefresh=null});
  return publicRefresh;
}
function inject(id,i){
  const roots=[...document.querySelectorAll('.sectionContent')];
  const root=roots.pop()||null;
  if(!root)return;
  [35,180,600,1400].forEach(ms=>setTimeout(()=>injectNow(id,i,root),ms));
  // One shared public refresh only when links are missing; no repeated home-screen rerenders.
  if(!linkFor(id,i)?.url)ensurePublicLinks().finally(()=>injectNow(id,i,root));
}
const PARTNER_HANDOFF_SECTIONS=new Set(['insurance','flights','mf']);
const baseExternalGo=window.externalGo;
if(typeof baseExternalGo==='function')window.externalGo=function(id){
  if(PARTNER_HANDOFF_SECTIONS.has(String(id)))return window.dbestUniversalExternalGo(id);
  return baseExternalGo.apply(this,arguments);
};
const baseOpenService=window.openService;
if(typeof baseOpenService==='function')window.openService=function(id){const out=baseOpenService.apply(this,arguments);inject(id,null);return out};
const baseOpenContent=window.openContentForm;
if(typeof baseOpenContent==='function')window.openContentForm=function(id,i){
  if(PARTNER_HANDOFF_SECTIONS.has(String(id))){
    const n=Number(i);
    if(Number.isInteger(n)&&n>=0){
      const l=linkFor(id,n);
      if(l?.url&&l.enabled!==false)return window.dbestUniversalExternalGo(id,n);
      if(l?.enabled===false){if(typeof toast==='function')toast('This partner handoff is disabled by DBest Owner.');return}
      // New phone / newly signed-in browser: wait for the saved Owner link rather than
      // mistakenly opening an unrelated DBest processing-fee application.
      return ensurePublicLinks().then(()=>{
        const live=linkFor(id,n);
        if(live?.url&&live.enabled!==false)return window.dbestUniversalExternalGo(id,n);
        if(typeof toast==='function')toast(live?.enabled===false?'This partner handoff is disabled by DBest Owner.':'Partner destination is not configured. Please contact DBest support.');
      });
    }
  }
  const out=baseOpenContent.apply(this,arguments);inject(id,Number(i));return out
};

const baseOps=window.ownerOperations;
if(typeof baseOps==='function')window.ownerOperations=function(){const out=baseOps.apply(this,arguments);setTimeout(()=>{document.querySelectorAll('button[onclick="ownerDeeplinkStudio()"]').forEach(b=>{const small=b.querySelector('small');if(small)small.textContent='Configure external/internal destinations for every section and subsection.'})},20);return out};

const baseTests=window.projectTests;
if(typeof baseTests==='function')window.projectTests=function(){
  const out=baseTests.apply(this,arguments)||[];
  try{
    for(const s of services||[]){const id=String(s[0]);out.push([true,`${s[1]} deeplink control`,links?.[id]?.url?'Section link configured':'Available to Owner']);(s[5]||[]).forEach((sub,i)=>out.push([true,`${s[1]} • ${sub} deeplink control`,links?.[keyFor(id,i)]?.url?'Configured':'Available to Owner']))}
  }catch(e){}
  return out;
};
window.DBEST_UNIVERSAL_DEEPLINKS={version:VERSION,keyFor,linkFor};
})();