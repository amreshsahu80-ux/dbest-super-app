'use strict';
// Shared validation for vendor-submitted products; never publish submissions directly.
const CATEGORIES=new Set(['grocery','restaurant','medicine','electronics']);
const clean=(v,n=200)=>String(v??'').trim().slice(0,n);
function normalizeProduct(input={}){
 const category=clean(input.category||input.market_type,40).toLowerCase();
 if(!CATEGORIES.has(category))throw Error('unsupported_category');
 const name=clean(input.name,160),brand=clean(input.brand,100),specifications=clean(input.specifications,1500);
 if(name.length<3)throw Error('product_name_required');
 const price=Number(input.selling_price_inr_gst_inclusive??input.price);
 if(!Number.isFinite(price)||price<=0||price>10000000)throw Error('invalid_selling_price');
 const stock=Number(input.stock_qty??input.stock??0);
 if(!Number.isSafeInteger(stock)||stock<0)throw Error('invalid_stock');
 const mrp=input.mrp_inr===undefined||input.mrp_inr===''?null:Number(input.mrp_inr);
 if(mrp!==null&&(!Number.isFinite(mrp)||mrp<=0||price>mrp))throw Error('invalid_mrp');
 const barcode=clean(input.barcode_gtin||input.barcode,40);
 if(barcode&&!/^\d{8,14}$/.test(barcode))throw Error('invalid_barcode');
 const imageUrl=clean(input.image_url,1200);
 if(imageUrl&&!/^https:\/\/[^\s/]+\//i.test(imageUrl))throw Error('invalid_image_url');
 const prescriptionRequired=String(input.prescription_required??'REVIEW').toUpperCase();
 if(category==='medicine'&&!['TRUE','FALSE','REVIEW'].includes(prescriptionRequired))throw Error('invalid_medicine_status');
 return {category,name,brand,specifications,price,stock,mrp,barcode,imageUrl,
  prescriptionRequired:category==='medicine'?prescriptionRequired:'FALSE',
  status:'pending_owner_review',active:false,gstStatus:'unverified'};
}
function validateBatch(rows,{maxRows=500}={}){
 if(!Array.isArray(rows)||rows.length===0||rows.length>maxRows)throw Error('invalid_batch_size');
 const seen=new Set();
 return rows.map((raw,i)=>{try{
  const product=normalizeProduct(raw);
  const key=product.barcode?'gtin:'+product.barcode:'name:'+product.category+':'+product.brand.toLowerCase()+':'+product.name.toLowerCase()+':'+product.specifications.toLowerCase();
  if(seen.has(key))throw Error('duplicate_in_batch');
  seen.add(key);return {row:i+1,ok:true,product};
 }catch(e){return {row:i+1,ok:false,error:e.message}}});
}
module.exports={normalizeProduct,validateBatch};
