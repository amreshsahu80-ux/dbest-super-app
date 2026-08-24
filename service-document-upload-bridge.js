(function(){
'use strict';
const VERSION='1.0.0';
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=String(cfg.supabasePublishableKey||'');
if(!BASE||!KEY)return;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const memberToken=()=>{try{return String(window.DBEST_MEMBER_LIVE?.getToken?.()||localStorage.getItem('dbest_member_live_token')||'')}catch(e){return''}};
const ownerToken=()=>{try{return String(window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.()||sessionStorage.getItem('dbest_owner_session_token')||'')}catch(e){return''}};
function notify(m){try{if(typeof toast==='function')toast(m);else console.log(m)}catch(e){console.log(m)}}
function captureFiles(form){
  const out=[];try{form?.querySelectorAll?.('input[type=file]').forEach((input,n)=>{Array.from(input.files||[]).forEach((file,j)=>{if(file&&file.size)out.push({field:String(input.name||input.dataset.doc||('document_'+n+'_'+j)),file})})})}catch(e){}
  return out;
}
function txArray(){try{return typeof txs!=='undefined'&&Array.isArray(txs)?txs:[]}catch(e){return[]}}
function findTx(before,id,i){try{return txArray().find(x=>!before.has(String(x.id||''))&&String(x.meta?.source||'')==='Content-wise Service Form'&&String(x.meta?.sectionId||'')===String(id)&&Number(x.meta?.subIndex)===Number(i))||null}catch(e){return null}}
async function uploadOne(txid,item){
  const token=memberToken();if(!token)throw new Error('member_session_required');
  const fd=new FormData();fd.append('transaction_id',String(txid));fd.append('field',item.field);fd.append('file',item.file,item.file.name);
  const r=await fetch(BASE+'/functions/v1/service-document-live',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'x-dbest-member-token':token},body:fd,cache:'no-store'});
  let d={};try{d=await r.json()}catch(e){}if(!r.ok)throw new Error(d.error||d.detail||('Upload failed '+r.status));return d;
}
async function ensureRequest(tx){try{return await window.DBEST_SERVICE_REQUEST_LIVE?.sendRequest?.(tx,true)}catch(e){return null}}
async function uploadAll(tx,files){
  if(!tx||!files.length)return;
  const req=await ensureRequest(tx);if(!req)return;
  let ok=0,failed=0;const errors=[];
  for(const item of files){try{await uploadOne(tx.id,item);ok++}catch(e){failed++;errors.push(String(e.message||e))}}
  try{tx.secureDocumentCount=ok;tx.secureDocumentUploadStatus=failed?'Partial':'Uploaded';if(typeof save==='function')save()}catch(e){}
  if(ok&&!failed)notify(ok+' document'+(ok===1?'':'s')+' uploaded securely for DBest Operations.');
  else if(ok)notify(ok+' document(s) uploaded securely; '+failed+' could not upload.');
  else if(failed)notify('Service request is recorded, but document upload failed. Please retry the application/document upload before processing.');
  if(errors.length)console.warn('DBest secure service document upload',errors);
}
const original=window.submitContentApplication;
if(typeof original==='function'&&!original.__dbestSecureDocsWrapped){
  const wrapped=async function(e,id,i){
    const files=captureFiles(e?.target),before=new Set(txArray().map(x=>String(x.id||'')));
    const out=await original.apply(this,arguments);
    if(files.length)setTimeout(async()=>{const tx=findTx(before,id,i);if(tx)await uploadAll(tx,files)},120);
    return out;
  };
  wrapped.__dbestSecureDocsWrapped=true;wrapped.__dbestOriginal=original;window.submitContentApplication=wrapped;
}
async function ownerDocs(txid){
  const token=ownerToken();if(!token)throw new Error('Owner security session expired. Please login again.');
  const r=await fetch(BASE+'/functions/v1/service-document-live',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json','x-dbest-owner-token':token},body:JSON.stringify({action:'owner_list',transactionId:txid}),cache:'no-store'});
  let d={};try{d=await r.json()}catch(e){}if(!r.ok)throw new Error(d.error||d.detail||('Request failed '+r.status));return Array.isArray(d.documents)?d.documents:[];
}
window.loadSecureServiceDocuments=async function(txid,button){
  const host=button?.parentElement?.querySelector?.('.dbestSecureDocsHost')||button?.closest?.('.ownerQueueRow')?.querySelector?.('.dbestSecureDocsHost');
  if(host)host.innerHTML='<div class="notice">Loading secure documents…</div>';
  try{
    const docs=await ownerDocs(txid);
    if(!host)return;
    if(!docs.length){host.innerHTML='<div class="notice">No securely uploaded document is available for this request. Older requests may contain document metadata only.</div>';return}
    host.innerHTML='<div class="ownerQueue" style="margin-top:8px">'+docs.map(d=>`<div class="ownerQueueRow"><b>${esc(d.field_name||'Document')}</b><small>${esc(d.file_name||'File')} • ${Math.round(Number(d.size_bytes||0)/1024)} KB</small>${d.url?`<a class="mini" href="${esc(d.url)}" target="_blank" rel="noopener">Open Secure File</a>`:'<small>Secure link unavailable</small>'}</div>`).join('')+'</div><div class="notice" style="margin-top:6px">Links are private and expire automatically after 10 minutes.</div>';
  }catch(e){if(host)host.innerHTML='<div class="notice">Could not load secure documents: '+esc(e.message||e)+'</div>'}
};
function injectOwnerDocButtons(){
  document.querySelectorAll('.ownerQueueRow').forEach(row=>{
    if(row.dataset.secureDocsInjected==='1')return;
    const txBtn=Array.from(row.querySelectorAll('button')).find(b=>/Open Transaction/i.test(b.textContent||''));if(!txBtn)return;
    const m=String(txBtn.getAttribute('onclick')||'').match(/txDetailsView\(['"]([^'"]+)['"]\)/);if(!m)return;
    row.dataset.secureDocsInjected='1';const txid=m[1];
    const b=document.createElement('button');b.className='mini';b.type='button';b.textContent='🔐 Secure Documents';b.onclick=()=>loadSecureServiceDocuments(txid,b);txBtn.insertAdjacentElement('afterend',b);
    const h=document.createElement('div');h.className='dbestSecureDocsHost';b.insertAdjacentElement('afterend',h);
  });
}
new MutationObserver(injectOwnerDocButtons).observe(document.documentElement,{childList:true,subtree:true});setInterval(injectOwnerDocButtons,1200);injectOwnerDocButtons();
window.DBEST_SERVICE_DOCUMENTS_LIVE={version:VERSION,uploadAll,ownerDocs};
})();