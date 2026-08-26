(function(){
'use strict';
const VERSION='1.0.0';
const CANDIDATES='.notice,.hint,.helper,.helpText,.help-text,.instruction,.instructions,.guidance,.guide,.sectionDescription,.section-description,.sectionDesc,.section-desc,.subtext,.microcopy,.infoText,.info-text,.emptyHint,.empty-hint,.callout,p';
const IMPLEMENTATION=/\b(phase\s*\d+|backend|server[- ]?(?:side|calculated)|implementation|architecture|child order(?:s)?|delivery group(?:s)?|same backend|dispatcher|bridge|database|api\b|technical flow|internal flow|production flow|sync(?:ed|ing)? with backend|under the hood)\b/i;
const DIRECTIONAL=/\b(please|tap|click|select|choose|use this|use the|once you|after you|before you|to continue|to proceed|you can|can now|will be|this section|this page|open the|login to|go to|first|next|then|follow these|how it works)\b/i;
const CRITICAL=/\b(error|failed|warning|important|required|mandatory|otp|payment|refund|cancel(?:lation)?|kyc|document|verification|approval|consent|terms|privacy|policy|agreement|claim|safety|security|permission|not available|unavailable|expires?|validity|eligible|eligibility|tax|gst|pan|aadhaar|amount|price|charge|fee)\b|₹/i;
const PROTECTED=/agreement|terms|privacy|legal|policy|invoice|receipt|quotation|payslip|certificate|consent|disclaimer/i;
function text(el){return String(el?.innerText||el?.textContent||'').replace(/\s+/g,' ').trim()}
function sig(s){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return String(h)}
function isProtected(el){let n=el;for(let i=0;n&&i<5;i++,n=n.parentElement){const k=`${n.id||''} ${n.className||''} ${n.getAttribute?.('data-section')||''}`;if(PROTECTED.test(k))return true}return false}
function hasControls(el){return !!el.querySelector?.('button,input,select,textarea,table,iframe,video,a[href]')}
function eligibleParagraph(el,t){if(el.tagName!=='P')return true;if(t.length<95)return false;const k=`${el.className||''} ${el.parentElement?.className||''}`;return /notice|help|hint|instruction|guide|info|section|form|card|panel|content/i.test(k)&&(DIRECTIONAL.test(t)||IMPLEMENTATION.test(t)||t.length>210)}
function compact(el,label){
 const html=el.innerHTML;
 el.dataset.dbestConcise='1';
 el.dataset.dbestConciseSig=sig(text(el));
 el.classList.add('dbestConciseShell');
 el.innerHTML=`<details class="dbestConciseDetails"><summary>${label}</summary><div class="dbestConciseBody">${html}</div></details>`;
}
function removeImplementation(el){el.dataset.dbestConcise='removed';el.style.display='none';el.setAttribute('aria-hidden','true')}
function process(el){
 if(!el||el.closest?.('.dbestConciseDetails'))return;
 if(isProtected(el)||hasControls(el))return;
 const t=text(el);if(!t||t.length<40)return;
 if(!eligibleParagraph(el,t))return;
 const s=sig(t);if(el.dataset.dbestConciseSig===s)return;
 if(IMPLEMENTATION.test(t)&&!CRITICAL.test(t)){removeImplementation(el);return}
 const critical=CRITICAL.test(t);
 if(t.length>165||(DIRECTIONAL.test(t)&&t.length>100)||(critical&&t.length>135))compact(el,critical?'⚠ Important':'ℹ Info');
 else el.dataset.dbestConciseSig=s;
}
function cleanupTechnicalFragments(){
 document.querySelectorAll('.sectionContent,.shopPage,.screenContent,.modalContent,.ownerPanel,.vendorDashboard,#dash').forEach(root=>{
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){const p=n.parentElement;if(!p||/^(SCRIPT|STYLE|TEXTAREA|OPTION)$/i.test(p.tagName)||p.closest('.dbestConciseDetails'))return NodeFilter.FILTER_REJECT;const v=String(n.nodeValue||'');return /\b(Phase\s*\d+|server-calculated|server calculated|same backend|child order\(s\)|child orders|delivery group|backend flow)\b/i.test(v)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(n=>{const p=n.parentElement;if(!p||isProtected(p))return;let v=String(n.nodeValue||'');v=v.replace(/\bPhase\s*\d+\s*:?\s*/gi,'').replace(/\bserver[- ]calculated\b/gi,'calculated').replace(/\bVendor child order\(s\)\b/gi,'Store orders').replace(/\bVendor child orders\b/gi,'Store orders');n.nodeValue=v})
 })
}
function installStyle(){if(document.getElementById('dbestPlatformConciseStyle'))return;const s=document.createElement('style');s.id='dbestPlatformConciseStyle';s.textContent=`
.dbestConciseShell{padding:0!important;margin:6px 0!important;background:transparent!important;border:0!important;box-shadow:none!important;min-height:0!important}
.dbestConciseDetails{display:inline-block;max-width:100%;margin:2px 0}
.dbestConciseDetails>summary{list-style:none;cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:7px 10px;border-radius:999px;background:#eef4ff;color:#2458a6;font-size:12px;font-weight:800;border:1px solid #d8e5f8;user-select:none}
.dbestConciseDetails>summary::-webkit-details-marker{display:none}
.dbestConciseDetails[open]{display:block;width:100%}
.dbestConciseDetails[open]>summary{margin-bottom:7px}
.dbestConciseBody{padding:10px 12px;border-radius:12px;background:#f8fbff;border:1px solid #e2eaf5;color:inherit;font-size:13px;line-height:1.45}
.sectionContent .notice,.shopPage .notice{line-height:1.35}
@media(max-width:600px){.dbestConciseBody{font-size:12px}.sectionContent h2,.sectionContent h3{line-height:1.18}}
`;document.head.appendChild(s)}
function apply(root=document){installStyle();const scope=root.querySelectorAll?root:document;scope.querySelectorAll?.(CANDIDATES).forEach(process);cleanupTechnicalFragments()}
let timer;function schedule(){clearTimeout(timer);timer=setTimeout(()=>apply(document),70)}
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
document.addEventListener('click',()=>setTimeout(()=>apply(document),90),true);
[0,150,500,1100,2200,4500,8000].forEach(ms=>setTimeout(()=>apply(document),ms));
window.DBEST_CONCISE_UI={version:VERSION,apply};
})();