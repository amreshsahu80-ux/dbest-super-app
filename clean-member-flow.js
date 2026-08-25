(function(){
'use strict';
const VERSION='1.0.0';
const MEMBER_ROLES=['guest','promoter','prime','leader'];
function appSession(){try{return typeof session!=='undefined'?session:null}catch(e){return null}}
function isMember(){const s=appSession();return !!(s&&MEMBER_ROLES.includes(String(s.role||'').toLowerCase()))}
function visible(el){if(!el)return false;const s=getComputedStyle(el);if(s.display==='none'||s.visibility==='hidden')return false;const r=el.getBoundingClientRect();return !!(r.width||r.height)}
function currentRoot(){const roots=[...document.querySelectorAll('.sectionContent')];return roots.filter(visible).pop()||roots.pop()||null}
function protectedScreen(root){if(!root)return true;return !!root.matches('.owner55,.ownerStudio,.classicDash,.dbestFinanceOwnerControl')||!!root.querySelector('.owner55,.ownerStudio,.memberMiniHead,.earnGrid,.ownerStudio,.dbestFinanceOwnerControl')}
function isSimpleNavCard(el){if(!el)return false;if(el.querySelector('input,select,textarea,form,table,img,video'))return false;return !!(el.matches('button.sub,button.card,.sub[onclick],.card[onclick]'))}
function trimText(root){
 if(!root||protectedScreen(root))return;
 root.classList.add('dbestCleanFlow');
 root.querySelectorAll('.sectionHero small').forEach(el=>{const t=(el.textContent||'').trim();if(t.length>24)el.style.display='none'});
 root.querySelectorAll('.sub small,.card small').forEach(el=>{const p=el.parentElement;if(isSimpleNavCard(p))el.style.display='none'});
 root.querySelectorAll('.dbestOnlyDeeplink p,.dbestShowIntro p,.dbestShowBody p').forEach(el=>el.style.display='none');
 root.querySelectorAll('.notice').forEach(el=>{
   const t=(el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
   if(/all member-facing features|integrated and ready to continue|open this service|continue through the dbest partner|content-specific application|complete the relevant details/.test(t))el.style.display='none';
 });
 root.querySelectorAll('small').forEach(el=>{
   const t=(el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
   if(/^open this service\s*→?$/.test(t)||/^integrated and ready to continue$/.test(t))el.style.display='none';
 });
}
function installStyle(){if(document.getElementById('dbestCleanFlowStyle'))return;const s=document.createElement('style');s.id='dbestCleanFlowStyle';s.textContent=`
.sectionContent.dbestCleanFlow{padding-top:10px!important}
.sectionContent.dbestCleanFlow .sectionHero{padding:15px 16px!important;margin-bottom:12px!important;border-radius:18px!important}
.sectionContent.dbestCleanFlow .sectionHero b{font-size:19px!important;line-height:1.2!important}
.sectionContent.dbestCleanFlow .subs,.sectionContent.dbestCleanFlow .cards{gap:10px!important}
.sectionContent.dbestCleanFlow .sub,.sectionContent.dbestCleanFlow .card{padding:14px!important;border-radius:16px!important;min-height:auto!important;box-shadow:0 7px 20px rgba(19,33,58,.05)!important}
.sectionContent.dbestCleanFlow .sub b,.sectionContent.dbestCleanFlow .card b{font-size:16px!important;line-height:1.25!important}
.sectionContent.dbestCleanFlow .dbestOnlyDeeplink{padding:15px!important;margin-bottom:14px!important;border-radius:18px!important}
.sectionContent.dbestCleanFlow .dbestOnlyDeeplink b{font-size:19px!important;margin:4px 0 10px!important}
.sectionContent.dbestCleanFlow .dbestOnlyDeeplink small{font-size:11px!important}
.sectionContent.dbestCleanFlow .dbestShowcase{margin:14px 0 24px!important}
.sectionContent.dbestCleanFlow .dbestShowIntro{margin-bottom:10px!important}
.sectionContent.dbestCleanFlow .dbestShowIntro h2{font-size:21px!important;margin:0!important}
.sectionContent.dbestCleanFlow .dbestShowBody{padding:11px!important}
.sectionContent.dbestCleanFlow .dbestShowBody h3{font-size:15px!important;margin:0 0 4px!important}
.sectionContent.dbestCleanFlow .dbestShowBody b{font-size:11px!important}
.sectionContent.dbestCleanFlow h3{margin:18px 0 10px!important}
@media(max-width:560px){
 .sectionContent.dbestCleanFlow{padding-left:12px!important;padding-right:12px!important}
 .sectionContent.dbestCleanFlow .sub,.sectionContent.dbestCleanFlow .card{padding:13px!important}
 .sectionContent.dbestCleanFlow .dbestShowGrid{gap:9px!important}
}
`;document.head.appendChild(s)}
function apply(){installStyle();if(!isMember())return;trimText(currentRoot())}
let timer=null;const schedule=()=>{clearTimeout(timer);timer=setTimeout(apply,40)};
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',()=>setTimeout(apply,70),true);
[0,120,500,1200].forEach(ms=>setTimeout(apply,ms));
window.DBEST_CLEAN_MEMBER_FLOW={version:VERSION,apply};
})();
