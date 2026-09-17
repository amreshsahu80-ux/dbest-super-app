(function(){
'use strict';
const REPLACEMENTS=[
 ['DBest Territory Admin Management','DBest Territory Distributor Management'],
 ['Territory Admin Management','Territory Distributor Management'],
 ['DBest Territory Admin','DBest Territory Distributor'],
 ['Territory Admins','Territory Distributors'],
 ['Territory Admin','Territory Distributor'],
 ['District Admins','District Distributors'],
 ['District Admin','District Distributor'],
 ['State Admins','State Distributors'],
 ['State Admin','State Distributor'],
 ['Zonal Admins','Zone Distributors'],
 ['Zonal Admin','Zone Distributor'],
 ['Zone Admins','Zone Distributors'],
 ['Zone Admin','Zone Distributor'],
 ['My Admin Network','My Distributor Network'],
 ['Admin Network','Distributor Network'],
 ['Admin Login','Distributor Login'],
 ['Admin ID','Distributor ID'],
 ['Admin Pool','Distributor Pool'],
 ['Admin earnings','Distributor earnings'],
 ['Admin Earnings','Distributor Earnings'],
 ['Admin onboarding','Distributor onboarding'],
 ['Admin Onboarding','Distributor Onboarding'],
 ['Create Admin Onboarding','Create Distributor Onboarding']
];
function replaceText(s){let out=String(s||'');for(const [a,b] of REPLACEMENTS)out=out.split(a).join(b);return out}
function apply(root=document.body){
 document.title=replaceText(document.title||'DBest Territory Distributor');
 if(!root)return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){const p=n.parentElement;if(!p||['SCRIPT','STYLE','NOSCRIPT'].includes(p.tagName))return NodeFilter.FILTER_REJECT;return /Admin|Territory Admin|Zonal Admin/.test(n.nodeValue||'')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});
 const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const n of nodes){const v=replaceText(n.nodeValue);if(v!==n.nodeValue)n.nodeValue=v}
 document.querySelectorAll('[title],[aria-label],[placeholder]').forEach(el=>{for(const a of ['title','aria-label','placeholder']){if(el.hasAttribute(a)){const v=replaceText(el.getAttribute(a));if(v!==el.getAttribute(a))el.setAttribute(a,v)}}});
}
let timer;const obs=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>apply(),40)});obs.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
[0,150,500,1200,2500].forEach(ms=>setTimeout(()=>apply(),ms));
window.DBEST_TERRITORY_TERMINOLOGY={replaceText,apply};
})();