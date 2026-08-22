(function(){
  const cfg=window.DBEST_RUNTIME_CONFIG||{};
  const base=cfg.supabaseUrl,key=cfg.supabasePublishableKey;
  if(!base||!key)return;

  let xlsxReady=false,loadingXlsx=false;

  function ownerToken(){
    try{return window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.()||sessionStorage.getItem('dbest_owner_session_token')||''}catch(e){return''}
  }

  function toastMsg(m){
    try{window.toast?window.toast(m):alert(m)}catch(e){alert(m)}
  }

  async function loadXlsx(){
    if(window.XLSX){xlsxReady=true;return}
    if(loadingXlsx){while(loadingXlsx)await new Promise(r=>setTimeout(r,100));return}
    loadingXlsx=true;
    await new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
    }).finally(()=>loadingXlsx=false);
    xlsxReady=!!window.XLSX;
    if(!xlsxReady)throw new Error('Excel library could not load');
  }

  async function fetchReports(){
    const t=ownerToken();
    if(!t)throw new Error('Owner session expired. Please login again.');
    const r=await fetch(base+'/functions/v1/owner-report-data',{
      method:'POST',
      headers:{'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json','x-dbest-owner-token':t},
      body:'{}'
    });
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||'Could not load reports');

    try{
      if(window.commerceConfig?.vendors?.length){
        const local=window.commerceConfig.vendors.map(v=>({
          Vendor_ID:v.id||'',Name:v.name||'',Email:v.email||'',Mobile:v.mobile||'',Category:v.type||v.category||'',Status:v.ownerApproval||v.status||'',Payment_Status:v.paymentStatus||'',GSTIN:v.gstin||v.gst||'',PAN:v.pan||'',Address:v.address||'',City:v.city||'',KYC_Status:v.kycStatus||'',Agreement_Status:v.agreement?.status||v.agreementStatus||'',Registered_At:v.createdAt||'',Updated_At:v.updatedAt||''
        }));
        const seen=new Set((d.vendors||[]).map(x=>String(x.Vendor_ID||'')));
        d.vendors=[...(d.vendors||[]),...local.filter(x=>!seen.has(String(x.Vendor_ID||'')))];
      }
    }catch(e){}

    d.onboardings=buildAllOnboardings(d);
    return d;
  }

  function buildAllOnboardings(d){
    const rows=[];
    const seen=new Set();
    const push=(r)=>{
      const key=[r.Entity_Type||'',r.Entity_ID||'',r.Email||'',r.Mobile||'',r.Name||''].join('|').toLowerCase();
      if(seen.has(key))return;
      seen.add(key);rows.push(r);
    };

    (d.onboardings||[]).forEach(push);

    (d.vendors||[]).forEach(v=>push({
      Entity_Type:'vendor',Entity_ID:v.Vendor_ID||'',Name:v.Name||'',Email:v.Email||'',Mobile:v.Mobile||'',Category:v.Category||'',Status:v.Status||'',Payment_Status:v.Payment_Status||'',Payment_Amount:'',Payment_Reference:'',Email_Verified:'',KYC_Status:v.KYC_Status||'',Agreement_Status:v.Agreement_Status||'',Referral_Code:'',Upline:'',City:v.City||'',Address:v.Address||'',GSTIN:v.GSTIN||'',PAN:v.PAN||'',Aadhaar:'',Registered_At:v.Registered_At||'',Updated_At:v.Updated_At||''
    }));

    (d.vaahaks||[]).forEach(v=>push({
      Entity_Type:'vaahak',Entity_ID:v.Vaahak_ID||'',Name:v.Name||'',Email:v.Email||'',Mobile:v.Mobile||'',Category:v.Vehicle||'',Status:v.Owner_Approval||'',Payment_Status:'',Payment_Amount:'',Payment_Reference:'',Email_Verified:'',KYC_Status:'',Agreement_Status:v.Agreement_Status||'',Referral_Code:'',Upline:'',City:'',Address:'',GSTIN:'',PAN:'',Aadhaar:'',Registered_At:v.Registered_At||'',Updated_At:v.Updated_At||''
    }));

    return rows;
  }

  function safeSheet(rows){
    const arr=Array.isArray(rows)&&rows.length?rows:[{Message:'No records available'}];
    const ws=XLSX.utils.json_to_sheet(arr);
    if(ws['!ref'])ws['!autofilter']={ref:ws['!ref']};
    const headers=Object.keys(arr[0]||{});
    ws['!cols']=headers.map(h=>({wch:Math.min(40,Math.max(12,h.length+2,...arr.slice(0,200).map(r=>String(r[h]??'').length+2)))}));
    return ws;
  }

  function fileDate(){
    const d=new Date();
    return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
  }

  function rowsFor(d,kind){
    if(kind==='onboardings')return d.onboardings||[];
    return d[kind]||[];
  }

  function appendSheet(wb,name,rows){
    XLSX.utils.book_append_sheet(wb,safeSheet(rows),name.slice(0,31));
  }

  async function downloadOne(kind,label){
    try{
      toastMsg('Preparing '+label+' Excel report…');
      await loadXlsx();
      const d=await fetchReports();
      const wb=XLSX.utils.book_new();
      appendSheet(wb,label,rowsFor(d,kind));
      XLSX.writeFile(wb,'DBest_'+label.replace(/[^A-Za-z0-9]+/g,'_')+'_'+fileDate()+'.xlsx');
      toastMsg(label+' report downloaded');
    }catch(e){toastMsg(e.message||'Report download failed')}
  }

  async function downloadAll(){
    try{
      toastMsg('Preparing complete DBest Excel workbook…');
      await loadXlsx();
      const d=await fetchReports();
      const wb=XLSX.utils.book_new();
      const summary=[
        {Report:'Generated At',Records:d.generatedAt||new Date().toISOString()},
        {Report:'All Onboardings',Records:(d.onboardings||[]).length},
        {Report:'Members',Records:(d.members||[]).length},
        {Report:'Vendors',Records:(d.vendors||[]).length},
        {Report:'Vaahaks',Records:(d.vaahaks||[]).length},
        {Report:'Payments',Records:(d.payments||[]).length},
        {Report:'Transactions',Records:(d.transactions||[]).length},
        {Report:'Ride Jobs',Records:(d.rides||[]).length}
      ];
      appendSheet(wb,'Summary',summary);
      appendSheet(wb,'All_Onboardings',d.onboardings||[]);
      appendSheet(wb,'Payments',d.payments||[]);
      appendSheet(wb,'Transactions',d.transactions||[]);
      appendSheet(wb,'Members',d.members||[]);
      appendSheet(wb,'Vendors',d.vendors||[]);
      appendSheet(wb,'Vaahaks',d.vaahaks||[]);
      appendSheet(wb,'Ride_Jobs',d.rides||[]);
      XLSX.writeFile(wb,'DBest_Owner_Master_Report_'+fileDate()+'.xlsx');
      toastMsg('Master Excel report downloaded');
    }catch(e){toastMsg(e.message||'Report download failed')}
  }

  function openReportCenter(){
    document.getElementById('dbestOwnerReportsModal')?.remove();
    const m=document.createElement('div');
    m.id='dbestOwnerReportsModal';
    m.style.cssText='position:fixed;inset:0;z-index:12000;background:#0009;overflow:auto;padding:20px;display:flex;align-items:flex-start;justify-content:center';
    m.innerHTML=`<div style="width:min(940px,100%);background:#fff;border-radius:22px;padding:18px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><h2 style="margin:0">📊 Owner Reports & Excel</h2><small style="color:#687386">Download live backend reports for onboardings, payments and transactions</small></div><button class="btn soft" data-close>← Back</button></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:18px">
      <button class="owner55Action" data-kind="onboardings"><span>🧭</span><b>All Onboardings</b><small>Combined member, vendor, Vaahak and future onboarding records.</small></button>
      <button class="owner55Action" data-kind="payments"><span>💳</span><b>All Payments</b><small>Onboarding/membership payment amount, status and references.</small></button>
      <button class="owner55Action" data-kind="transactions"><span>🧾</span><b>All Transactions</b><small>Service/payment transactions, modes, references and payouts.</small></button>
      <button class="owner55Action" data-kind="members"><span>👥</span><b>Members</b><small>Member IDs, hierarchy refs, KYC, status and membership details.</small></button>
      <button class="owner55Action" data-kind="vendors"><span>🏪</span><b>Vendors</b><small>Vendor onboarding, KYC, approval and agreement status.</small></button>
      <button class="owner55Action" data-kind="vaahaks"><span>🛵</span><b>Vaahaks</b><small>Partner onboarding, approval, vehicle, availability and rating.</small></button>
      <button class="owner55Action" data-kind="rides"><span>🚕</span><b>Ride Jobs</b><small>Ride/job IDs, status, fare, customer and Vaahak assignment.</small></button>
    </div><button class="btn" style="width:100%;margin-top:16px;padding:14px" data-all>⬇ Download Complete Master Excel</button><div style="font-size:12px;color:#687386;margin-top:8px;text-align:center">Master workbook includes Summary, All Onboardings, Payments, Transactions, Members, Vendors, Vaahaks and Ride Jobs sheets.</div></div>`;
    document.body.appendChild(m);
    m.querySelector('[data-close]').onclick=()=>m.remove();
    m.onclick=e=>{if(e.target===m)m.remove()};
    const map={onboardings:'All_Onboardings',members:'Members',payments:'Payments',transactions:'Transactions',vaahaks:'Vaahaks',vendors:'Vendors',rides:'Ride_Jobs'};
    m.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>downloadOne(b.dataset.kind,map[b.dataset.kind]));
    m.querySelector('[data-all]').onclick=downloadAll;
  }

  window.ownerReportCenter=openReportCenter;

  function inject(){
    try{
      if(!window.session||session.role!=='owner')return;
      const root=document.querySelector('.sectionContent.owner55');
      if(!root)return;

      const existing=[...root.querySelectorAll('button.owner55Action')].find(b=>/Reports\s*&\s*(?:CSV\s*\/\s*)?Excel/i.test(b.innerText||'')||/Reports\s*&\s*Excel/i.test(b.innerText||''));
      if(existing){
        existing.id='dbestOwnerReportsBtn';
        existing.removeAttribute('onclick');
        existing.innerHTML='<span>📊</span><b>Reports & Excel</b><small>Download all onboardings, payments, transactions and operational reports in Excel.</small>';
        existing.onclick=openReportCenter;
        return;
      }

      if(document.getElementById('dbestOwnerReportsBtn'))return;
      const grids=[...root.querySelectorAll('.owner55Grid')];
      const target=grids[0]||root;
      const b=document.createElement('button');
      b.id='dbestOwnerReportsBtn';b.className='owner55Action';
      b.innerHTML='<span>📊</span><b>Reports & Excel</b><small>Download all onboardings, payments, transactions and operational reports in Excel.</small>';
      b.onclick=openReportCenter;target.appendChild(b);
    }catch(e){}
  }

  const obs=new MutationObserver(()=>setTimeout(inject,40));
  obs.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',()=>setTimeout(inject,80),true);
  setTimeout(inject,300);
})();