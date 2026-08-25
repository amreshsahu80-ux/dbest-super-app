(function(){
'use strict';
const VERSION='1.0.0';
function replaceText(text){return String(text||'')
 .replace(/DBest\s+Partner\s+Deeplinks?/gi,'DBest Partner Access')
 .replace(/Partner\s+Deeplinks?/gi,'Partner Links')
 .replace(/Deeplink\s+Integration/gi,'Partner Link Integration')
 .replace(/Deeplinks/gi,'Partner Links')
 .replace(/Deeplink/gi,'Partner Link');}
function cleanNode(root){
 if(!root)return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){const p=node.parentElement;if(!p||/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/i.test(p.tagName))return NodeFilter.FILTER_REJECT;return /deeplink/i.test(node.nodeValue||'')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});
 const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(n=>{n.nodeValue=replaceText(n.nodeValue)});
 root.querySelectorAll?.('[title],[aria-label],[placeholder]').forEach(el=>{for(const a of ['title','aria-label','placeholder']){const v=el.getAttribute(a);if(v&&/deeplink/i.test(v))el.setAttribute(a,replaceText(v))}});
}
function removeFloatingTransactions(){
 document.getElementById('dbestLedgerFloating')?.remove();
 document.querySelectorAll('button').forEach(b=>{const t=(b.textContent||'').trim();if(/^🧾?\s*Transactions$/i.test(t)&&b.style.position==='fixed')b.remove()});
}
function installStyle(){if(document.getElementById('dbestPlainUiStyle'))return;const s=document.createElement('style');s.id='dbestPlainUiStyle';s.textContent='#dbestLedgerFloating{display:none!important}';document.head.appendChild(s)}
function apply(){installStyle();removeFloatingTransactions();cleanNode(document.body)}
let timer=null;const schedule=()=>{clearTimeout(timer);timer=setTimeout(apply,35)};
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
document.addEventListener('click',()=>setTimeout(apply,60),true);
[0,120,500,1200].forEach(ms=>setTimeout(apply,ms));
window.DBEST_PLAIN_LANGUAGE_UI={version:VERSION,apply};
})();