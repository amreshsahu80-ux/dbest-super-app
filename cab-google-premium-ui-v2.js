(function(){
'use strict';
if(document.getElementById('dbcg-premium-ui-v2'))return;
const s=document.createElement('style');
s.id='dbcg-premium-ui-v2';
s.textContent=`
.dbcg{max-width:920px!important;padding:0 10px 42px!important}
.dbcgMap{height:330px!important;border-radius:26px!important;border:1px solid rgba(37,99,235,.14)!important;box-shadow:0 18px 48px rgba(15,23,42,.12)!important;background:linear-gradient(135deg,#eaf2ff,#f8fbff)!important}
.dbcgCard{margin:-34px 12px 0!important;border-radius:28px!important;padding:18px!important;border:1px solid rgba(255,255,255,.9)!important;background:rgba(255,255,255,.97)!important;box-shadow:0 22px 55px rgba(37,99,235,.17)!important;backdrop-filter:blur(14px)}
.dbcgTabs{background:#f3f6fb!important;padding:5px!important;border-radius:18px!important;gap:5px!important}
.dbcgTabs button{border:0!important;background:transparent!important;border-radius:14px!important;padding:13px 10px!important;color:#334155!important;font-weight:900!important}
.dbcgTabs button.on{background:linear-gradient(135deg,#1d4ed8,#2563eb 55%,#4f46e5)!important;color:#fff!important;box-shadow:0 8px 22px rgba(37,99,235,.28)!important}
.dbcgField{margin:11px 0!important}
.dbcgField input,.dbcgField select{min-height:54px!important;border:1px solid #d7e1ee!important;border-radius:17px!important;padding:14px 16px!important;background:#fff!important;font-size:16px!important;box-shadow:0 5px 14px rgba(15,23,42,.04)!important;transition:.2s ease!important}
.dbcgField input:focus,.dbcgField select:focus{outline:none!important;border-color:#3b82f6!important;box-shadow:0 0 0 4px rgba(59,130,246,.12)!important}
#dbcgP{border-left:5px solid #16a34a!important;padding-left:15px!important}
#dbcgD{border-left:5px solid #ef4444!important;padding-left:15px!important}
.dbcgTools{gap:10px!important;margin:8px 0 4px!important}
.dbcgTools button{min-height:48px!important;border-radius:15px!important;border:1px solid #dbe5f1!important;background:linear-gradient(180deg,#fff,#f7faff)!important;font-weight:850!important;color:#1e3a5f!important;box-shadow:0 5px 14px rgba(15,23,42,.05)!important}
#dbcgGps{color:#0f766e!important}
#dbcgSwap{color:#1d4ed8!important}
.dbcgSeg{background:#f6f8fc!important;padding:5px!important;border-radius:17px!important;gap:5px!important}
.dbcgSeg button{border:0!important;border-radius:13px!important;background:transparent!important;font-weight:850!important;color:#475569!important;padding:12px 8px!important}
.dbcgSeg button.on{background:#fff!important;color:#1d4ed8!important;box-shadow:0 5px 16px rgba(15,23,42,.09)!important}
.dbcgGo{min-height:56px!important;border-radius:18px!important;background:linear-gradient(135deg,#0f5cf5,#2563eb 55%,#5b4cf0)!important;box-shadow:0 14px 30px rgba(37,99,235,.32)!important;font-size:16px!important;letter-spacing:.1px!important;transition:.18s ease!important}
.dbcgGo:active{transform:translateY(1px) scale(.995)!important}
.dbcgProvider{display:inline-flex!important;align-items:center!important;gap:6px!important;margin-top:11px!important;padding:7px 10px!important;border-radius:999px!important;background:#eff6ff!important;color:#1e40af!important;border:1px solid #dbeafe!important;font-size:10px!important;font-weight:800!important}
.dbcgProvider:before{content:'●';color:#22c55e;font-size:9px}
.dbcgSuggest{border-radius:17px!important;border:1px solid #dce6f1!important;box-shadow:0 18px 36px rgba(15,23,42,.16)!important;overflow:hidden!important}
.dbcgSuggest button{padding:13px 14px!important;font-size:14px!important}
.dbcgMeta{gap:10px!important}
.dbcgMeta div{border-radius:16px!important;background:linear-gradient(145deg,#f8fbff,#eef5ff)!important;border:1px solid #d9e6f7!important;padding:12px!important}
.dbcgVeh{min-height:68px!important;border-radius:18px!important;border:1px solid #dce6f2!important;box-shadow:0 6px 18px rgba(15,23,42,.05)!important;transition:.18s ease!important;padding:13px!important}
.dbcgVeh:hover{border-color:#93c5fd!important;box-shadow:0 12px 28px rgba(37,99,235,.12)!important}
.dbcgVeh:active{transform:scale(.992)!important}
@media(max-width:600px){
 .dbcgMap{height:255px!important;border-radius:22px!important}
 .dbcgCard{margin:-26px 7px 0!important;border-radius:24px!important;padding:14px!important}
 .dbcgTabs button{padding:12px 6px!important;font-size:14px!important}
 .dbcgField input,.dbcgField select{min-height:52px!important;font-size:15px!important}
 .dbcgTools button{font-size:13px!important;padding:10px 7px!important}
 .dbcgGo{position:sticky!important;bottom:10px!important;z-index:30!important}
}
`;
document.head.appendChild(s);
})();