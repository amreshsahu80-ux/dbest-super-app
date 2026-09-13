(function(){
'use strict';
const VERSION='20260913-member-dashboard-table-perf-v1';
if(window.DBEST_MEMBER_TABLE_PERF?.version===VERSION)return;
const PAGE=20;
let cacheSeq=0;
const cache=new Map();
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function row(x,withDetails){return `<tr><td><b>${esc(x.id)}</b></td><td>${esc(x.user||'')}</td><td>${esc(x.section)}<br><small>${esc(x.sub||'')}</small></td><td>${esc(x.created||'')}</td><td>${Number(x.amount||0)?('₹'+Number(x.amount).toLocaleString('en-IN')):'—'}</td><td>${esc(x.status||'')}</td>${withDetails?`<td><button class="mini" onclick="txDetailsView('${esc(x.id)}')">View</button></td>`:''}</tr>`}
function make(a,withDetails=true){
 if(!Array.isArray(a)||!a.length)return '<div class="notice">No transactions yet.</div>';
 const id='dbestTxPerf'+(++cacheSeq);cache.set(id,{rows:a.slice(),shown:Math.min(PAGE,a.length),withDetails});
 const first=a.slice(0,PAGE).map(x=>row(x,withDetails)).join('');
 const more=a.length>PAGE?`<div style="padding:12px;text-align:center"><button class="btn soft" onclick="DBEST_MEMBER_TABLE_PERF.more('${id}')">Load more (${a.length-PAGE} remaining)</button></div>`:'';
 return `<div class="table dbestPagedTx" id="${id}"><table><tbody><tr><th>Transaction ID</th><th>User</th><th>Section / Service</th><th>Date</th><th>Amount</th><th>Status</th>${withDetails?'<th>Details</th>':''}</tr>${first}</tbody></table>${more}</div>`;
}
function more(id){const state=cache.get(id),root=document.getElementById(id);if(!state||!root)return;const tbody=root.querySelector('tbody');const start=state.shown,end=Math.min(start+PAGE,state.rows.length);tbody.insertAdjacentHTML('beforeend',state.rows.slice(start,end).map(x=>row(x,state.withDetails)).join(''));state.shown=end;const box=root.querySelector(':scope > div:last-child');if(box){if(end>=state.rows.length)box.remove();else{const b=box.querySelector('button');if(b)b.textContent=`Load more (${state.rows.length-end} remaining)`}}}
function install(){if(typeof window.txTable!=='function'||window.txTable.__dbestPaged)return false;const patched=function(a){return make(a,true)};patched.__dbestPaged=true;window.txTable=patched;return true}
let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>100)clearInterval(timer)},80);
window.DBEST_MEMBER_TABLE_PERF={version:VERSION,more,render:make};
})();