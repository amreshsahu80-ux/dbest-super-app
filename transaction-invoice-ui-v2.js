(function(){
'use strict';
const SUCCESS_RE=/(payment\s*(verified|successful|success)|\bverified\b|\bpaid\b|\bsettled\b|\bcaptured\b|\bsuccessful\b|\bcompleted\b)/i;
const BLOCK_RE=/(payment due|due at delivery|pending|awaiting|processing|failed|cancelled|canceled|rejected|declined|refunded|reversed|unpaid)/i;
function txt(el){return String(el&&el.textContent||'').replace(/\s+/g,' ').trim()}
function pageEligible(){const t=txt(document.body);return /Transaction Details/i.test(t)&&SUCCESS_RE.test(t)&&!BLOCK_RE.test(t)}
function getVal(label){
  const nodes=[...document.querySelectorAll('body *')];
  const lab=nodes.find(n=>n.children.length===0&&new RegExp('^'+label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$','i').test(txt(n)));
  if(!lab)return '';
  const box=lab.closest('.card,.notice,.orderStatusCard,div');
  if(!box)return '';
  const all=txt(box).replace(new RegExp('^'+label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'),'').trim();
  return all;
}
function txId(){const m=txt(document.body).match(/(?:Transaction ID\s*)?(MKT_[A-Za-z0-9_]+|TX\d{6,})/i);return m?m[1]:''}
function buildInvoice(){
 const id=txId(), date=getVal('Date / Time')||new Date().toLocaleString('en-IN'), user=getVal('User'), status=getVal('Status')||'Payment Verified', section=getVal('Section'), sub=getVal('Service / Subsection');
 let amount=''; const body=txt(document.body); const am=body.match(/(?:Amount|Total)\s*₹\s*([0-9,]+(?:\.\d{1,2})?)/i); if(am) amount='₹'+am[1];
 const payment=(body.match(/(?:Payment Mode|Method)\s*([^₹]{2,40})/i)||[])[1]||'Online Payment';
 const w=window.open('','_blank'); if(!w){alert('Please allow pop-ups to view the invoice/receipt.');return;}
 const esc=s=>String(s||'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DBest Invoice ${esc(id)}</title><style>body{font-family:Arial,sans-serif;margin:0;background:#f4f7fb;color:#14213d}.sheet{max-width:760px;margin:24px auto;background:white;padding:28px;border-radius:18px}.head{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #175cff;padding-bottom:18px}.brand h1{margin:0;color:#175cff}.muted{color:#667085;font-size:13px}.badge{background:#eaf7ef;color:#18794e;padding:8px 12px;border-radius:999px;font-weight:700;height:max-content}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:22px}.cell{border:1px solid #e4e7ec;border-radius:12px;padding:12px}.cell small{display:block;color:#667085;margin-bottom:5px}.cell b{word-break:break-word}.total{margin-top:20px;padding:16px;background:#f2f6ff;border-radius:12px;display:flex;justify-content:space-between;font-size:20px;font-weight:800}.note{margin-top:18px;font-size:12px;color:#667085}.actions{margin-top:20px}.actions button{border:0;background:#175cff;color:#fff;padding:11px 16px;border-radius:9px;font-weight:700}@media print{body{background:white}.sheet{margin:0;max-width:none}.actions{display:none}}</style></head><body><div class="sheet"><div class="head"><div class="brand"><h1>DBest</h1><div class="muted">Sarwashresth Services OPC Pvt. Ltd.</div><div class="muted">Payment Receipt / Invoice</div></div><div class="badge">PAYMENT CONFIRMED</div></div><div class="grid"><div class="cell"><small>DBest Transaction ID</small><b>${esc(id)}</b></div><div class="cell"><small>Date / Time</small><b>${esc(date)}</b></div><div class="cell"><small>Customer / Member</small><b>${esc(user)}</b></div><div class="cell"><small>Status</small><b>${esc(status)}</b></div><div class="cell"><small>Section</small><b>${esc(section)}</b></div><div class="cell"><small>Service / Subsection</small><b>${esc(sub)}</b></div><div class="cell"><small>Payment Method</small><b>${esc(payment)}</b></div></div><div class="total"><span>Total Paid</span><span>${esc(amount||'Paid')}</span></div><div class="note">Generated only after successful payment confirmation in DBest. This document is not available for pending, unpaid, failed, cancelled or pay-at-delivery orders before payment.</div><div class="actions"><button onclick="window.print()">Print / Save PDF</button></div></div></body></html>`); w.document.close();
}
function inject(){
 if(!pageEligible())return;
 if(document.getElementById('dbestInvoiceReceiptBtn'))return;
 const root=[...document.querySelectorAll('h1,h2,h3,div')].find(e=>/Transaction Details/i.test(txt(e)));
 if(!root)return;
 const btn=document.createElement('button'); btn.id='dbestInvoiceReceiptBtn';btn.type='button';btn.className='btn';btn.textContent='🧾 View Invoice / Receipt';btn.style.cssText='display:block;width:calc(100% - 32px);max-width:680px;margin:16px auto;padding:13px 16px';btn.onclick=buildInvoice;
 const host=document.querySelector('.sectionContent')||root.parentElement||document.body; host.appendChild(btn);
}
new MutationObserver(()=>setTimeout(inject,20)).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
setTimeout(inject,300);setTimeout(inject,1200);
window.DBEST_TX_INVOICE_UI={inject,buildInvoice,pageEligible};
})();