(function(){
'use strict';
const VERSION='1.0.0';
const MEMBER_ROLES=new Set(['guest','promoter','prime','leader']);
const recent=new Map();
let lastCreatedAt=0;

function sid(){try{return typeof session!=='undefined'?String(session?.id||''):''}catch(e){return''}}
function role(){try{return typeof session!=='undefined'?String(session?.role||''):''}catch(e){return''}}
function isMember(){return MEMBER_ROLES.has(role())&&!!sid()}
function ownTxs(){try{return (typeof txs!=='undefined'&&Array.isArray(txs)?txs:[]).filter(x=>String(x?.userId||'')===sid())}catch(e){return[]}}
function visible(el){if(!el)return false;try{const s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden')return false;const r=el.getBoundingClientRect();return !!(r.width||r.height)}catch(e){return false}}
function root(){try{const a=[...document.querySelectorAll('.sectionContent')].filter(visible);return a.pop()||null}catch(e){return null}}
function clean(s){return String(s||'').replace(/\s+/g,' ').trim().slice(0,180)}
function context(target){
  const r=root();
  let section=clean(r?.querySelector?.('.sectionHero b')?.textContent||r?.querySelector?.('.memberMiniHead b')?.textContent||r?.querySelector?.('h1,h2')?.textContent||'DBest Service');
  let sub='Service Transaction';
  const box=target?.closest?.('.sub,.card,.payCard,.orderStatusCard,.f,form');
  const label=clean(box?.querySelector?.('b,h3,h4,label')?.textContent||target?.textContent||'');
  if(label)sub=label;
  if(!section||/dashboard|owner|login|profile/i.test(section))section='DBest Service';
  return {section,sub};
}
function amountFrom(target){
  try{
    const form=target?.closest?.('form');
    const fields=form?[...form.querySelectorAll('input,select')]:[];
    for(const f of fields){
      const n=String(f.name||f.id||f.placeholder||'');
      if(/amount|total|price|premium|fare|cost|payable/i.test(n)){
        const v=Number(String(f.value||'').replace(/[^0-9.]/g,''));if(Number.isFinite(v)&&v>0)return v;
      }
    }
    const txt=clean(form?.innerText||target?.closest?.('.card,.payCard,.orderStatusCard')?.innerText||'');
    const m=txt.match(/₹\s*([0-9][0-9,]*(?:\.\d+)?)/);if(m){const v=Number(m[1].replace(/,/g,''));if(Number.isFinite(v))return v}
  }catch(e){}
  return 0;
}
function fingerprint(section,sub,source,url){return [sid(),clean(section),clean(sub),clean(source),clean(url)].join('|').toLowerCase()}
function duplicate(fp,ms=2500){const now=Date.now(),prev=recent.get(fp)||0;recent.set(fp,now);for(const [k,t] of recent){if(now-t>30000)recent.delete(k)}return now-prev<ms}
function newestAfter(beforeIds){const rows=ownTxs();for(let i=rows.length-1;i>=0;i--){const x=rows[i];if(!beforeIds.has(String(x?.id||'')))return x}return null}
async function persist(x){
  if(!x)return;
  try{typeof save==='function'&&save()}catch(e){}
  try{await window.DBEST_TRANSACTION_LEDGER?.record?.(x)}catch(e){}
  try{setTimeout(()=>window.DBEST_TRANSACTION_LEDGER?.syncAll?.(false),50)}catch(e){}
}
function createTx({section,sub,amount=0,status='Initiated',partner='',source='DBest',details='',url='',meta={}}){
  if(!isMember())return null;
  const fp=fingerprint(section,sub,source,url||details);if(duplicate(fp))return null;
  const before=new Set(ownTxs().map(x=>String(x?.id||'')));
  let x=null;
  try{
    if(typeof addTx==='function')x=addTx(sid(),clean(section)||'DBest Service',clean(sub)||'Service Transaction',Number(amount||0),status,clean(partner),{details:clean(details),source,partnerUrl:url||'',...meta});
  }catch(e){console.warn('DBest transaction capture addTx',e)}
  if(!x)x=newestAfter(before);
  if(!x){
    const id='DBT-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,7).toUpperCase();
    x={id,internalTransactionId:id,userId:sid(),section:clean(section)||'DBest Service',sub:clean(sub)||'Service Transaction',amount:Number(amount||0),status,partner:clean(partner),details:clean(details),source,createdISO:new Date().toISOString(),meta:{details:clean(details),source,partnerUrl:url||'',...meta}};
    try{if(typeof txs!=='undefined'&&Array.isArray(txs))txs.push(x)}catch(e){}
  }
  lastCreatedAt=Date.now();
  persist(x);
  return x;
}
function safeExternal(raw){
  try{const u=new URL(String(raw||''),location.href);if(!/^https?:$/.test(u.protocol))return null;if(u.origin===location.origin)return null;return u}catch(e){return null}
}
function transactionalPage(){
  const r=root();if(!r||!isMember())return false;
  if(r.matches?.('.owner55,.ownerStudio,.dbestFinanceOwnerControl')||r.querySelector?.('.owner55,.ownerStudio,.dbestFinanceOwnerControl'))return false;
  const t=clean(r.innerText||'').toLowerCase();
  if(/owner operations|project owner|member login|sign in|login with|my profile|notification settings/.test(t))return false;
  return true;
}
function recordExternal(url,target,reason='External Partner'){
  const u=safeExternal(url);if(!u||!transactionalPage())return null;
  if(Date.now()-lastCreatedAt<700)return null;
  const c=context(target),partner=clean(target?.closest?.('.card,.sub')?.querySelector?.('b,h3')?.textContent||u.hostname.replace(/^www\./,''));
  return createTx({section:c.section,sub:c.sub||'External Partner Transaction',amount:amountFrom(target),status:'Redirected / Pending',partner,source:'External Partner',details:reason,url:u.toString(),meta:{external:true}});
}

const nativeOpen=window.open;
if(typeof nativeOpen==='function'&&!nativeOpen.__dbestUniversalTx){
  const wrapped=function(url){try{recordExternal(url,document.activeElement,'External destination opened')}catch(e){}return nativeOpen.apply(this,arguments)};
  wrapped.__dbestUniversalTx=true;window.open=wrapped;
}

document.addEventListener('click',function(e){
  if(!isMember())return;
  const a=e.target.closest?.('a[href]');
  if(a){const u=safeExternal(a.href);if(u)setTimeout(()=>recordExternal(u.toString(),a,'External link opened'),0);return}
  const b=e.target.closest?.('button,[role="button"]');if(!b||!transactionalPage())return;
  if(b.closest?.('[data-dbest-universal-deeplink]')||/dbestUniversalExternalGo/.test(String(b.getAttribute?.('onclick')||'')))return;
  if(String(b.getAttribute?.('type')||'').toLowerCase()==='submit'||b.closest?.('form'))return;
  const label=clean(b.textContent||b.getAttribute?.('aria-label')||'');
  if(!/(^|\b)(pay|book|buy|purchase|checkout|place order|confirm order|apply|invest|renew|submit request|send request|proceed to payment)(\b|$)/i.test(label))return;
  const before=new Set(ownTxs().map(x=>String(x?.id||'')));
  setTimeout(()=>{if(newestAfter(before))return;const c=context(b);createTx({section:c.section,sub:c.sub,amount:amountFrom(b),status:'Initiated',source:'DBest Internal',details:label,meta:{fallbackCapture:true}})},300);
},true);

document.addEventListener('submit',function(e){
  if(!isMember()||!transactionalPage())return;
  const form=e.target;if(!(form instanceof HTMLFormElement))return;
  if(form.closest?.('.owner55,.ownerStudio,.dbestFinanceOwnerControl'))return;
  const txt=clean(form.innerText||'');if(/login|sign in|search|filter/i.test(txt)&&!/(pay|book|buy|order|apply|request|checkout|confirm|invest|renew)/i.test(txt))return;
  const before=new Set(ownTxs().map(x=>String(x?.id||'')));
  setTimeout(()=>{if(newestAfter(before))return;const c=context(form);createTx({section:c.section,sub:c.sub,amount:amountFrom(form),status:'Submitted / Pending',source:'DBest Internal',details:'Service request submitted',meta:{fallbackCapture:true,form:true}})},350);
},true);

function installUniversalGuard(){
  const fn=window.dbestUniversalExternalGo;
  if(typeof fn!=='function'||fn.__dbestUniversalTxGuard)return false;
  const wrapped=function(id,i){
    const before=new Set(ownTxs().map(x=>String(x?.id||'')));
    const out=fn.apply(this,arguments);
    setTimeout(()=>{
      if(!isMember()||newestAfter(before))return;
      let s=null;try{s=(typeof services!=='undefined'&&Array.isArray(services))?services.find(v=>String(v?.[0])===String(id)):null}catch(e){}
      const idx=Number.isInteger(i)?i:null,section=clean(s?.[1]||'DBest Service'),sub=clean(idx!==null?s?.[5]?.[idx]||'External Partner Transaction':'External Partner Transaction');
      let l=null;try{l=window.DBEST_UNIVERSAL_DEEPLINKS?.linkFor?.(id,idx)}catch(e){}
      createTx({section,sub,status:'Redirected / Pending',partner:clean(l?.partner||''),source:'External Partner',details:'Partner transaction initiated',url:String(l?.url||''),meta:{sectionId:id,subIndex:idx,fallbackCapture:true}});
    },120);
    return out;
  };
  wrapped.__dbestUniversalTxGuard=true;window.dbestUniversalExternalGo=wrapped;return true;
}
async function reconcile(){
  if(!isMember())return;
  try{await window.DBEST_TRANSACTION_LEDGER?.syncAll?.(false)}catch(e){}
}
let tries=0;const guard=setInterval(()=>{tries++;installUniversalGuard();if(tries>=20)clearInterval(guard)},500);
setTimeout(installUniversalGuard,0);
setTimeout(reconcile,900);
setInterval(reconcile,15000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)reconcile()});
window.DBEST_UNIVERSAL_TRANSACTION_CAPTURE={version:VERSION,reconcile,create:createTx,recordExternal};
})();
