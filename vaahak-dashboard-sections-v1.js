/* Presentation-only dashboard accordion. Leaves forms, IDs, event handlers and data intact. */
(function(){
'use strict';
const sections=[
 {test:/activation\s*(?:&|and)\s*agreement/i,label:'Activation & Agreement'},
 {test:/dbest\s*vaahak\s*wallet/i,label:'DBest Vaahak Wallet'},
 {test:/kyc\s*(?:documents|details)|uploaded\s*documents/i,label:'KYC Documents'}
];
const style=document.createElement('style');
style.textContent='.dbest-folded-section{overflow:hidden}.dbest-folded-section>.dbest-fold-body[hidden]{display:none!important}.dbest-fold-toggle{width:100%;display:flex;justify-content:space-between;align-items:center;gap:12px;text-align:left;background:transparent;border:0;color:inherit;padding:0;cursor:pointer;font:inherit;font-weight:800;min-height:48px}.dbest-fold-toggle:focus-visible{outline:3px solid #8eb9ff;outline-offset:4px;border-radius:8px}.dbest-fold-chevron{font-size:18px;color:#376bb1;flex:none}.dbest-fold-body{padding-top:14px}.dbest-folded-section .dbest-fold-toggle .dbest-fold-heading{font-size:inherit}';
document.head.appendChild(style);
function eligible(card){
 if(card.dataset.dbestFolded==='yes'||card.closest('#register,#login,#home'))return null;
 const heading=[...card.children].find(x=>/^H[1-4]$/.test(x.tagName));
 if(!heading)return null;
 const name=(heading.textContent||'').trim();
 return sections.find(x=>x.test.test(name))?{heading,name}:null;
}
function fold(card,heading,name){
 card.dataset.dbestFolded='yes';card.classList.add('dbest-folded-section');
 const body=document.createElement('div');body.className='dbest-fold-body';body.hidden=true;
 const toggle=document.createElement('button');toggle.type='button';toggle.className='dbest-fold-toggle';toggle.setAttribute('aria-expanded','false');
 const id='dbest-fold-'+Math.random().toString(36).slice(2);body.id=id;toggle.setAttribute('aria-controls',id);
 const label=document.createElement('span');label.className='dbest-fold-heading';label.textContent=name;
 const chevron=document.createElement('span');chevron.className='dbest-fold-chevron';chevron.setAttribute('aria-hidden','true');chevron.textContent='⌄';
 toggle.append(label,chevron);
 const children=[...card.children].filter(x=>x!==heading);children.forEach(x=>body.appendChild(x));heading.replaceWith(toggle);card.appendChild(body);
 toggle.addEventListener('click',()=>{const open=body.hidden;body.hidden=!open;toggle.setAttribute('aria-expanded',String(open));chevron.textContent=open?'⌃':'⌄'});
}
let queued=false;
function scan(){queued=false;document.querySelectorAll('.card').forEach(card=>{const match=eligible(card);if(match)fold(card,match.heading,match.name)})}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(scan)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{scan();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})},{once:true});
else {scan();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})}
})();