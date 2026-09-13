(function(){
'use strict';
const VERSION='20260913-tx-pagination-v1';
if(window.DBEST_TX_PAGINATION?.version===VERSION)return;
const PAGE=20;
const stores=new Map();
let seq=0;

function escHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function money(v){const n=Number(v||0);return n?'₹'+n.toLocaleString('en-IN'):'—'}
function row(x,withDetails){
  return `<tr><td><b>${escHtml(x.id||'')}</b></td><td>${escHtml(x.user||'')}</td><td>${escHtml(x.section||'')}<br><small>${escHtml(x.sub||'')}</small></td><td>${escHtml(x.created||x.createdISO||'')}</td><td>${money(x.amount)}</td><td>${escHtml(x.status||'')}</td>${withDetails?`<td><button class="mini" onclick="txDetailsView('${escHtml(x.id||'')}')">View</button></td>`:''}</tr>`;
}
function shell(key,rows,total,withDetails){
  const headers=`<tr><th>Transaction ID</th><th>User</th><th>Section / Service</th><th>Date</th><th>Amount</th><th>Status</th>${withDetails?'<th>Details</th>':''}</tr>`;
  const more=total>rows.length?`<div style="padding:10px;text-align:center"><button class="btn soft" onclick="DBEST_TX_PAGINATION.more('${key}')">Load More (${total-rows.length} remaining)</button></div>`:'';
  return `<div class="table" data-dbest-tx-key="${key}"><table>${headers}${rows.map(x=>row(x,withDetails)).join('')}</table>${more}</div>`;
}
function paginatedTxTable(list){
  const a=Array.isArray(list)?list:[];
  if(!a.length)return '<div class="notice">No transactions yet.</div>';
  const copy=a.slice().sort((x,y)=>new Date(y.createdISO||y.created||0)-new Date(x.createdISO||x.created||0));
  const key='txp'+(++seq);
  const withDetails=typeof window.txDetailsView==='function';
  stores.set(key,{rows:copy,shown:Math.min(PAGE,copy.length),withDetails});
  return shell(key,copy.slice(0,PAGE),copy.length,withDetails);
}
function more(key){
  const s=stores.get(key);if(!s)return;
  s.shown=Math.min(s.rows.length,s.shown+PAGE);
  const host=document.querySelector(`[data-dbest-tx-key="${key}"]`);if(!host)return;
  const wrap=document.createElement('div');wrap.innerHTML=shell(key,s.rows.slice(0,s.shown),s.rows.length,s.withDetails);
  host.replaceWith(wrap.firstElementChild);
}
function install(){
  if(typeof window.txTable!=='function'||window.txTable.__dbestPaginated)return false;
  paginatedTxTable.__dbestPaginated=true;
  window.txTable=paginatedTxTable;
  return true;
}
let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>100)clearInterval(timer)},50);
window.DBEST_TX_PAGINATION={version:VERSION,more,install};
})();