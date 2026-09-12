(function(){
'use strict';
const VERSION='1.0.0';
function visible(el){if(!el)return false;try{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&!!(r.width||r.height)}catch(e){return false}}
function currentText(){try{const roots=[...document.querySelectorAll('.sectionContent')].filter(visible);return String(roots.pop()?.innerText||'').toLowerCase().replace(/\s+/g,' ')}catch(e){return''}}
function infer(id,s){
  const t=currentText(),subs=Array.isArray(s?.[5])?s[5]:[];
  const exact=subs.findIndex(v=>t.includes(String(v||'').toLowerCase()));if(exact>=0)return exact;
  const rules=[[/health|mediclaim/,/health/i],[/life|term/,/(life|term)/i],[/motor|vehicle|car insurance|bike insurance/,/(motor|vehicle|car|bike)/i],[/flight|air ticket/,/(flight|air)/i],[/hotel|stay|accommodation/,/(hotel|stay|accommodation)/i],[/tour package|holiday package|package tour/,/(tour|holiday|package)/i]];
  for(const [pageRe,subRe] of rules){if(pageRe.test(t)){const i=subs.findIndex(v=>subRe.test(String(v||'')));if(i>=0)return i}}
  return null;
}
function latestOwn(){try{return (Array.isArray(txs)?txs:[]).find(x=>String(x?.userId||'')===String(session?.id||''))||null}catch(e){return null}}
function install(){
  const fn=window.dbestUniversalExternalGo;if(typeof fn!=='function'||fn.__dbestSubtypePreserver)return false;
  const wrapped=function(id,i){
    let s=null;try{s=(Array.isArray(services)?services:[]).find(v=>String(v?.[0])===String(id))||null}catch(e){}
    const inferred=Number.isInteger(i)?i:infer(id,s),before=latestOwn()?.id;
    const out=fn.apply(this,arguments);
    try{
      if(Number.isInteger(inferred)){
        const x=latestOwn();if(x&&x.id!==before){
          const sub=String(s?.[5]?.[inferred]||'').trim();
          if(sub){x.sub=sub;x.meta={...(x.meta||{}),subIndex:inferred,serviceSubtype:sub};if(typeof save==='function')save();setTimeout(()=>window.DBEST_TRANSACTION_LEDGER?.record?.(x),20)}
        }
      }
    }catch(e){console.warn('DBest subtype preserve',e)}
    return out;
  };
  wrapped.__dbestSubtypePreserver=true;window.dbestUniversalExternalGo=wrapped;return true;
}
let n=0;const t=setInterval(()=>{n++;if(install()||n>30)clearInterval(t)},150);setTimeout(install,0);
window.DBEST_EXTERNAL_SERVICE_SUBTYPE={version:VERSION,install};
})();