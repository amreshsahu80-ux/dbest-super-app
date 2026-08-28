(function(){
'use strict';
const VERSION='1.1.0';
const norm=v=>String(v??'').trim().toLowerCase().replace(/\s+/g,' ');
const serviceAliasGroups=[
  ['health','health insurance'],
  ['life','life insurance'],
  ['motor','motor insurance'],
  ['travel','travel insurance'],
  ['flight','flight booking','flights'],
  ['hotels','hotel','hotel booking','flight + hotel','flight+hotel'],
  ['package','packages','tour package','holiday package'],
  ['visa','visa assistance']
];
const sectionGroups={
  join:['join','join n earn','जुड़ें और कमाएँ','যোগ দিন ও উপার্জন করুন','ଯୋଗଦିଅନ୍ତୁ ଓ ଆୟ କରନ୍ତୁ','చేరండి & సంపాదించండి'],
  car:['car','car bookings','cab booking','cab bookings','कार बुकिंग','গাড়ি বুকিং','କାର ବୁକିଂ','కార్ బుకింగ్స్'],
  insurance:['insurance','all insurance','सभी बीमा','সব বীমা','ସମସ୍ତ ବୀମା','అన్ని బీమాలు'],
  flights:['flights','flights hotels packages','flight hotels packages','फ्लाइट, होटल और पैकेज','ফ্লাইট, হোটেল ও প্যাকেজ','ଫ୍ଲାଇଟ୍, ହୋଟେଲ ଓ ପ୍ୟାକେଜ','ఫ్లైట్స్, హోటళ్లు & ప్యాకేజీలు'],
  store:['store','marketplace','marketplace - master order','marketplace - grocery','marketplace master order','marketplace grocery','स्टोर','স্টোর','ଷ୍ଟୋର୍','స్టోర్'],
  govt:['govt','pan, dl, itr','pan dl itr'],
  mf:['mf','mutual funds','mutual fund','म्यूचुअल फंड','মিউচুয়াল ফান্ড','ମ୍ୟୁଚୁଆଲ୍ ଫଣ୍ଡ','మ్యూచువల్ ఫండ్స్']
};
const sectionLookup=new Map();
Object.entries(sectionGroups).forEach(([id,aliases])=>aliases.forEach(a=>sectionLookup.set(norm(a),id)));
function canonical(v){
  const n=norm(v);
  for(const g of serviceAliasGroups)if(g.includes(n))return g[0];
  return n;
}
function canonicalSection(v){return sectionLookup.get(norm(v))||''}
function sectionIdFromPartnerUrl(x){
  try{
    const meta=x?.meta||{},raw=meta.partnerUrl||meta.partner_url||x?.partnerUrl||x?.partner_url||'';
    if(!raw)return'';
    const u=new URL(String(raw),location.href);
    return canonicalSection(u.searchParams.get('dbest_section')||'')||norm(u.searchParams.get('dbest_section')||'');
  }catch(e){return''}
}
function txSectionId(x){
  const meta=x?.meta||{};
  const explicit=canonicalSection(meta.sectionId||meta.section_id||'')||norm(meta.sectionId||meta.section_id||'');
  if(explicit)return explicit;
  const fromUrl=sectionIdFromPartnerUrl(x);if(fromUrl)return fromUrl;
  return canonicalSection(x?.section||'');
}
function ruleSectionId(rule){
  return canonicalSection(rule?.sectionId||'')||norm(rule?.sectionId||'')||canonicalSection(rule?.scopeValue||'');
}
function hasMatrix(){
  try{return Array.isArray(payoutRules)&&payoutRules.some(r=>r&&r.enabled!==false&&r.matrixRule&&r.valueType==='percent')}
  catch(e){return false}
}
function install(){
  try{
    if(typeof window.ruleTxMatch==='function'&&!window.ruleTxMatch.__dbestPctHardenedV11){
      const raw=window.ruleTxMatch.__dbestOriginal||window.ruleTxMatch;
      const wrapped=function(rule,x){
        try{
          const meta=x?.meta||{};
          if(rule?.scope==='section'){
            const rid=ruleSectionId(rule),tid=txSectionId(x);
            if(rid&&tid&&rid===tid)return true;
            if(rid){
              try{
                const s=(typeof services!=='undefined'&&Array.isArray(services))?services.find(v=>String(v?.[0]||'')===String(rule.sectionId||'')):null;
                if(s&&canonical(x?.section)===canonical(s?.[1]))return true;
              }catch(_e){}
            }
          }
          if(rule?.scope==='service'){
            const wanted=canonical(rule.scopeValue||rule.subsection||'');
            const vals=[x?.sub,x?.subsection,meta.service,meta.sub,meta.subsection,meta.subsectionName];
            if(wanted&&vals.some(v=>canonical(v)===wanted))return true;
          }
        }catch(e){}
        return raw.apply(this,arguments);
      };
      wrapped.__dbestPctHardened=true;
      wrapped.__dbestPctHardenedV11=true;
      wrapped.__dbestOriginal=raw;
      window.ruleTxMatch=wrapped;
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
window.DBEST_PAYOUT_ENGINE_HARDENING={version:VERSION,install,canonical,canonicalSection,txSectionId,hasMatrix};
})();