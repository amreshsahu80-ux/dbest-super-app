(function(root){
'use strict';
const cfg=root.DBEST_RUNTIME_CONFIG||{};
const base=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const key=String(cfg.supabasePublishableKey||'');
const endpoint=base+'/functions/v1/marketplace-multi-vendor-quotes';
function memberToken(){try{return String(root.DBEST_MEMBER_LIVE?.getToken?.()||localStorage.getItem('dbest_member_live_token')||'')}catch(_){return''}}
function vendorToken(){try{return String(sessionStorage.getItem('dbest_marketplace_vendor_secure_token')||'')}catch(_){return''}}
async function call(action,payload={},actor='member'){
 if(!base||!key)throw Error('Marketplace quotation service not configured');
 const token=actor==='vendor'?vendorToken():memberToken();
 if(!token)throw Error(actor==='vendor'?'Secure vendor login required':'Member login required');
 const headers={'Content-Type':'application/json',apikey:key};
 headers[actor==='vendor'?'x-vendor-token':'x-dbest-member-token']=token;
 const response=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify({action,...payload}),credentials:'omit'});
 const result=await response.json().catch(()=>({error:'invalid_server_response'}));
 if(!response.ok||!result.ok)throw Error(result.error||'Quotation service unavailable');
 return result;
}
const api=Object.freeze({
 // Only use after dedicated server endpoint has been deployed and validated.
 enabled:()=>cfg.marketplaceMultiVendorEnabled===true||/\.vercel\.app$/i.test(location.hostname),
 invite:(requestId,vendorIds)=>call('invite_vendors',{requestId,vendorIds}),
 listOffers:(requestId)=>call('customer_offers',{requestId}),
 acceptOffer:(requestId,offerId,version)=>call('accept_offer',{requestId,offerId,version}),
 vendorInvitations:()=>call('vendor_invitations',{},'vendor'),
 vendorDocument:(requestId)=>call('vendor_document_url',{requestId},'vendor'),
 submitOffer:(requestId,items,deliveryFee)=>call('submit_offer',{requestId,items,deliveryFee},'vendor')
});
root.DBEST_MARKETPLACE_MULTI_VENDOR_API=api;
})(window);
