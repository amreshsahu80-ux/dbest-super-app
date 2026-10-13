// Read-only Vendor picker adapter for Marketplace upload previews.
// Intentionally no automatic upload or checkout activation.
(function(){
'use strict';
function approved(v,category){
 // The server returns only approved, active, non-held Vendors; do not require omitted columns.\n return v&&v.type===category&&typeof v.id!=='undefined'&&!!v.name;
}
function normalize(rows,category){
 return (Array.isArray(rows)?rows:[]).filter(v=>approved(v,category)).map(v=>({id:String(v.id),name:String(v.name||v.id)}));
}
function render(select,rows,category){
 const list=normalize(rows,category);select.replaceChildren();
 const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=list.length?'Select an approved Vendor':'No approved Vendors available';select.append(placeholder);
 for(const vendor of list){const option=document.createElement('option');option.value=vendor.id;option.textContent=vendor.name;select.append(option)}
 select.disabled=list.length===0;
 return list.length;
}
window.DBEST_MARKETPLACE_VENDOR_PICKER=Object.freeze({normalize,render});
})();
