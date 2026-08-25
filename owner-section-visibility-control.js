(function(){
'use strict';
const VERSION='1.0.0';
const ROOT_KEY='__visibilityV2';
let applying=false,uiTimer=null;

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function owner(){try{return typeof session!=='undefined'&&session?.role==='owner'}catch(e){return false}}
function store(){
  try{
    if(typeof serviceControl!=='undefined'&&serviceControl&&typeof serviceControl==='object'){
      if(!serviceControl[ROOT_KEY]||typeof serviceControl[ROOT_KEY]!=='object')serviceControl[ROOT_KEY]={sections:{},subsections:{}};
      serviceControl[ROOT_KEY].sections=serviceControl[ROOT_KEY].sections||{};
      serviceControl[ROOT_KEY].subsections=serviceControl[ROOT_KEY].subsections||{};
      return serviceControl[ROOT_KEY];
    }
  }catch(e){}
  window.serviceControl=window.serviceControl||{};
  window.serviceControl[ROOT_KEY]=window.serviceControl[ROOT_KEY]||{sections:{},subsections:{}};
  return window.serviceControl[ROOT_KEY];
}
function sectionEnabled(id){const v=store().sections[String(id)];return v!==false}
function subsectionEnabled(id,i){if(!sectionEnabled(id))return false;const v=store().subsections[`${id}::${Number(i)}`];return v!==false}
function sectionRows(){try{return typeof services!=='undefined'&&Array.isArray(services)?services:[]}catch(e){return[]}}
function findService(id){return sectionRows().find(s=>String(s?.[0])===String(id))||null}
function parseOpenService(el){const s=String(el?.getAttribute?.('onclick')||'');const m=s.match(/openService\(\s*['"]([^'"]+)['"]\s*\)/);return m?m[1]:''}
function parseOpenSub(el){const s=String(el?.getAttribute?.('onclick')||'');const m=s.match(/openContentForm\(\s*['"]([^'"]+)['"]\s*,\s*(\d+)\s*\)/);return m?{id:m[1],i:Number(m[2])}:null}
function hide(el,flag){if(!el)return; if(flag){if(el.dataset.dbestVisibilityPrevDisplay===undefined)el.dataset.dbestVisibilityPrevDisplay=el.style.display||'';el.style.setProperty('display','none','important');el.setAttribute('data-dbest-disabled-by-owner','1')}else if(el.getAttribute('data-dbest-disabled-by-owner')==='1'){el.style.display=el.dataset.dbestVisibilityPrevDisplay||'';delete el.dataset.dbestVisibilityPrevDisplay;el.removeAttribute('data-dbest-disabled-by-owner')}}
function isOwnerControlScreen(){try{const roots=[...document.querySelectorAll('.sectionContent')];return roots.some(r=>/Section & Subsection Visibility|Owner Operations|Project Owner Console|Master Control/i.test(r.innerText||''))}catch(e){return false}}
function applyVisibility(){
  if(applying)return;applying=true;
  try{
    if(owner()&&isOwnerControlScreen())return;
    document.querySelectorAll('[onclick*="openService("]').forEach(el=>{const id=parseOpenService(el);if(id)hide(el,!sectionEnabled(id))});
    document.querySelectorAll('[onclick*="openContentForm("]').forEach(el=>{const p=parseOpenSub(el);if(p)hide(el,!subsectionEnabled(p.id,p.i))});
  }catch(e){console.warn('DBest visibility apply',e)}finally{applying=false}
}
async function persist(){
  try{typeof save==='function'&&save()}catch(e){}
  try{await window.DBEST_OWNER_CONTROL_LIVE?.syncOwnerSettings?.()}catch(e){console.warn('DBest visibility sync',e?.message||e)}
}
function setSection(id,on){store().sections[String(id)]=!!on;persist();applyVisibility();setTimeout(renderControl,20)}
function setSubsection(id,i,on){store().subsections[`${id}::${Number(i)}`]=!!on;persist();applyVisibility();setTimeout(renderControl,20)}
function sectionCard(s){
  const id=String(s?.[0]||''),title=String(s?.[1]||id),icon=String(s?.[2]||'◻️'),subs=Array.isArray(s?.[5])?s[5]:[],on=sectionEnabled(id);
  return `<div class="card" style="padding:14px;border:1px solid ${on?'#cfe0ff':'#ead0d0'};background:${on?'#f8fbff':'#fff8f8'}">
    <div style="display:flex;align-items:center;gap:10px"><div style="font-size:22px">${esc(icon)}</div><div style="flex:1"><b>${esc(title)}</b><small>${on?'Visible on main platform':'Hidden from main platform'}</small></div><label style="display:flex;align-items:center;gap:7px;font-weight:800"><input type="checkbox" ${on?'checked':''} onchange="DBEST_SECTION_VISIBILITY.setSection('${esc(id)}',this.checked)"> ${on?'Enabled':'Disabled'}</label></div>
    ${subs.length?`<div style="margin-top:12px;border-top:1px solid #e5eaf2;padding-top:10px;display:grid;gap:8px">${subs.map((sub,i)=>{const son=subsectionEnabled(id,i);return `<label style="display:flex;align-items:center;gap:9px;padding:8px 10px;border:1px solid #e8edf5;border-radius:10px;background:#fff;opacity:${on?1:.55}"><input type="checkbox" ${son?'checked':''} ${on?'':'disabled'} onchange="DBEST_SECTION_VISIBILITY.setSubsection('${esc(id)}',${i},this.checked)"><span style="flex:1"><b style="font-size:13px">${esc(sub)}</b><small>${son?'Visible':'Hidden'}</small></span></label>`}).join('')}</div>`:'<small style="display:block;margin-top:10px">No subsections configured.</small>'}
  </div>`
}
function renderControl(){
  if(!owner())return;
  try{
    if(typeof sectionScreen!=='function'||typeof sectionTopBar!=='function')return;
    const rows=sectionRows();
    const enabled=rows.filter(s=>sectionEnabled(s?.[0])).length,disabled=rows.length-enabled;
    sectionScreen(`${sectionTopBar('👁️ Section & Subsection Visibility','Owner controls what members can see on the main DBest platform','ownerOperations()')}<div class="sectionContent ownerStudio"><div class="notice" style="margin-bottom:12px"><b>Live Platform Visibility</b><br><small>Disable any complete section or only selected subsections. Changes are saved centrally and reflected on the member super-platform after configuration refresh/reopen.</small></div><div class="kpis"><div class="kpi"><small>Total Sections</small><b>${rows.length}</b></div><div class="kpi"><small>Enabled</small><b>${enabled}</b></div><div class="kpi"><small>Disabled</small><b>${disabled}</b></div></div><div style="display:grid;gap:10px;margin-top:14px">${rows.map(sectionCard).join('')}</div></div>`)
  }catch(e){console.warn('DBest visibility control render',e)}
}
function injectOwnerEntry(){
  if(!owner())return;
  try{
    const roots=[...document.querySelectorAll('.sectionContent')];
    const root=roots.find(r=>/Owner Operations|Project Owner Console|Master Control/i.test(r.innerText||''));
    if(!root||root.querySelector('#dbestSectionVisibilityOwnerButton'))return;
    const b=document.createElement('button');b.id='dbestSectionVisibilityOwnerButton';b.className='sub';b.style.cssText='border:1px solid #cfe0ff;background:#f6f9ff';b.innerHTML='<b>👁️ Section Visibility</b><small>Enable / disable sections & subsections</small>';b.onclick=renderControl;
    const holder=root.querySelector('.subs,.cards');if(holder)holder.prepend(b);else root.prepend(b)
  }catch(e){}
}
function installOwnerHook(){
  try{
    const fn=window.ownerOperations;if(typeof fn!=='function'||fn.__dbestVisibilityWrapped)return;
    const w=function(){const out=fn.apply(this,arguments);setTimeout(injectOwnerEntry,40);return out};w.__dbestVisibilityWrapped=true;window.ownerOperations=w
  }catch(e){}
}
function maintain(){installOwnerHook();injectOwnerEntry();applyVisibility()}
const rawApply=window.applyServiceControl;
window.applyServiceControl=function(){let out;try{if(typeof rawApply==='function')out=rawApply.apply(this,arguments)}catch(e){}setTimeout(applyVisibility,0);return out};
const obs=new MutationObserver(()=>{clearTimeout(uiTimer);uiTimer=setTimeout(maintain,35)});obs.observe(document.documentElement,{childList:true,subtree:true});
[80,350,900,1800].forEach(ms=>setTimeout(maintain,ms));
window.addEventListener('focus',()=>setTimeout(applyVisibility,80));
window.DBEST_SECTION_VISIBILITY={version:VERSION,apply:applyVisibility,open:renderControl,setSection,setSubsection,isSectionEnabled:sectionEnabled,isSubsectionEnabled:subsectionEnabled};
})();