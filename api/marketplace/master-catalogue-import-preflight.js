'use strict';
// Strict preflight for owner-controlled master catalogue CSV rows.
// A staging row is never a publication instruction.
const required=['category','name','brand','barcode_gtin','mrp_inr','mrp_verified','image_url','image_rights_verified'];
const categories=new Set(['electronics','grocery','restaurant','medicine']);
function preflight(row={}){
 const errors=[];
 for(const k of required)if(row[k]===undefined||String(row[k]).trim()==='')errors.push('missing_'+k);
 if(!categories.has(String(row.category||'').trim().toLowerCase()))errors.push('unsupported_category');
 if(!/^\\d{8,14}$/.test(String(row.barcode_gtin||'').trim()))errors.push('invalid_barcode');
 const mrp=Number(row.mrp_inr);
 if(!Number.isFinite(mrp)||mrp<=0)errors.push('invalid_mrp');
 if(String(row.mrp_verified).toLowerCase()!=='true')errors.push('mrp_unverified');
 if(String(row.image_rights_verified).toLowerCase()!=='true')errors.push('image_rights_unverified');
 if(!/^https:\/\/[^\s/]+\//i.test(String(row.image_url||'')))errors.push('invalid_image_url');
 if(row.category==='medicine')errors.push('medicine_requires_manual_compliance_review');
 return {ok:errors.length===0,errors,status:'draft'};
}
function preflightBatch(rows){
 if(!Array.isArray(rows)||rows.length>1000)throw Error('invalid_batch');
 const seen=new Set();
 return rows.map((row,i)=>{
  const result=preflight(row);
  const key=String(row.category||'').toLowerCase()+':'+String(row.barcode_gtin||'').trim();
  if(seen.has(key))result.errors.push('duplicate_barcode_in_batch');
  seen.add(key);
  return {row:i+1,...result,ok:result.errors.length===0};
 });
}
module.exports={preflight,preflightBatch};
