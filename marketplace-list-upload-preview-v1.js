(function(){
'use strict';
const TYPES={grocery:'Upload Shopping List',medicine:'Upload Prescription / Medicine List',restaurant:'Upload Food Order List'};
const MAX_BYTES=8*1024*1024;
function category(){
 const active=document.querySelector('.shopPage .marketTypeTab.on');
 const tab=String(active?.getAttribute('onclick')||'').match(/type:'(grocery|restaurant|medicine)'/);
 if(tab)return tab[1];
 const text=[location.hash,location.search].join(' ').toLowerCase();
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
 const vendorSelect=document.createElement('select');vendorSelect.setAttribute('aria-label','Choose Vendor');vendorSelect.style.cssText='display:block;width:100%;margin:12px 0;padding:10px;border:1px solid #bbc5d0;border-radius:8px';const initial=document.createElement('option');initial.value='';initial.textContent='Loading approved Vendors…';vendorSelect.append(initial);panel.append(vendorSelect);
 const submit=document.createElement('button');submit.type='button';submit.textContent='Submit List for Quotation';submit.disabled=true;submit.style.cssText='padding:10px 16px;border:0;border-radius:8px;background:#145ba0;color:white;opacity:.7';panel.append(submit);
 const api=window.DBEST_MARKETPLACE_UPLOAD_API;
 const enabled=window.DBEST_MARKETPLACE_UPLOAD_ENABLED===true&&!!api;
 if(enabled){api.availableVendors(type).then(vendors=>{const picker=window.DBEST_MARKETPLACE_VENDOR_PICKER;if(picker)picker.render(vendorSelect,vendors,type);else{vendorSelect.replaceChildren();for(const v of vendors){const o=document.createElement('option');o.value=v.id;o.textContent=v.name;vendorSelect.append(o)}}submit.disabled=!vendorSelect.value;vendorSelect.onchange=()=>{submit.disabled=!vendorSelect.value}}).catch(e=>{initial.textContent='Vendor lookup unavailable';status.textContent=String(e.message||e)})}
 else initial.textContent='Quotation submission not yet enabled';
 submit.onclick=async()=>{const file=input.files?.[0];if(!enabled||!vendorSelect.value||!file)return;submit.disabled=true;status.textContent='Uploading securely…';try{const result=await api.submit({category:type,vendorId:vendorSelect.value,file});status.textContent='Submitted. Request '+result.request.id;submit.textContent='Submitted'}catch(e){status.textContent=String(e.message||e);submit.disabled=false}};
 const note=document.createElement('p');note.style.cssText='font-size:12px;color:#795400';note.textContent='Preview only — no document is uploaded or shared yet.';panel.append(note);
 const close=document.createElement('button');close.type='button';close.textContent='Close';close.style.cssText='padding:10px 20px;border:0;border-radius:9px;background:#e7eaf0';close.onclick=()=>overlay.remove();panel.append(close);
 overlay.append(panel);overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});document.body.append(overlay);
}
function mount(){
 const root=[...document.querySelectorAll('.shopPage')].reverse().find(el=>el.querySelector('.marketTypeTab.on'));if(!root)return;
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