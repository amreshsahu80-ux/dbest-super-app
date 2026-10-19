(function(){
'use strict';
const VERSION='2.5.0-preserve-partner-affiliate-url';
const esc2=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const keyFor=(id,i)=>Number.isInteger(i)?`${id}::${i}`:String(id||'');
function linkFor(id,i){
  try{
    // The distinct "Hotels n Packages" tile inherits the Owner-confirmed
    // DBest Fly destination unless the Owner explicitly configures travel.
    const key=String(id||''),central=(window.DBEST_PUBLIC_LINKS&&typeof window.DBEST_PUBLIC_LINKS==='object')?window.DBEST_PUBLIC_LINKS:null;
    const local=typeof links!=='undefined'&&links&&typeof links==='object'?links:null;
    // Public Owner settings are authoritative. Only use local saved links
    // before the public configuration is available, never in preference to it.
    const source=central||local;
    if(!source)return null;
    if(Number.isInteger(i)&&source[keyFor(key,i)])return source[keyFor(key,i)];
    if(source[key])return source[key];
    if(key==='travel'&&source.flights)return source.flights;
    return null;
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

window.dbestUniversalExternalGo=async function(id,i){
  try{
    const liveSession=(()=>{try{return JSON.parse(localStorage.getItem('d2_session')||'{}')}catch(e){return{}}})();
    const activeSession=(window.session&&window.session.id)?window.session:liveSession;
    if(!activeSession?.id||activeSession.role==='visitor'){
      if(typeof toast==='function')toast('Please login to continue to the partner service');
      try{if(typeof loginChoice==='function')loginChoice();else if(typeof account==='function')account();else location.href='/preview-member-login-v2.html?return='+encodeURIComponent(location.pathname+location.search)}catch(e){try{location.href='/preview-member-login-v2.html'}catch(_){}}
      return;
    }
    const s=sectionById(id);if(!s)return typeof toast==='function'&&toast('Section not found');
    // Resolve the shared Owner-configured destination before committing a redirect.
    // Cached device-specific links may be stale from an older release.
    if(!window.DBEST_PUBLIC_LINKS && window.DBEST_OWNER_CONTROL_LIVE?.refreshPublic){
      try{await window.DBEST_OWNER_CONTROL_LIVE.refreshPublic()}catch(e){console.warn('Partner link refresh deferred',e)}
    }
    const idx=Number.isInteger(i)?i:null,l=linkFor(id,idx);
    if(!l?.url||l.enabled===false)return typeof toast==='function'&&toast('Deeplink is not configured or is disabled');
    const sub=idx!==null?(s[5]?.[idx]||'External Partner Transaction'):'External Partner Transaction';
    const userId=String(activeSession?.id||'guest');
    let txId='';
    let url=String(l.url).trim();
    // Reject unsafe or malformed Owner-configured URLs BEFORE logging a pending
    // partner transaction. Pending ledger rows represent an actual handoff.
    const parsed=new URL(url,location.href);
    if(!['https:','http:'].includes(parsed.protocol))throw new Error('Unsafe partner destination protocol');
    // Tracking must never prevent a valid partner handoff.
    try{
      if(typeof addTx==='function'&&activeSession?.id){
        const x=addTx(activeSession.id,s[1],sub,'','Redirected / Pending',l.partner||'',{details:'External partner deeplink initiated',source:'Partner Deeplink',partnerUrl:l.url,sectionId:id,subIndex:idx,buttonLabel:l.buttonLabel||''});
        txId=String(x?.id||'');
        if(x)x.partnerUrl=url;
        if(typeof save==='function')save();
      }
    }catch(trackErr){console.warn('DBest deeplink tracking skipped',trackErr)}
    url=url.replaceAll('{DBEST_TX_ID}',encodeURIComponent(txId)).replaceAll('{USER_ID}',encodeURIComponent(userId)).replaceAll('{SECTION_ID}',encodeURIComponent(String(id))).replaceAll('{SUBSECTION}',encodeURIComponent(String(sub)));
    // Do not append arbitrary DBest parameters to a third-party affiliate
    // URL. InsuranceDekho's source/sub-source and NJ Wealth's short-link
    // path are partner-owned and must be transmitted exactly as configured.
    // An Owner-authored placeholder is the ONLY opt-in for external tracking.
    const u=new URL(url,location.href);
    if(!['https:','http:'].includes(u.protocol))throw new Error('Unsafe partner destination protocol');
    url=u.href;
    // Same-tab navigation avoids Android popup blockers and stays on the
    // user-clicked, Owner-approved partner URL.
    try{window.location.assign(url)}catch(navErr){window.location.href=url}
  }catch(err){console.error(err);if(typeof toast==='function')toast('Could not open partner destination')}
};
function deeplinkCard(id,i){
  const s=sectionById(id),l=linkFor(id,i);if(!s||!l?.url||l.enabled===false)return '';
  const inherited=Number.isInteger(i)&&!(window.DBEST_PUBLIC_LINKS?.[keyFor(id,i)]?.url||(typeof links!=='undefined'&&links?.[keyFor(id,i)]?.url));
  return `<div data-dbest-universal-deeplink="1" class="card" style="margin:10px 0 14px;border:1px solid #cfe0ff;background:linear-gradient(135deg,#f7faff,#eef4ff)"><small>🔗 DBest Partner Deeplink${inherited?' • Section default':''}</small><b style="font-size:17px;margin-top:4px">${esc2(l.partner||s[1]+' Partner')}</b><small>Tracked with a DBest Internal Transaction ID.</small><button class="btn" style="margin-top:9px" onclick="dbestUniversalExternalGo('${esc2(id)}'${Number.isInteger(i)?','+i:''})">${esc2(l.buttonLabel||'Continue to Partner')} ↗</button></div>`;
}
function injectNow(id,i){
  try{
    const h=deeplinkCard(id,i);if(!h)return false;
    const roots=[...document.querySelectorAll('.sectionContent')];
    const root=roots.filter(el=>{try{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&(r.width||r.height)}catch(e){return false}}).pop()||roots.pop();
    if(!root)return false;
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
function inject(id,i){
  [35,180,600,1400].forEach(ms=>setTimeout(()=>injectNow(id,i),ms));
  // Fresh devices may have no local d2_links yet. Pull the shared Owner config,
  // then render again so deeplinks never depend on browser-local history.
  [60,450,1200,2400].forEach(ms=>setTimeout(()=>{
    try{
      const p=window.DBEST_OWNER_CONTROL_LIVE?.refreshPublic?.();
      if(p&&typeof p.then==='function')p.finally(()=>injectNow(id,i));
      else injectNow(id,i);
    }catch(e){injectNow(id,i)}
  },ms));
}
const baseOpenService=window.openService;
if(typeof baseOpenService==='function')window.openService=function(id){const out=baseOpenService.apply(this,arguments);inject(id,null);return out};
const baseOpenContent=window.openContentForm;
if(typeof baseOpenContent==='function')window.openContentForm=function(id,i){
  // The core legacy form does not recognize "travel" as an external partner
  // service. Route its Hotel/Package subsections to the inherited DBest Fly
  // destination, while preserving native flows for every other service.
  if(String(id)==='travel'){
    const selected=linkFor(id,Number(i));
    if(selected?.url){
      if(selected.enabled===false){if(typeof toast==='function')toast('Partner handoff is disabled by Owner');return}
      return window.dbestUniversalExternalGo?.(id,Number(i));
    }
    // An Owner link may not have loaded on first navigation.
    const refresh=window.DBEST_OWNER_CONTROL_LIVE?.refreshPublic;
    if(typeof refresh==='function'){
      Promise.resolve(refresh()).then(()=>{
        const ready=linkFor(id,Number(i));
        if(ready?.url&&ready.enabled!==false)window.dbestUniversalExternalGo?.(id,Number(i));
        else if(typeof toast==='function')toast('Hotel partner destination is not configured or is disabled');
      }).catch(()=>{if(typeof toast==='function')toast('Could not load Hotel partner destination')});
      return;
    }
  }
  const out=baseOpenContent.apply(this,arguments);
  inject(id,Number(i));
  return out
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