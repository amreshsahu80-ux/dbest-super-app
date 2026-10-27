/* DBest isolated hotel supplier-quote triage. No network, storage, booking or publishing. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DBestTariffReview = api;
})(typeof window === 'object' ? window : undefined, function () {
  'use strict';
  const required = ['Rate ID','Hotel ID','Hotel / Property','Room Category','Occupancy','Supplier Quote INR','Taxes / GST','Meal Plan','Validity','Cancellation','Source Email ID','Original Review Status','Owner Decision','Publication Gate'];
  const rateHistoryRequired = ['Rate ID','Hotel ID','Hotel Name','Email Message ID','Room Category','Occupancy','Rate INR','Taxes','Meal Plan','Validity','Confidence / Review Status'];
  const allowed = ['HOLD','VERIFY','REJECT'];
  function parseCSV(raw) {
    const text = String(raw || '').replace(/^\uFEFF/, '');
    if (text.length > 8000000) throw new Error('CSV is too large; limit is 8 MB.');
    const rows=[]; let row=[],cell='',quoted=false,justClosed=false;
    for(let i=0;i<text.length;i++){
      const ch=text[i];
      if(quoted){
        if(ch==='"' && text[i+1]==='"'){cell+='"';i++;}
        else if(ch==='"'){quoted=false;justClosed=true;}
        else cell+=ch;
      } else if(justClosed && ch!==',' && ch!=='\r' && ch!=='\n'){
        if(ch!==' ' && ch!=='\t')throw new Error('Malformed quote in CSV field.');
      } else if(ch==='"'){
        if(cell!=='')throw new Error('Malformed quote in CSV field.');
        quoted=true;
      } else if(ch===','){row.push(cell);cell='';justClosed=false;}
      else if(ch==='\r'||ch==='\n'){
        if(ch==='\r' && text[i+1]==='\n')i++;
        row.push(cell);if(row.some(x=>String(x).trim()!=='')) rows.push(row);
        row=[];cell='';justClosed=false;
        if(rows.length>10000)throw new Error('CSV exceeds 10,000 rows.');
      } else cell+=ch;
      if(cell.length>30000)throw new Error('CSV field exceeds 30,000 characters.');
    }
    if(quoted)throw new Error('Unclosed quoted CSV field.');
    row.push(cell);if(row.some(x=>String(x).trim()!==''))rows.push(row);
    return rows;
  }
  function importQueue(csv) {
    const rows=parseCSV(csv);
    if(!rows.length)throw new Error('The review queue file is empty.');
    const header=rows.shift().map(h=>String(h).trim());
    if(new Set(header).size!==header.length)throw new Error('Duplicate CSV header names');
    const isApproval=required.every(h=>header.includes(h));
    const isHistory=!isApproval && rateHistoryRequired.every(h=>header.includes(h));
    if(!isApproval&&!isHistory){
      const missing=required.filter(h=>!header.includes(h));
      throw new Error('Missing review queue columns: '+missing.join(', ')+'. Alternatively export the full Rate History tab from the Hotel Contracting master.');
    }
    const sourceType=isApproval?'owner_approval_queue':'hotel_rate_history';
    const index=Object.fromEntries(header.map((h,i)=>[h,i]));
    const records=[],warnings=[],ids=new Set();
    rows.forEach((r,idx)=>{
      function get(h){return String(r[index[h]]??'').trim();}
      const id=get('Rate ID'),hotelId=get('Hotel ID');
      const hotel=get(isApproval?'Hotel / Property':'Hotel Name');
      if(!id||!hotelId||!hotel){warnings.push('Row '+(idx+2)+' skipped: missing identity.');return;}
      if(ids.has(id)){warnings.push('Row '+(idx+2)+' skipped: duplicate Rate ID '+id.slice(0,40));return;}
      ids.add(id);
      const quoted=get(isApproval?'Supplier Quote INR':'Rate INR');
      const numeric=quoted.replace(/,/g,'');
      const amount=numeric && /^\d+(?:\.\d{1,2})?$/.test(numeric) ? Number(numeric) : null;
      if(!Number.isFinite(amount)||amount<=0)warnings.push('Row '+(idx+2)+': rate missing or nonnumeric; cannot confirm tariff.');
      // Imported source flags never become Owner approvals. Both formats stay on HOLD.
      records.push({
        id, hotelId,hotel,room:get('Room Category'),
        occupancy:get('Occupancy'),amount:Number.isFinite(amount)&&amount>0?amount:null,
        taxes:get(isApproval?'Taxes / GST':'Taxes'),meal:get('Meal Plan'),validity:get('Validity'),
        cancellation:get('Cancellation'),sourceReference:get(isApproval?'Source Email ID':'Email Message ID'),
        sourceReview:get(isApproval?'Original Review Status':'Confidence / Review Status'),
        sourceDecision:isApproval?get('Owner Decision'):'NOT_REVIEWED',
        sourceGate:isApproval?get('Publication Gate'):'HOLD',
        sourceType,decision:'HOLD',note:'',reviewer:'',reviewedAt:''
      });
    });
    return {records,warnings,count:records.length,publicationEnabled:false,sourceType};
  }
  function decide(record,decision,note,reviewer,stamp) {
    if(!record||!allowed.includes(decision))throw new Error('Invalid review decision.');
    if(decision==='VERIFY' && String(note||'').trim().length<12)throw new Error('Verification requires a note of at least 12 characters.');
    record.decision=decision;
    record.note=String(note||'').slice(0,1000).trim();
    record.reviewer=String(reviewer||'').slice(0,120).trim();
    record.reviewedAt=stamp||new Date().toISOString();
    return record;
  }
  function summary(records) {
    const list=Array.isArray(records)?records:[];
    const by={HOLD:0,VERIFY:0,REJECT:0};
    list.forEach(r=>{if(Object.prototype.hasOwnProperty.call(by,r.decision))by[r.decision]++;});
    return {total:list.length,...by,publishable:0,serverApproved:0};
  }
  function csvCell(value){
    let str=String(value==null?'':value);
    if(/^[\s]*[=+\-@]/.test(str)) str="'"+str; // block spreadsheet formula injection
    return '"'+str.replace(/"/g,'""')+'"';
  }
  function exportDecisions(records){
    const heads=['Rate ID','Hotel ID','Owner Review Recommendation','Review Note','Reviewer','Reviewed At','Publication Gate'];
    const lines=[heads.map(csvCell).join(',')];
    (records||[]).forEach(r=>lines.push([
      r.id,r.hotelId,r.decision||'HOLD',r.note||'',r.reviewer||'',r.reviewedAt||'',
      'HOLD - AUTHENTICATED SERVER APPROVAL REQUIRED'
    ].map(csvCell).join(',')));
    return '\uFEFF'+lines.join('\r\n')+'\r\n';
  }
  return Object.freeze({required,rateHistoryRequired,allowed,parseCSV,importQueue,decide,summary,exportDecisions});
});