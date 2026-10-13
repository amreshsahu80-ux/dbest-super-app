(function(){
'use strict';
const TYPES={grocery:'Upload Shopping List',medicine:'Upload Prescription / Medicine List',restaurant:'Upload Food Order List'};
const MAX_BYTES=8*1024*1024;
function category(){
 const text=[location.hash,location.search,document.querySelector('.shopPage h2')?.textContent||'',document.querySelector('.shopPage h3')?.textContent||''].join(' ').toLowerCase();
 return Object.keys(TYPES).find(x=>text.includes(x))||'';
}
function openUpload(type){
 const old=document.getElementById('dbestListUploadModal');if(old)old.remove();
 const overlay=document.createElement('div');overlay.id='dbestListUploadModal';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
 overlay.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#0009;display:flex;align-items:center;justify-content:center;padding:16px';
 const panel=document.createElement('div');panel.style.cssText='background:#fff;color:#17202a;border-radius:16px;padding:20px;width:min(440px,100%);font:15px system-ui;box-shadow:0 12px 45px #0004';
 const heading=document.createElement('h3');heading.textContent=TYPES[type];panel.append(heading);
 const hint=document.createElement('p');hint.textContent='Choose a photo or PDF (maximum 8 MB). Request submission will be enabled after secure Vendor quotation integration is tested.';panel.append(hint);
 const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,application/pdf';input.style.width='100%';panel.append(input);
 const status=document.createElement('p');status.setAttribute('aria-live','polite');panel.append(status);
 input.addEventListener('change',()=>{const f=input.files?.[0];status.textContent=!f?'':(!['image/jpeg','image/png','application/pdf'].includes(f.type)||f.size>MAX_BYTES)?'Unsupported file or file exceeds 8 MB.':'Selected: '+f.name+' ('+Math.ceil(f.size/1024)+' KB)';});
 const note=document.createElement('p');note.style.cssText='font-size:12px;color:#795400';note.textContent='Preview only — no document is uploaded or shared yet.';panel.append(note);
 const close=document.createElement('button');close.type='button';close.textContent='Close';close.style.cssText='padding:10px 20px;border:0;border-radius:9px;background:#e7eaf0';close.onclick=()=>overlay.remove();panel.append(close);
 overlay.append(panel);overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});document.body.append(overlay);
}
function mount(){
 const root=document.querySelector('.shopPage');if(!root)return;
 const type=category();if(!type){root.querySelector('[data-dbest-list-upload]')?.remove();return;}
 let btn=root.querySelector('[data-dbest-list-upload]');if(btn){if(btn.dataset.dbestListUpload===type)return;btn.remove();}
 btn=document.createElement('button');btn.type='button';btn.dataset.dbestListUpload=type;btn.textContent='📎 '+TYPES[type];btn.style.cssText='display:block;margin:12px auto;padding:12px 18px;border-radius:12px;border:1px solid #1564b5;background:#eaf4ff;color:#123e70;font-weight:700;max-width:95%';
 btn.onclick=()=>openUpload(type);
 const anchor=root.querySelector('input[type=search]')?.parentElement||root.querySelector('h2')||root.firstElementChild;
 if(anchor?.parentNode)anchor.insertAdjacentElement('afterend',btn);else root.prepend(btn);
}
let scheduled=false;
function scheduleMount(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;mount()},120)}
const obs=new MutationObserver(scheduleMount);
function start(){mount();obs.observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();