'use strict';
// Central GST classification resolver. Rates are sourced from a reviewed,
// effective-dated HSN/SAC registry; product names are only lookup hints.
// Never infer a tax rate from a broad marketplace category.
function norm(v){return String(v||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'')}
function dateOnly(v){const d=new Date(v);return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):null}
function resolveGst({product={},registry=[],asOf=new Date().toISOString().slice(0,10)}={}){
  const hsn=norm(product.hsnSac||product.hsn_sac);
  const barcode=norm(product.barcode||product.gtin);
  const sku=norm(product.sku);
  const valid=registry.filter(r=>r&&r.reviewed===true&&r.ratePercent!==null&&r.ratePercent!==undefined&&Number.isFinite(Number(r.ratePercent))&&Number(r.ratePercent)>=0&&Number(r.ratePercent)<=100&&dateOnly(r.effectiveFrom)&&dateOnly(r.effectiveFrom)<=asOf&&(!r.effectiveTo||dateOnly(r.effectiveTo)>=asOf));
  // Exact identifiers only. Never match fuzzy names for tax decisions.
  const matches=hsn?valid.filter(r=>norm(r.hsnSac)===hsn):barcode?valid.filter(r=>norm(r.barcode)===barcode):sku?valid.filter(r=>norm(r.sku)===sku):[];
  if(!matches.length)return {status:'review_required',reason:'no_verified_tax_classification'};
  const latest=matches.sort((a,b)=>String(b.effectiveFrom).localeCompare(String(a.effectiveFrom)))[0];
  const sameDate=matches.filter(r=>r.effectiveFrom===latest.effectiveFrom);
  if(sameDate.some(r=>Number(r.ratePercent)!==Number(latest.ratePercent)))return {status:'review_required',reason:'conflicting_tax_classifications'};
  if(typeof product.taxInclusive!=='boolean'&&typeof product.tax_inclusive!=='boolean')return {status:'review_required',reason:'tax_inclusive_unknown'};
  return {status:'verified',ratePercent:Number(latest.ratePercent),taxInclusive:product.taxInclusive??product.tax_inclusive,hsnSac:latest.hsnSac||null,effectiveFrom:latest.effectiveFrom,source:latest.source||null};
}
module.exports={resolveGst};
