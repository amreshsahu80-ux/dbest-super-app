(function(){
'use strict';
const V='20260913-contact-email-links-v1';
if(window.DBEST_CONTACT_EMAIL_LINKS&&window.DBEST_CONTACT_EMAIL_LINKS.version===V)return;

function visible(el){
  if(!el||!el.isConnected)return false;
  const s=getComputedStyle(el),r=el.getBoundingClientRect();
  return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)!==0&&r.width>0&&r.height>0;
}
function isContactText(t){return /contact\s*us|contact|संपर्क|যোগাযোগ|ଯୋଗାଯୋଗ|సంప్రదించండి|தொடர்பு/i.test(String(t||''));}
function addEmails(){
  if(document.getElementById('dbestContactEmailLinks'))return true;
  const candidates=[...document.querySelectorAll('section,article,div,.card,.modal,.popup,[role="dialog"]')].filter(visible);
  let target=null;
  for(const el of candidates){
    const tx=String(el.textContent||'').replace(/\s+/g,' ').trim();
    if(tx.length>20&&tx.length<1800&&isContactText(tx)){target=el;break;}
  }
  if(!target)return false;
  const wrap=document.createElement('div');wrap.id='dbestContactEmailLinks';wrap.style.cssText='margin-top:12px;display:grid;gap:8px;font-size:13px';
  function row(label,email){const a=document.createElement('a');a.href='mailto:'+email;a.textContent=label+': '+email;a.style.cssText='color:#175cff;font-weight:800;text-decoration:none;overflow-wrap:anywhere';return a;}
  wrap.appendChild(row('Support','support@dbest4u.com'));
  wrap.appendChild(row('Complaints','complaints@dbest4u.com'));
  target.appendChild(wrap);return true;
}
function tryAdd(){let n=0;const id=setInterval(function(){n++;if(addEmails()||n>=12)clearInterval(id)},120);}
document.addEventListener('click',function(e){const el=e.target&&e.target.closest&&e.target.closest('button,a,[role="button"]');if(el&&isContactText(el.textContent||el.getAttribute('aria-label')||el.title)){setTimeout(tryAdd,50);}},true);
new MutationObserver(function(muts){for(const m of muts){for(const n of m.addedNodes||[]){if(n.nodeType===1&&isContactText(n.textContent)){setTimeout(addEmails,0);return;}}}}).observe(document.documentElement,{childList:true,subtree:true});
window.DBEST_CONTACT_EMAIL_LINKS={version:V,refresh:addEmails};
})();
