'use strict';
// Vendor-specific images never mutate the DBest master catalogue.
function validateImageUrl(value){
 if(value===null||value===undefined||value==='')return null;
 if(typeof value!=='string'||value.length>1200)throw Error('invalid_vendor_image');
 let url;
 try{url=new URL(value)}catch{throw Error('invalid_vendor_image')}
 if(url.protocol!=='https:'||!url.hostname||url.username||url.password)throw Error('invalid_vendor_image');
 if(['localhost','127.0.0.1','::1'].includes(url.hostname.toLowerCase()))throw Error('invalid_vendor_image');
 return url.toString();
}
function updateVendorImage({actorVendorId,offer,requestedImageUrl,autoApprove=false}){
 if(!actorVendorId||!offer||offer.vendor_id!==actorVendorId)throw Error('vendor_offer_forbidden');
 return {vendor_image_url:validateImageUrl(requestedImageUrl),vendor_image_review_status:requestedImageUrl?(autoApprove?'approved':'pending_review'):'none'};
}
function effectiveImage({masterImageUrl,vendorImageUrl,vendorImageReviewStatus}){
 return vendorImageReviewStatus==='approved'&&vendorImageUrl?vendorImageUrl:(masterImageUrl||null);
}
module.exports={validateImageUrl,updateVendorImage,effectiveImage};
