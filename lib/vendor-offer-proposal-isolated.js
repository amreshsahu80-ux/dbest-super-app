'use strict';
// Pure consolidated proposal validation. No database writes and no publication.
function cents(v){if(typeof v!=='number'||!Number.isFinite(v)||v<=0||!Number.isSafeInteger(Math.round(v*100))||Math.abs(v*100-Math.round(v*100))>1e-7)throw Error('invalid_currency');return Math.round(v*100)}
function validateProposal({master,vendorId,price,stock,imageUrl}){
 if(!master||master.status!=='reviewed'||!master.id||!master.payload)throw Error('master_not_reviewed');
 if(typeof vendorId!=='string'||!vendorId.trim()||vendorId.length>150)throw Error('invalid_vendor');
 const mrp=cents(Number(master.payload.mrp)),selling=cents(price);
 if(selling>mrp)throw Error('price_above_mrp');
 if(!Number.isSafeInteger(stock)||stock<0)throw Error('invalid_stock');
 if(imageUrl){if(typeof imageUrl!=='string'||imageUrl.length>2000)throw Error('invalid_image');try{if(new URL(imageUrl).protocol!=='https:')throw Error('invalid_image')}catch{throw Error('invalid_image')}}
 return Object.freeze({masterStagingId:master.id,vendorId:vendorId.trim(),price,suggestedMrp:mrp/100,stock,imageUrl:imageUrl||null,status:'draft',published:false,savings:(mrp-selling)/100});
}
module.exports={validateProposal};
