(function(){
'use strict';
const VERSION='1.0.0';
const cfg=window.DBEST_RUNTIME_CONFIG||{},BASE=String(cfg.supabaseUrl||'').replace(/\/$/,''),KEY=String(cfg.supabasePublishableKey||'');
if(!BASE||!KEY)return;
const LEDGER=BASE+'/functions/v1/transaction-ledger-live',REQUEST=BASE+'/functions/v1/service-request-live',DOCS=BASE+'/functions/v1/service-document-live';
const MAX_FILES=3;
let ownerClaims=[];

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
const money=v=>'₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2});
function memberToken(){try{return String(window.DBEST_MEMBER_LIVE?.getToken?.()||localStorage.getItem('dbest_member_live_token')||'')}catch(e){return''}}
function ownerToken(){try{return String(window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.()||sessionStorage.getItem('dbest_owner_session_token')||'')}catch(e){return''}}
function sid(){try{return String(session?.id||'')}catch(e){return''}}
function isMember(){try{return ['guest','promoter','prime','leader'].includes(String(session?.role||''))&&!!sid()}catch(e){return false}}
function isOwner(){try{return String(session?.role||'')==='owner'}catch(e){return false}}
function txArray(){try{return typeof txs!=='undefined'&&Array.isArray(txs)?txs:[]}catch(e){return[]}}
function txById(id){return txArray().find(x=>String(x?.id||'')===String(id))||null}
function claim(x){return x?.meta?.externalSuccess||{}}
function externalTx(x){const src=String(x?.source||x?.meta?.source||'').toLowerCase(),st=String(x?.status||'').toLowerCase();return /external|partner/.test(src)||/redirect|external/.test(st)||!!(x?.partnerUrl||x?.meta?.partnerUrl)}
function claimable(x){if(!x||String(x.userId||'')!==sid()||!externalTx(x))return false;const s=claim(x).state;return s!=='pending'&&s!=='approved'}
function notify(m){try{if(typeof toast==='function')toast(m);else alert(m)}catch(e){console.log(m)}}
function baseHeaders(){return {apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'}}
async function post(url,body,extra={}){const r=await fetch(url,{method:'POST',cache:'no-store',headers:{...baseHeaders(),...extra},body:JSON.stringify(body||{})});let d={};try{d=await r.json()}catch(e){}if(!r.ok){const er=new Error(d.error||d.detail||('HTTP '+r.status));er.status=r.status;throw er}return d}
async function ledgerMember(body){const t=memberToken();if(!t)throw new Error('member_session_required');return post(LEDGER,body,{'x-dbest-member-token':t})}
async function ledgerOwner(body){const t=ownerToken();if(!t)throw new Error('owner_session_required');return post(LEDGER,body,{'x-dbest-owner-token':t})}
function mapServer(row,x){if(!row||!x)return;x.amount=Number(row.amount||0);x.status=String(row.payment_status||x.status||'');x.details=String(row.reference||x.details||'');x.meta=row.metadata||x.meta||{};x.internalTransactionId=String(row.transaction_id||x.id||'');try{typeof save==='function'&&save()}catch(e){}}
function removeModal(){document.getElementById('dbestExternalSuccessModal')?.remove()}
function today(){return new Date().toISOString().slice(0,10)}

async function ensureServiceRequest(tx,details,files){
  const token=memberToken();if(!token)throw new Error('member_session_required');
  const manifest={};files.forEach((f,i)=>manifest['external_success_proof_'+(i+1)]={name:f.name,type:f.type,size:f.size});
  const copy={...tx,amount:Number(details.amount),status:'External Success Submitted / Pending Verification',application:{externalReference:details.reference,successfulAt:details.successfulAt,amount:details.amount,partner:tx.partner||claim(tx).partner||'',notes:details.notes||''},documents:manifest,meta:{...(tx.meta||{}),application:{externalReference:details.reference,successfulAt:details.successfulAt,amount:details.amount,partner:tx.partner||'',notes:details.notes||''},documents:manifest}};
  return post(REQUEST,{action:'create',transaction:copy},{'x-dbest-member-token':token});
}
async function uploadProof(txid,file,i){
  const token=memberToken();if(!token)throw new Error('member_session_required');
  const fd=new FormData();fd.append('transaction_id',String(txid));fd.append('field','external_success_proof_'+(i+1));fd.append('file',file,file.name);
  const r=await fetch(DOCS,{method:'POST',cache:'no-store',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'x-dbest-member-token':token},body:fd});let d={};try{d=await r.json()}catch(e){}if(!r.ok)throw new Error(d.error||d.detail||('Proof upload failed '+r.status));return d;
}

function openClaim(txid){
  if(!isMember())return;const x=txById(txid);if(!x)return notify('Transaction not found.');
  const c=claim(x);if(c.state==='pending')return notify('This success claim is already awaiting verification.');if(c.state==='approved')return notify('This external transaction is already verified.');if(!externalTx(x))return notify('Success proof is available only for external partner transactions.');
  removeModal();
  const wrap=document.createElement('div');wrap.id='dbestExternalSuccessModal';wrap.style.cssText='position:fixed;inset:0;z-index:2147483646;background:rgba(8,18,38,.72);display:grid;place-items:center;padding:16px;overflow:auto';
  wrap.innerHTML=`<div style="width:min(560px,100%);background:#fff;border-radius:20px;padding:20px;box-shadow:0 25px 70px rgba(0,0,0,.3);font-family:Inter,system-ui,Arial"><div style="display:flex;justify-content:space-between;gap:12px;align-items:start"><div><h2 style="margin:0 0 5px">Submit Successful External Transaction</h2><small>${esc(x.id)} • ${esc(x.section||'')} / ${esc(x.sub||'')}</small></div><button type="button" id="dbestExternalClose" style="border:0;background:#eef2f7;border-radius:10px;padding:8px 11px;font-weight:800">✕</button></div><div class="notice" style="margin:12px 0">Upload proof of the completed partner transaction. Payouts will be calculated only after DBest Owner verification.</div><form id="dbestExternalSuccessForm" style="display:grid;gap:10px"><div class="f"><label>External Reference / Booking / Policy / Order ID *</label><input name="reference" required value="${esc(c.reference||'')}"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="f"><label>Successful Transaction Date *</label><input name="successfulAt" type="date" required value="${esc((c.successfulAt||today()).slice(0,10))}"></div><div class="f"><label>Transaction Amount ₹ *</label><input name="amount" type="number" min="0.01" step="0.01" required value="${Number(c.amount||x.amount||0)||''}"></div></div><div class="f"><label>Proof Screenshot / PDF * <small>(up to ${MAX_FILES} files)</small></label><input name="proof" type="file" accept="image/*,.pdf,application/pdf" multiple required></div><div class="f"><label>Notes</label><textarea name="notes" rows="3" placeholder="Optional details that will help verification">${esc(c.notes||'')}</textarea></div><button class="btn" id="dbestExternalSubmit">Submit for Verification</button><div id="dbestExternalMsg" style="font-size:13px;color:#687386"></div></form></div>`;
  document.body.appendChild(wrap);wrap.querySelector('#dbestExternalClose').onclick=removeModal;
  wrap.querySelector('#dbestExternalSuccessForm').onsubmit=async e=>{
    e.preventDefault();const f=new FormData(e.target),files=Array.from(e.target.elements.proof.files||[]).slice(0,MAX_FILES),msg=wrap.querySelector('#dbestExternalMsg'),btn=wrap.querySelector('#dbestExternalSubmit');
    const details={reference:clean(f.get('reference'),180),successfulAt:clean(f.get('successfulAt'),80),amount:Number(f.get('amount')||0),notes:clean(f.get('notes'),800)};
    if(!files.length){msg.textContent='Please upload at least one proof screenshot or PDF.';return}if(!(details.amount>0)){msg.textContent='Please enter a valid transaction amount.';return}
    btn.disabled=true;btn.textContent='Uploading proof…';
    try{
      msg.style.color='#687386';msg.textContent='Recording transaction details and securely uploading proof…';
      await ensureServiceRequest(x,details,files);
      let uploaded=0;for(let i=0;i<files.length;i++){await uploadProof(x.id,files[i],i);uploaded++}
      btn.textContent='Submitting for verification…';
      const d=await ledgerMember({action:'submit_external_success',transactionId:x.id,claim:{...details,partner:x.partner||'',proofCount:uploaded}});
      mapServer(d.transaction,x);try{await window.DBEST_TRANSACTION_LEDGER?.refreshNetwork?.(true)}catch(_){ }
      msg.style.color='#15803d';msg.textContent='Submitted successfully. Payout will activate automatically after Owner verification.';notify('External transaction proof submitted for verification.');setTimeout(()=>{removeModal();decorateTables()},900);
    }catch(err){msg.style.color='#b91c1c';msg.textContent=err.message==='claim_already_pending'?'This claim is already pending verification.':'Could not submit: '+clean(err.message,160);}
    finally{btn.disabled=false;btn.textContent='Submit for Verification'}
  };
}

function actionHtml(x){const c=claim(x);if(String(x.userId||'')!==sid())return c.state==='approved'?'<b style="color:#15803d">Verified</b>':c.state==='pending'?'<span>Pending Review</span>':'—';if(!externalTx(x))return '—';if(c.state==='approved')return '<b style="color:#15803d">✓ Verified</b>';if(c.state==='pending')return '<b style="color:#b26a00">Pending Review</b>';return `<button class="mini" type="button" onclick="DBEST_EXTERNAL_SUCCESS_CLAIMS.open('${esc(x.id)}')">${c.state==='rejected'?'Resubmit Proof':'Submit Success'}</button>`}
function decorateTables(){
  if(!isMember())return;const map=new Map(txArray().map(x=>[String(x.id||''),x]));
  document.querySelectorAll('table').forEach(table=>{
    const heads=[...table.querySelectorAll('thead th, tr:first-child th')].map(x=>String(x.textContent||'').toLowerCase());if(!heads.some(h=>h.includes('transaction id'))||!heads.some(h=>h.includes('status')))return;
    const hr=table.querySelector('thead tr')||table.querySelector('tr');if(hr&&!hr.querySelector('th[data-dbest-external-result]')){const th=document.createElement('th');th.dataset.dbestExternalResult='1';th.textContent='External Result';hr.appendChild(th)}
    table.querySelectorAll('tbody tr').forEach(tr=>{if(tr.querySelector('td[data-dbest-external-result]'))return;const id=clean(tr.querySelector('td b')?.textContent||tr.querySelector('td')?.textContent,120);const x=map.get(id);if(!x)return;const td=document.createElement('td');td.dataset.dbestExternalResult='1';td.innerHTML=actionHtml(x);tr.appendChild(td)});
  });
}

function claimCard(r,idx){const c=r.metadata?.externalSuccess||{},state=c.state||'pending',pill=state==='approved'?'approvalApproved':state==='rejected'?'approvalRejected':'approvalPending';return `<div class="ownerQueueRow" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><h4 style="margin:0">${esc(r.section||'')} ${r.subsection?'• '+esc(r.subsection):''}</h4><small>${esc(r.transaction_id)} • ${esc(r.actor_name||r.actor_ref)} (${esc(r.actor_ref)})</small></div><span class="approvalPill ${pill}">${esc(state==='pending'?'Pending Verification':state==='approved'?'Verified':'Rejected')}</span></div><div class="revenueGrid"><div class="revenueCell"><small>Partner</small><b>${esc(r.counterparty_name||c.partner||'—')}</b></div><div class="revenueCell"><small>External Reference</small><b>${esc(c.reference||r.reference||'—')}</b></div><div class="revenueCell"><small>Business Amount</small><b>${money(c.amount||r.amount)}</b></div><div class="revenueCell"><small>Transaction Date</small><b>${esc(c.successfulAt||'—')}</b></div></div>${c.notes?`<div class="notice" style="margin-top:8px"><b>Member note:</b> ${esc(c.notes)}</div>`:''}<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="mini" type="button" onclick="loadSecureServiceDocuments('${esc(r.transaction_id)}',this)">🔐 View Proof</button>${state==='pending'?`<button class="mini" type="button" onclick="DBEST_EXTERNAL_SUCCESS_CLAIMS.review(${idx},'approve')">✓ Approve & Activate Payout</button><button class="mini" type="button" onclick="DBEST_EXTERNAL_SUCCESS_CLAIMS.review(${idx},'reject')">✕ Reject</button>`:''}</div><div class="dbestSecureDocsHost"></div></div>`}
async function openOwner(){
  if(!isOwner())return;try{const d=await ledgerOwner({action:'owner_list_external_claims'});ownerClaims=Array.isArray(d.claims)?d.claims:[];}catch(e){notify('Could not load external transaction claims: '+e.message);return}
  const pending=ownerClaims.filter(r=>r.metadata?.externalSuccess?.state==='pending').length,approved=ownerClaims.filter(r=>r.metadata?.externalSuccess?.state==='approved').length,rejected=ownerClaims.filter(r=>r.metadata?.externalSuccess?.state==='rejected').length;
  if(typeof sectionScreen!=='function')return;sectionScreen(`${typeof sectionTopBar==='function'?sectionTopBar('✅ External Transaction Claims','Member proof • Owner verification • Automatic hierarchy payout','ownerOperations()'):''}<div class="sectionContent owner55"><div class="notice"><b>Verification rule:</b> Member-uploaded external transactions do not generate payout until Owner approval. On approval, the transaction becomes verified/completed and the existing payout rules calculate Self, L1, L2 and L3 earnings automatically.</div><div class="owner55Summary" style="margin:14px 0"><div class="owner55Stat"><small>Pending</small><b>${pending}</b></div><div class="owner55Stat"><small>Verified</small><b>${approved}</b></div><div class="owner55Stat"><small>Rejected</small><b>${rejected}</b></div></div><div class="ownerQueue">${ownerClaims.map(claimCard).join('')||'<div class="notice">No external success claims submitted yet.</div>'}</div></div>`)}
async function review(idx,decision){const r=ownerClaims[idx];if(!r)return;const note=prompt(decision==='approve'?'Optional Owner note for approval:':'Reason / note for rejection:','')||'';try{await ledgerOwner({action:'owner_review_external_claim',transactionId:r.transaction_id,decision,ownerNote:note});notify(decision==='approve'?'External transaction verified. Hierarchy payouts are now eligible.':'External success claim rejected.');openOwner()}catch(e){notify('Could not review claim: '+e.message)}}
function injectOwnerButton(){try{if(!isOwner()||document.getElementById('dbestExternalClaimsOwnerBtn'))return;const roots=[...document.querySelectorAll('.sectionContent')];const root=roots.find(r=>/Owner Operations|Project Owner Console|Master Control/i.test(r.innerText||''));if(!root)return;const b=document.createElement('button');b.id='dbestExternalClaimsOwnerBtn';b.className=root.querySelector('.owner55Action')?'owner55Action':'sub';b.onclick=openOwner;b.innerHTML='<span>✅</span><b>External Transaction Claims</b><small>Verify member proof and activate hierarchy payouts</small>';const grid=root.querySelector('.owner55Grid,.subs,.cards');if(grid)grid.prepend(b);else root.prepend(b)}catch(e){}}
function maintain(){decorateTables();injectOwnerButton()}
new MutationObserver(()=>setTimeout(maintain,40)).observe(document.documentElement,{childList:true,subtree:true});setInterval(maintain,1800);setTimeout(maintain,150);setTimeout(maintain,900);
window.DBEST_EXTERNAL_SUCCESS_CLAIMS={version:VERSION,open:openClaim,openOwner,review,maintain,isClaimable:claimable};
})();