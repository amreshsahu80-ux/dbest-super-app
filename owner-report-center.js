(function(){
  const cfg=window.DBEST_RUNTIME_CONFIG||{};
  const base=cfg.supabaseUrl,key=cfg.supabasePublishableKey;
  if(!base||!key)return;
  let loadingXlsx=false;

  function ownerToken(){try{return window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.()||sessionStorage.getItem('dbest_owner_session_token')||''}catch(e){return''}}
  function toastMsg(m){try{window.toast?window.toast(m):alert(m)}catch(e){alert(m)}}
  async function loadXlsx(){
    if(window.XLSX)return;
    if(loadingXlsx){while(loadingXlsx)await new Promise(r=>setTimeout(r,100));return}
    loadingXlsx=true;
    try{await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}finally{loadingXlsx=false}
    if(!window.XLSX)throw new Error('Excel engine could not load. Please check internet and retry.');
  }
  async function fetchReports(){
    const t=ownerToken(); if(!t)throw new Error('Owner session expired. Please login again.');
    const r=await fetch(base+'/functions/v1/owner-report-data',{method:'POST',headers:{'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json','x-dbest-owner-token':t},body:'{}'});
    const d=await r.json().catch(()=>({})); if(!r.ok)throw new Error(d.error||'Could not load live reports');
    d.sections=buildSections(); d.subsections=buildSubsections();
    try{
      if(window.commerceConfig?.vendors?.length){
        const local=window.commerceConfig.vendors.map(v=>({Vendor_ID:v.id||'',Name:v.name||'',Email:v.email||'',Mobile:v.mobile||'',Category:v.type||v.category||'',Status:v.ownerApproval||v.status||'',Payment_Status:v.paymentStatus||'',GSTIN:v.gstin||v.gst||'',PAN:v.pan||'',Address:v.address||'',City:v.city||'',KYC_Status:v.kycStatus||'',Agreement_Status:v.agreement?.status||v.agreementStatus||'',Registered_At:v.createdAt||'',Updated_At:v.updatedAt||''}));
        const seen=new Set((d.vendors||[]).map(x=>String(x.Vendor_ID||''))); d.vendors=[...(d.vendors||[]),...local.filter(x=>!seen.has(String(x.Vendor_ID||'')))];
      }
    }catch(e){}
    return d;
  }
  function buildSections(){
    try{
      if(Array.isArray(window.services))return window.services.map((s,i)=>Array.isArray(s)?{Section_ID:s[0]||'',Section_Name:s[1]||'',Icon:s[2]||'',Order:i+1,Status:'Visible'}:{Section_ID:s.id||'',Section_Name:s.name||s.title||'',Icon:s.icon||'',Order:i+1,Status:s.hidden?'Hidden':'Visible'});
    }catch(e){}
    return [];
  }
  function buildSubsections(){
    const rows=[];
    try{
      if(window.serviceSubs&&typeof window.serviceSubs==='object')Object.entries(window.serviceSubs).forEach(([sid,arr])=>(arr||[]).forEach((x,i)=>rows.push({Section_ID:sid,Subsection_ID:x.id||x[0]||'',Subsection_Name:x.name||x.title||x[1]||String(x),Order:i+1})));
      if(!rows.length&&window.subsections&&typeof window.subsections==='object')Object.entries(window.subsections).forEach(([sid,arr])=>(arr||[]).forEach((x,i)=>rows.push({Section_ID:sid,Subsection_ID:x.id||x[0]||'',Subsection_Name:x.name||x.title||x[1]||String(x),Order:i+1})));
    }catch(e){}
    return rows;
  }
  function safeSheet(rows){const arr=Array.isArray(rows)&&rows.length?rows:[{Message:'No records available'}];const ws=XLSX.utils.json_to_sheet(arr);if(ws['!ref'])ws['!autofilter']={ref:ws['!ref']};const h=Object.keys(arr[0]||{});ws['!cols']=h.map(k=>({wch:Math.min(42,Math.max(12,k.length+2,...arr.slice(0,200).map(r=>String(r[k]??'').length+2)))}));return ws}
  function add(wb,name,rows){XLSX.utils.book_append_sheet(wb,safeSheet(rows),name.slice(0,31))}
  function dateTag(){const d=new Date();return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0')}
  async function download(kind,label){try{toastMsg('Preparing '+label+' Excel…');await loadXlsx();const d=await fetchReports();const wb=XLSX.utils.book_new();add(wb,label,d[kind]||[]);XLSX.writeFile(wb,'DBest_'+label.replace(/[^A-Za-z0-9]+/g,'_')+'_'+dateTag()+'.xlsx');toastMsg(label+' downloaded')}catch(e){toastMsg(e.message||'Download failed')}}
  async function downloadAll(){try{toastMsg('Preparing complete DBest owner workbook…');await loadXlsx();const d=await fetchReports();const wb=XLSX.utils.book_new();const summary=[{Report:'Generated At',Records:d.generatedAt||new Date().toISOString()},{Report:'Sections',Records:(d.sections||[]).length},{Report:'Subsections',Records:(d.subsections||[]).length},{Report:'All Onboardings',Records:(d.onboardings||[]).length},{Report:'Members',Records:(d.members||[]).length},{Report:'Vendors',Records:(d.vendors||[]).length},{Report:'Vaahaks',Records:(d.vaahaks||[]).length},{Report:'Payments',Records:(d.payments||[]).length},{Report:'Transactions',Records:(d.transactions||[]).length},{Report:'Ride Jobs',Records:(d.rides||[]).length}];add(wb,'Summary',summary);add(wb,'Sections',d.sections||[]);add(wb,'Subsections',d.subsections||[]);add(wb,'All_Onboardings',d.onboardings||[]);add(wb,'Members',d.members||[]);add(wb,'Vendors',d.vendors||[]);add(wb,'Vaahaks',d.vaahaks||[]);add(wb,'Payments',d.payments||[]);add(wb,'Transactions',d.transactions||[]);add(wb,'Ride_Jobs',d.rides||[]);XLSX.writeFile(wb,'DBest_Owner_Master_Report_'+dateTag()+'.xlsx');toastMsg('Complete Excel workbook downloaded')}catch(e){toastMsg(e.message||'Download failed')}}
  function openReportCenter(){
    document.getElementById('dbestOwnerReportsModal')?.remove();
    const m=document.createElement('div');m.id='dbestOwnerReportsModal';m.style.cssText='position:fixed;inset:0;z-index:13000;background:#0009;overflow:auto;padding:18px;display:flex;align-items:flex-start;justify-content:center';
    const cards=[['sections','Sections','🧩','All main platform sections'],['subsections','Subsections','🗂️','All subsections/service entries'],['transactions','Transactions','🧾','All live transactions with section/subsection'],['onboardings','All Onboardings','🧭','Members, vendors and onboarding records'],['members','Members','👥','Member, hierarchy, KYC and membership data'],['vendors','Vendors','🏪','Vendor onboarding and approvals'],['vaahaks','Vaahaks','🛵','Vaahak onboarding and status'],['payments','Payments','💳','Payment status, amount and references'],['rides','Ride Jobs','🚕','Cab/ride jobs and status']];
    m.innerHTML=`<div style="width:min(980px,100%);background:white;border-radius:22px;padding:18px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div><h2 style="margin:0">📊 Reports & Excel</h2><small style="color:#687386">Owner-only live reports for sections, subsections, transactions and onboardings</small></div><button class="btn soft" data-close>← Back</button></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-top:18px">${cards.map(c=>`<button class="owner55Action" data-kind="${c[0]}" data-label="${c[1]}"><span>${c[2]}</span><b>${c[1]}</b><small>${c[3]}</small></button>`).join('')}</div><button class="btn" style="width:100%;margin-top:16px;padding:14px" data-all>⬇ Download Complete Master Excel</button><div style="font-size:12px;color:#687386;margin-top:9px;text-align:center">Master workbook contains separate sheets for Sections, Subsections, All Onboardings, Members, Vendors, Vaahaks, Payments, Transactions and Ride Jobs.</div></div>`;
    document.body.appendChild(m);m.querySelector('[data-close]').onclick=()=>m.remove();m.onclick=e=>{if(e.target===m)m.remove()};m.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>download(b.dataset.kind,b.dataset.label));m.querySelector('[data-all]').onclick=downloadAll;
  }
  window.ownerReportCenter=openReportCenter;
  function inject(){try{if(!window.session||session.role!=='owner')return;const root=document.querySelector('.sectionContent.owner55');if(!root)return;let b=document.getElementById('dbestOwnerReportsBtn');if(!b){b=document.createElement('button');b.id='dbestOwnerReportsBtn';b.className='owner55Action';b.innerHTML='<span>📊</span><b>Reports & Excel</b><small>Download sections, subsections, transactions, onboardings and operations in Excel.</small>';const grid=root.querySelector('.owner55Grid')||root;grid.appendChild(b)}b.onclick=openReportCenter}catch(e){}}
  const obs=new MutationObserver(()=>setTimeout(inject,40));obs.observe(document.body,{childList:true,subtree:true});document.addEventListener('click',()=>setTimeout(inject,80),true);setTimeout(inject,300);
})();