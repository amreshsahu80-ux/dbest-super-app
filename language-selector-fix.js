(function(){
  'use strict';
  const CODES=['en','hi','bn','or','te'];
  const LABELS={en:'English',hi:'हिन्दी',bn:'বাংলা',or:'ଓଡ଼ିଆ',te:'తెలుగు'};
  let busy=false;

  function normalize(v){
    v=String(v||'en').toLowerCase();
    if(v==='ta')v='te';
    return CODES.includes(v)?v:'en';
  }

  function patchOptionText(option){
    if(!option||option.dataset?.dbestTextPatched==='1')return;
    try{
      const d=Object.getOwnPropertyDescriptor(Node.prototype,'textContent');
      if(!d||typeof d.get!=='function'||typeof d.set!=='function')return;
      Object.defineProperty(option,'textContent',{
        configurable:true,
        get:function(){return d.get.call(this)},
        set:function(v){
          const next=String(v??'');
          if(d.get.call(this)===next)return;
          d.set.call(this,next);
        }
      });
      option.dataset.dbestTextPatched='1';
    }catch(e){}
  }

  function prepareSelector(){
    const s=document.getElementById('lang');
    if(!s)return null;
    let tamil=[...s.options].find(o=>o.value==='ta');
    let telugu=[...s.options].find(o=>o.value==='te');
    if(tamil&&!telugu){tamil.value='te';tamil.textContent=LABELS.te;telugu=tamil}
    else if(tamil){tamil.remove()}
    CODES.forEach(code=>{
      let o=[...s.options].find(x=>x.value===code);
      if(!o){o=document.createElement('option');o.value=code;s.appendChild(o)}
      if(o.textContent!==LABELS[code])o.textContent=LABELS[code];
      patchOptionText(o);
    });
    const saved=normalize(localStorage.getItem('d2_lang')||s.value||'en');
    localStorage.setItem('d2_lang',saved);
    if(s.value!==saved)s.value=saved;
    return s;
  }

  function commitLanguage(value){
    const v=normalize(value);
    localStorage.setItem('d2_lang',v);
    const s=document.getElementById('lang');
    if(s&&s.value!==v)s.value=v;
    if(busy)return;
    busy=true;
    try{
      if(typeof window.setLang==='function')window.setLang(v);
      else if(typeof window.render==='function')window.render();
    }catch(e){console.warn('DBest language switch warning',e)}
    finally{busy=false}
    setTimeout(function(){
      try{window.DBEST_I18N&&window.DBEST_I18N.apply&&window.DBEST_I18N.apply()}catch(e){}
      const sel=document.getElementById('lang');if(sel&&sel.value!==v)sel.value=v;
    },0);
  }

  function bind(){
    const s=prepareSelector();if(!s)return;
    if(s.dataset.dbestLanguageFix==='1')return;
    s.dataset.dbestLanguageFix='1';
    s.oninput=function(){commitLanguage(this.value)};
    s.onchange=function(){commitLanguage(this.value)};
    s.addEventListener('touchstart',function(){this.dataset.dbestSelecting='1'},{passive:true});
    s.addEventListener('focus',function(){this.dataset.dbestSelecting='1'});
    s.addEventListener('blur',function(){delete this.dataset.dbestSelecting});
  }

  if(localStorage.getItem('d2_lang')==='ta')localStorage.setItem('d2_lang','te');
  bind();
  document.addEventListener('DOMContentLoaded',bind,{once:true});
  setTimeout(bind,80);setTimeout(bind,350);setTimeout(bind,1000);
  window.DBEST_LANGUAGE_SELECTOR_FIX={version:'1.0.0',bind:bind,setLanguage:commitLanguage};
})();
