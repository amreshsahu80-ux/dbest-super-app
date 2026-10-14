(function(){
'use strict';
const cfg=window.DBEST_RUNTIME_CONFIG||{};
const base=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const key=String(cfg.supabasePublishableKey||'');
const endpoint=base+'/functions/v1/marketplace-upload-requests';
const bucket='marketplace-private-uploads';
const mimeTypes=new Set(['image/jpeg','image/png','application/pdf']);
function memberToken(){return String(localStorage.getItem('dbest_member_live_token')||'')}
async function request(action,body){
 const token=memberToken();if(!token)throw Error('Please log in to upload or review your request.');
 if(!base||!key)throw Error('Marketplace upload service is not configured.');
 const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',apikey:key,'x-dbest-member-token':token},body:JSON.stringify({action,...body})});
 const result=await r.json().catch(()=>({error:'invalid_server_response'}));
 if(!r.ok||!result.ok)throw Error(result.error||'Request failed');
 return result;
}
async function availableVendors(category,location){
 if(!['grocery','medicine','restaurant'].includes(category))throw Error('Invalid category');
 if(!base||!key)throw Error('Marketplace upload service is not configured.');
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',apikey:key},body:JSON.stringify({action:'available_vendors',category,lat:location?.lat,lng:location?.lng})});
 const data=await response.json().catch(()=>({error:'invalid_server_response'}));
 if(!response.ok||!data.ok)throw Error(data.error||'Vendor lookup failed');
 return data.vendors||[];
}
async function submit({category,vendorId,file,location}){
 if(!file||!mimeTypes.has(file.type)||file.size<1||file.size>8*1024*1024)throw Error('Choose a JPG, PNG or PDF up to 8 MB.');
 const created=await request('create_request',{category,vendorId,filename:file.name,mimeType:file.type,fileSize:file.size,lat:location?.lat,lng:location?.lng});
 const uploadUrl=base+'/storage/v1/object/upload/sign/'+bucket+'/'+created.objectPath+'?token='+encodeURIComponent(created.uploadToken);
 const response=await fetch(uploadUrl,{method:'PUT',headers:{'Content-Type':file.type},body:file});
 if(!response.ok)throw Error('File upload failed. Please retry with a new request.');
 return request('finalize_upload',{requestId:created.requestId});
}
async function status(requestId){return request('customer_status',{requestId})}
async function accept(requestId,quoteVersion){return request('customer_accept',{requestId,quoteVersion})}
window.DBEST_MARKETPLACE_UPLOAD_API=Object.freeze({availableVendors,submit,status,accept});
})();
