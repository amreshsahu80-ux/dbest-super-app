(function(){
  const cfg=window.DBEST_RUNTIME_CONFIG||{};
  const base=String(cfg.supabaseUrl||'').replace(/\/$/,''),key=cfg.supabasePublishableKey||'';
  if(!base||!key)return;
  let xlsxPromise=null,activeUrl='';

  function ownerToken(){try{return window.DBEST_OWNER_AUTH_BRIDGE?.getOwnerToken?.()||sessionStorage.getItem('dbest_owner_session_token')||''}catch(e){return''}}
  function notify(m){try{window.toast?window.toast(m):alert(m)}catch(e){alert(m)}}
  function scalar(v){
    if(v===null||v===undefined)return '';
    if(v instanceof Date)return v.toISOString();
    if(typeof v==='string'||typeof v==='number'||typeof v==='boolean')return v;
    try{return JSON.stringify(v)}catch(e){return String(v)}
  }
  function cleanRows(rows){
    const arr=Array.isArray(rows)?rows:[];
    if(!arr.length)return [{Message:'No records available'}];
    return arr.map(r=>{
      if(!r||typeof r!=='object'||Array.isArray(r))return {Value:scalar(r)};
      const out={};Object.keys(r).forEach(k=>out[k]=scalar(r[k]));return out;
    });
  }
  function scriptLoad(src){return new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src=src;s.async=true;s.onload=()=>resolve();s.onerror=()=>{s.remove();reject(new Error('load_failed'))};document.head.appendChild(s);
  })}
  async function loadXlsx(){
    if(window.XLSX)return window.XLSX;
    if(xlsxPromise)return xlsxPromise;
    xlsxPromise=(async()=>{
      const sources=[
        'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
        'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
      ];
      for(const src of sources){try{await scriptLoad(src);if(window.XLSX)return window.XLSX}catch(e){}}
      throw new Error('Excel engine could not load. Check internet connection and retry.');
    })();
    try{return await xlsxPromise}finally{if(!window.XLSX)xlsxPromise=null}
  }
  function buildSections(){
    try{if(Array.isArray(window.services))return window.services.map((s,i)=>Array.isArray(s)?{Section_ID:s[0]||'',Section_Name:s[1]||'',Icon:s[2]||'',Order:i+1,Status:'Visible'}:{Section_ID:s.id||'',Section_Name:s.name||s.title||'',Icon:s.icon||'',Order:i+1,Status:s.hidden?'Hidden':'Visible'})}catch(e){}
    return [];
  }
  function buildSubsections(){
    const rows=[];
    try{
      if(window.serviceSubs&&typeof window.serviceSubs==='object')Object.entries(window.serviceSubs).forEach(([sid,arr])=>(arr||[]).forEach((x,i)=>rows.push({Section_ID:sid,Subsection_ID:x?.id||x?.[0]||'',Subsection_Name:x?.name||x?.title||x?.[1]||String(x),Order:i+1})));
      if(!rows.length&&window.subsections&&typeof window.subsections==='object')Object.entries(window.subsections).forEach(([sid,arr])=>(arr||[]).forEach((x,i)=>rows.push({Section_ID:sid,Subsection_ID:x?.id||x?.[0]||'',Subsection_Name:x?.name||x?.title||x?.[1]||String(x),Order:i+1})));
    }catch(e){}
    return rows;
  }
  async function fetchReports(){
    const t=ownerToken();if(!t)throw new Error('Owner session expired. Please login again.');
    const r=await fetch(base+'/functions/v1/owner-report-data',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json','x-dbest-owner-token':t},body:'{}'});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Could not load live reports');
    d.sections=buildSections();d.subsections=buildSubsections();
    try{
      if(window.commerceConfig?.vendors?.length){
        const local=window.commerceConfig.vendors.map(v=>({Vendor_ID:v.id||'',Name:v.name||'',Email:v.email||'',Mobile:v.mobile||'',Category:v.type||v.category||'',Status:v.ownerApproval||v.status||'',Payment_Status:v.paymentStatus||'',GSTIN:v.gstin||v.gst||'',PAN:v.pan||'',Address:v.address||'',City:v.city||'',KYC_Status:v.kycStatus||'',Agreement_Status:v.agreement?.status||v.agreementStatus||'',Registered_At:v.createdAt||'',Updated_At:v.updatedAt||''}));
        const seen=new Set((d.vendors||[]).map(x=>String(x.Vendor_ID||'')));d.vendors=[...(d.vendors||[]),...local.filter(x=>!seen.has(String(x.Vendor_ID||'')))];
      }
    }catch(e){}
    return d;
  }
  function addSheet(XLSX,wb,name,rows){
    const arr=cleanRows(rows),ws=XLSX.utils.json_to_sheet(arr);
    if(ws['!ref'])ws['!autofilter']={ref:ws['!ref']};
    const heads=Object.keys(arr[0]||{});ws['!cols']=heads.map(k=>({wch:Math.min(42,Math.max(12,k.length+2,...arr.slice(0,150).map(r=>String(r[k]??'').length+2)))}));
    XLSX.utils.book_append_sheet(wb,ws,name.slice(0,31));
  }
  function dateTag(){const d=new Date();return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0')}
  function statusBox(){
    const modal=document.getElementById('dbestOwnerReportsModal');if(!modal)return null;
    let box=modal.querySelector('[data-master-download-status]');
    if(!box){box=document.createElement('div');box.setAttribute('data-master-download-status','1');box.style.cssText='margin-top:12px;padding:12px;border:1px solid #cfe0ff;border-radius:14px;background:#f7faff;text-align:center;font:600 13px system-ui;color:#40516c';const card=modal.firstElementChild;card?.appendChild(box)}
    return box;
  }
  function offerFile(blob,filename){
    if(activeUrl)try{URL.revokeObjectURL(activeUrl)}catch(e){}
    activeUrl=URL.createObjectURL(blob);
    const box=statusBox();
    if(box)box.innerHTML='✅ Master Excel is ready. <a data-master-save-link href="'+activeUrl+'" download="'+filename+'" style="display:inline-block;margin-left:6px;padding:8px 11px;border-radius:10px;background:#175cff;color:white;text-decoration:none;font-weight:800">Tap here to save Master Excel</a>';
    const a=document.createElement('a');a.href=activeUrl;a.download=filename;a.style.display='none';document.body.appendChild(a);
    try{a.click()}catch(e){}
    setTimeout(()=>a.remove(),1000);
    setTimeout(()=>{if(activeUrl){try{URL.revokeObjectURL(activeUrl)}catch(e){}activeUrl=''}},180000);
  }
  async function masterDownload(btn){
    const original=btn?.innerHTML||'⬇ Download Complete Master Excel';
    try{
      if(btn){btn.disabled=true;btn.innerHTML='⏳ Preparing Master Excel…'}
      const box=statusBox();if(box)box.textContent='Loading live Owner reports…';
      const [XLSX,d]=await Promise.all([loadXlsx(),fetchReports()]);
      if(box)box.textContent='Building Excel workbook…';
      const wb=XLSX.utils.book_new();
      const summary=[{Report:'Generated At',Records:d.generatedAt||new Date().toISOString()},{Report:'Sections',Records:(d.sections||[]).length},{Report:'Subsections',Records:(d.subsections||[]).length},{Report:'All Onboardings',Records:(d.onboardings||[]).length},{Report:'Members',Records:(d.members||[]).length},{Report:'Vendors',Records:(d.vendors||[]).length},{Report:'Vaahaks',Records:(d.vaahaks||[]).length},{Report:'Payments',Records:(d.payments||[]).length},{Report:'Transactions',Records:(d.transactions||[]).length},{Report:'Ride Jobs',Records:(d.rides||[]).length}];
      addSheet(XLSX,wb,'Summary',summary);addSheet(XLSX,wb,'Sections',d.sections||[]);addSheet(XLSX,wb,'Subsections',d.subsections||[]);addSheet(XLSX,wb,'All_Onboardings',d.onboardings||[]);addSheet(XLSX,wb,'Members',d.members||[]);addSheet(XLSX,wb,'Vendors',d.vendors||[]);addSheet(XLSX,wb,'Vaahaks',d.vaahaks||[]);addSheet(XLSX,wb,'Payments',d.payments||[]);addSheet(XLSX,wb,'Transactions',d.transactions||[]);addSheet(XLSX,wb,'Ride_Jobs',d.rides||[]);
      const bytes=XLSX.write(wb,{bookType:'xlsx',type:'array',compression:true});
      const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const filename='DBest_Owner_Master_Report_'+dateTag()+'.xlsx';
      offerFile(blob,filename);
      notify('Master Excel is ready. If it did not download automatically, tap the blue save link.');
    }catch(e){
      const box=statusBox();if(box)box.textContent='❌ '+(e.message||'Master Excel download failed');
      notify(e.message||'Master Excel download failed');
      console.error('DBest master Excel error',e);
    }finally{if(btn){btn.disabled=false;btn.innerHTML=original}}
  }
  document.addEventListener('click',function(e){
    const btn=e.target.closest?.('#dbestOwnerReportsModal [data-all]');if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();masterDownload(btn);
  },true);
  window.DBEST_OWNER_MASTER_EXCEL_FIX={version:'2.0.0',download:masterDownload};
})();