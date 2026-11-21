'use strict';
// Owner master catalogue CSV preparation: validates rows before staging.
// No database writes or publication. MRP is required in CSV even though the
// current master table lacks an mrp column: schema migration is required.
const required=['category','name','mrp','description','dimensions','image_url'];
function validateMasterRow(row){
 const errors=[];
 for(const key of required)if(!String(row?.[key]??'').trim())errors.push(key+'_required');
 const mrp=Number(row?.mrp);
 if(!Number.isFinite(mrp)||mrp<=0||Math.round(mrp*100)!==mrp*100)errors.push('invalid_mrp');
 const image=String(row?.image_url||'').trim();
 if(image){try{const u=new URL(image);if(u.protocol!=='https:')errors.push('image_must_be_https')}catch{errors.push('invalid_image_url')}}
 const category=String(row?.category||'').trim();
 const name=String(row?.name||'').trim();
 return {valid:errors.length===0,errors,record:{
  category,name,brand:String(row?.brand||'').trim(),
  description:String(row?.description||'').trim(),
  dimensions:String(row?.dimensions||'').trim(),
  mrp:Number.isFinite(mrp)?mrp:null,image_url:image,
  specifications:{description:String(row?.description||'').trim(),dimensions:String(row?.dimensions||'').trim()}
 }};
}
function validateMasterBatch(rows){
 if(!Array.isArray(rows))throw new TypeError('rows_must_be_array');
 return rows.map((row,index)=>({rowNumber:index+2,...validateMasterRow(row)}));
}
module.exports={validateMasterRow,validateMasterBatch,required};
