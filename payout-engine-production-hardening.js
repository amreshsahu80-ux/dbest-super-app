(function(){
'use strict';
const VERSION='1.0.0';
const norm=v=>String(v??'').trim().toLowerCase().replace(/\s+/g,' ');
const aliasGroups=[
  ['health','health insurance'],
  ['life','life insurance'],
  ['motor','motor insurance'],
  ['travel','travel insurance'],
  ['flight','flight booking','flights'],
  ['hotels','hotel','hotel booking','flight + hotel','flight+hotel'],
  ['package','packages','tour package','holiday package'],
  ['visa','visa assistance']
];
function canonical(v){
  const n=norm(v);
  for(const g of aliasGroups)if(g.includes(n))return g[0];
  return n;
}
function hasMatrix(){
  try{return Array.isArray(payoutRules)&&payoutRules.some(r=>r&&r.enabled!==false&&r.matrixRule&&r.valueType==='percent')}
  catch(e){return false}
}
function install(){
  try{
    if(typeof window.ruleTxMatch==='function'&&!window.ruleTxMatch.__dbestPctHardened){
      const raw=window.ruleTxMatch;
      const wrapped=function(rule,x){
        try{
          const meta=x?.meta||{};
          if(rule?.scope==='section'){
            const rid=norm(rule.sectionId||'');
            const txid=norm(meta.sectionId||meta.section_id||'');
            if(rid&&txid&&rid===txid)return true;
            if(rid){
              try{
                const s=(typeof services!=='undefined'&&Array.isArray(services))?services.find(v=>String(v?.[0]||'')===rule.sectionId):null;
                if(s&&canonical(x?.section)===canonical(s?.[1]))return true;
              }catch(_e){}
            }
          }
          if(rule?.scope==='service'){
            const wanted=canonical(rule.scopeValue||rule.subsection||'');
            const vals=[x?.sub,meta.service,meta.sub,meta.subsection,meta.subsectionName];
            if(wanted&&vals.some(v=>canonical(v)===wanted))return true;
          }
        }catch(e){}
        return raw.apply(this,arguments);
      };
      wrapped.__dbestPctHardened=true;wrapped.__dbestOriginal=raw;window.ruleTxMatch=wrapped;
    }
    if(typeof window.activePayoutRules==='function'&&!window.activePayoutRules.__dbestPctHardened){
      const raw=window.activePayoutRules;
      const wrapped=function(recipient){
        const rows=raw.apply(this,arguments)||[];
        return hasMatrix()?rows.filter(r=>r&&r.valueType==='percent'&&r.enabled!==false):rows;
      };
      wrapped.__dbestPctHardened=true;wrapped.__dbestOriginal=raw;window.activePayoutRules=wrapped;
    }
    if(typeof window.fallbackPayout==='function'&&!window.fallbackPayout.__dbestPctHardened){
      const raw=window.fallbackPayout;
      const wrapped=function(recipient){return hasMatrix()?0:raw.apply(this,arguments)};
      wrapped.__dbestPctHardened=true;wrapped.__dbestOriginal=raw;window.fallbackPayout=wrapped;
    }
    if(hasMatrix()){
      try{if(typeof payout!=='undefined'){payout={self:0,l1:0,l2:0,l3:0};localStorage.setItem('d2_payout',JSON.stringify(payout))}}catch(e){}
    }
    return true;
  }catch(e){console.warn('DBest payout hardening',e);return false}
}
[0,200,700,1600,3500].forEach(ms=>setTimeout(install,ms));
window.addEventListener('focus',install);
window.DBEST_PAYOUT_ENGINE_HARDENING={version:VERSION,install,canonical,hasMatrix};
})();