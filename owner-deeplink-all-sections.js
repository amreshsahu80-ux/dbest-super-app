(function(){
'use strict';
const VERSION='2.5.0-verified-partner-handoffs';
const PARTNER_IDS=new Set(['insurance','flights','travel','mf']);
let lastLaunch='',lastLaunchAt=0;
const esc2=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const keyFor=(id,i)=>Number.isInteger(i)?`${id}::${i}`:String(id||'');
function linkFor(id,i){
 try{
  const k=String(id||''),c=(window.DBEST_PUBLIC_LINKS&&typeof window.DBEST_PUBLIC_LINKS==='object'&&!Array.isArray(window.DBEST_PUBLIC_LINKS))?window.DBEST_PUBLIC_LINKS:null;
  if(c){
   const sub=Number.isInteger(i)?keyFor(k,i):null;
   if(sub&&Object.prototype.hasOwnProperty.call(c,sub))return c[sub]||null;
   if(Object.prototype.hasOwnProperty.call(c,k))return c[k]||null;
   // Live Owner settings override stale links in a different browser profile.
   if(PARTNER_IDS.has(k))return null;
  }
  if(Number.isInteger(i)&&typeof links!=='undefined'&&links?.[keyFor(k,i)]?.url)return links[keyFor(k,i)];
  return typeof links!=='undefined'?(links?.[k]||null):null;
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
  const cached=(()=>{try{return JSON.parse(localStorage.getItem('d2_session')||'{}')}catch(e){return{}}})();
  const user=(window.session&&window.session.id)?window.session:cached;
  if(!user?.id||user.role==='visitor'){
   if(typeof toast==='function')toast('Please login to continue to the partner service');
   try{if(typeof loginChoice==='function')loginChoice();else if(typeof account==='function')account();else location.href='/preview-member-login-v2.html?return='+encodeURIComponent(location.pathname+location.search)}catch(e){try{location.href='/preview-member-login-v2.html'}catch(_){}}
   return;
  }
  const s=sectionById(id);if(!s)return typeof toast==='function'&&toast('Section not found');
  const idx=Number.isInteger(i)?i:null,l=linkFor(id,idx);
  if(!l?.url||l.enabled===false)return typeof toast==='function'&&toast('Partner deeplink is not configured or is disabled');
  let dest;
  try{dest=new URL(String(l.url),location.href);if(dest.protocol!=='https:')throw Error('https_required')}
  catch(e){if(typeof toast==='function')toast('Partner destination is invalid. Please contact DBest support.');return}
  const key=keyFor(id,idx);
  if(lastLaunch===key&&Date.now()-lastLaunchAt<1700)return;
  lastLaunch=key;lastLaunchAt=Date.now();
  const sub=idx!==null?(s[5]?.[idx]||'External Partner Transaction'):'External Partner Transaction',uid=String(user.id);
  let txId='',tracked=null;
  // A pending handoff is not a successful policy, booking or investment.
  try{
   if(typeof addTx==='function'){
    tracked=addTx(user.id,s[1],sub,'','Redirected / Pending',l.partner||'',{details:'External partner deeplink initiated',source:'Partner Deeplink',partnerUrl:l.url,sectionId:id,subIndex:idx,buttonLabel:l.buttonLabel||''});
    txId=String(tracked?.id||'');
    if(tracked)tracked.partnerUrl=dest.toString();
    if(typeof save==='function')save();
   }
  }catch(e){console.warn('DBest partner handoff tracking skipped',e)}
  const raw=dest.toString().replaceAll('{DBEST_TX_ID}',encodeURIComponent(txId)).replaceAll('{USER_ID}',encodeURIComponent(uid)).replaceAll('{SECTION_ID}',encodeURIComponent(String(id))).replaceAll('{SUBSECTION}',encodeURIComponent(String(sub)));
  dest=new URL(raw,location.href);
  // Preserve exact partner referral/source query parameters.
  if(txId)dest.searchParams.set('dbest_tx_id',txId);
  dest.searchParams.set('dbest_user_id',uid);
  dest.searchParams.set('dbest_section',String(id));
  dest.searchParams.set('dbest_subsection',String(sub));
  const url=dest.toString();
  const navigate=()=>{try{window.location.assign(url)}catch(e){try{window.location.href=url}catch(nav){console.error('DBest handoff navigation failed',nav)}}};
  try{
   // Navigating immediately can cancel the signed-in member's network ledger write.
   // Bound the wait so external partner access still works if the ledger is unavailable.
   const fn=tracked&&window.DBEST_TRANSACTION_LEDGER?.record;
   if(typeof fn==='function'&&window.DBEST_MEMBER_LIVE?.getToken?.()){
    const writing=Promise.resolve().then(()=>fn(tracked)).catch(e=>{console.warn('Handoff ledger unavailable',e?.message||e)});
    Promise.race([writing,new Promise(resolve=>setTimeout(resolve,1100))]).then(navigate,navigate);
   }else navigate();
  }catch(e){navigate()}
 }catch(e){console.error(e);if(typeof toast==='function')toast('Could not open partner destination')}
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
    const expected=String(sectionById(id)?.[1]||'').trim().toLowerCase();
    const heroText=String(root.querySelector('.sectionHero b')?.textContent||'').trim().toLowerCase();
    if(!expected||!heroText||heroText!==expected)return false;
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
 [35,180,550].forEach(ms=>setTimeout(()=>injectNow(id,i),ms));
 // One fresh settings request rather than repeated requests and stale cards.
 if(!window.DBEST_PUBLIC_LINKS)setTimeout(()=>{
  try{
   const p=window.DBEST_OWNER_CONTROL_LIVE?.refreshPublic?.();
   if(p&&typeof p.finally==='function')p.finally(()=>injectNow(id,i));
  }catch(e){console.warn('Partner link refresh unavailable',e)}
 },60);
}
const baseOpenService=window.openService;
if(typeof baseOpenService==='function')window.openService=function(id){
 const out=baseOpenService.apply(this,arguments);
 if(PARTNER_IDS.has(String(id)))inject(id,null);
 return out;
};
const baseOpenContent=window.openContentForm;
if(typeof baseOpenContent==='function')window.openContentForm=function(id,i){
 if(!PARTNER_IDS.has(String(id)))return baseOpenContent.apply(this,arguments);
 const s=sectionById(id),idx=Number(i);
 if(!s||!Number.isInteger(idx)||idx<0||idx>=s[5]?.length)return;
 // No Insurance, Hotel, Flight or Mutual Fund click may enter a DBest payment form
 // just because the centrally configured partner URL has not arrived yet.
 const launch=()=>{
  const l=linkFor(id,idx);
  if(l?.url&&l.enabled!==false)return window.dbestUniversalExternalGo?.(id,idx);
  if(typeof toast==='function')toast(l?.enabled===false?'Partner handoff is disabled by Owner':'Partner handoff unavailable. Please try again shortly.');
 };
 if(window.DBEST_PUBLIC_LINKS||linkFor(id,idx))return launch();
 try{
  if(typeof toast==='function')toast('Connecting to approved partner…');
  const p=window.DBEST_OWNER_CONTROL_LIVE?.refreshPublic?.();
  if(p&&typeof p.then==='function'){p.then(launch).catch(launch);return}
 }catch(e){console.warn('Partner configuration refresh',e)}
 return launch();
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
window.DBEST_UNIVERSAL_DEEPLINKS={version:VERSION,keyFor,linkFor,protectedSections:[...PARTNER_IDS]};
})();