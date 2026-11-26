(function(){
'use strict';
const cfg=window.DBEST_RUNTIME_CONFIG||{},base=String(cfg.supabaseUrl||'').replace(/\/$/,''),key=String(cfg.supabasePublishableKey||'');
if(!base||!key)return;
const uploadApi=base+'/functions/v1/marketplace-upload-requests',quoteApi=base+'/functions/v1/marketplace-multi-vendor-quotes';
const liveHost=['dbest4u.com','www.dbest4u.com'].includes(String(location.hostname||'').toLowerCase());
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function token(){try{return window.DBEST_MEMBER_LIVE?.getToken?.()||''}catch(_){return''}}
async function call(url,body,member=true){const t=member?token():'';const h={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};if(member)h['x-dbest-member-token']=t;const r=await fetch(url,{method:'POST',headers:h,cache:'no-store',body:JSON.stringify(body)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed ('+r.status+')');return d}
function say(m){try{typeof toast==='function'?toast(m):alert(m)}catch(_){}}
function getLoc(){const ok=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));try{if(typeof commerceLocation!=='undefined'&&ok(commerceLocation.lat)&&ok(commerceLocation.lng))return {lat:Number(commerceLocation.lat),lng:Number(commerceLocation.lng)}}catch(_){}try{const x=window.DBEST_TOP_LIVE_LOCATION;if(x&&ok(x.lat)&&ok(x.lng))return {lat:Number(x.lat),lng:Number(x.lng)}}catch(_){}return null}
function draw(){
 if(typeof sectionScreen!=='function')return;
 sectionScreen(`${typeof sectionTopBar==='function'?sectionTopBar('📄 Upload a Bulk Order','Send one list to nearby Marketplace vendors','openCommerceHub()'):''}<div class="sectionContent shopPage"><div class="sectionHero"><b>Upload Bulk Order</b><small>Upload your grocery, restaurant or medicine list and invite up to five nearby vendors to quote. No order or payment is created by uploading.</small></div><div class="checkoutCard"><div id="bulkStatus" class="notice">Member login and delivery location are required.</div><div class="serviceFormGrid"><div class="sf"><label>Category</label><select id="bulkCategory"><option value="grocery">Grocery & FMCG</option><option value="restaurant">Restaurant & Food</option><option value="medicine">Medicines</option></select></div><div class="sf"><label>Delivery location</label><button class="btn soft" id="bulkLocation" type="button">Use current location</button><small id="bulkLocLabel">Location not set</small></div><div class="sf full"><label>Order list image or PDF (max 8 MB)</label><input id="bulkFile" type="file" accept="image/jpeg,image/png,application/pdf"></div><div class="sf full"><label>Nearby vendors (choose up to 5)</label><div id="bulkVendors" class="notice">Set your location to find eligible vendors.</div></div><div class="sf full"><button class="btn" type="button" id="bulkSubmit">Upload and request quotes</button></div></div><div id="bulkResult"></div></div></div>`);
 const status=document.getElementById('bulkStatus'),locLabel=document.getElementById('bulkLocLabel'),vendorHost=document.getElementById('bulkVendors'),cat=document.getElementById('bulkCategory');
 if(!liveHost)status.textContent='Preview only: uploads and vendor invitations are disabled here to protect live order data.';
 let location=getLoc(),vendors=[];
 if(!token()){status.innerHTML='Please <button type="button" class="mini" onclick="location.href=\'/preview-member-login-v2.html?return=%2F\'">log in</button> with your DBest member account before uploading.'}
 function paintLocation(){locLabel.textContent=location?'Location ready • '+location.lat.toFixed(4)+', '+location.lng.toFixed(4):'Location not set'}
 async function loadVendors(){if(!location){vendorHost.textContent='Set your location to find eligible vendors.';return}vendorHost.textContent='Finding nearby approved vendors…';try{const d=await call(uploadApi,{action:'available_vendors',category:cat.value,lat:location.lat,lng:location.lng},false);vendors=d.vendors||[];vendorHost.innerHTML=vendors.length?vendors.map((v,i)=>'<label style="display:flex;gap:8px;align-items:center;padding:8px;border-bottom:1px solid #edf0f5"><input type="checkbox" data-bulk-vendor="'+esc(v.id)+'" '+(i<5?'checked':'')+'><span><b>'+esc(v.name)+'</b><small style="display:block;color:#687386">'+esc(v.city||'Eligible nearby vendor')+'</small></span></label>').join(''):'No approved vendor serves this location in the selected category.';vendorHost.querySelectorAll('[data-bulk-vendor]').forEach(el=>el.onchange=()=>{const selected=[...vendorHost.querySelectorAll('[data-bulk-vendor]:checked')];if(selected.length>5){el.checked=false;say('Select up to five vendors.')}})}catch(e){vendorHost.textContent='Could not load vendors: '+e.message}}
 document.getElementById('bulkLocation').onclick=()=>{if(!navigator.geolocation){say('Location is unavailable on this device.');return}locLabel.textContent='Getting location…';navigator.geolocation.getCurrentPosition(p=>{location={lat:p.coords.latitude,lng:p.coords.longitude};paintLocation();loadVendors()},e=>{locLabel.textContent='Location permission required';say(e.message)},{enableHighAccuracy:true,timeout:15000,maximumAge:60000})};
 cat.onchange=loadVendors;
 paintLocation();if(location)loadVendors();
 document.getElementById('bulkSubmit').onclick=async()=>{
   if(!liveHost){say('This preview is read-only. No upload or vendor request was sent.');return}
   if(!token()){say('Please log in as a DBest member first.');return}
   if(!location){say('Set your delivery location first.');return}
   const file=document.getElementById('bulkFile').files?.[0];if(!file){say('Choose an order list image or PDF.');return}
   if(file.size<1||file.size>8388608){say('File must be 8 MB or smaller.');return}
   const selected=[...vendorHost.querySelectorAll('[data-bulk-vendor]:checked')].map(x=>x.getAttribute('data-bulk-vendor'));if(!selected.length||selected.length>5){say('Choose one to five eligible vendors.');return}
   if(!confirm('This creates a bulk quote request and invites the selected vendors. It does not place an order, take payment or dispatch delivery. Continue?'))return;
   const btn=document.getElementById('bulkSubmit'),result=document.getElementById('bulkResult');btn.disabled=true;btn.textContent='Uploading…';
   try{
    const made=await call(uploadApi,{action:'create_request',category:cat.value,vendorId:selected[0],filename:file.name,mimeType:file.type,fileSize:file.size,lat:location.lat,lng:location.lng});
    const objectPath=String(made.objectPath||'').split('/').map(encodeURIComponent).join('/'),signed=new URL(base+'/storage/v1/object/upload/sign/marketplace-private-uploads/'+objectPath);signed.searchParams.set('token',made.uploadToken);
    const put=await fetch(signed.href,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':file.type,'x-upsert':'false'},body:file});if(!put.ok)throw new Error('Secure file upload failed.');
    await call(uploadApi,{action:'finalize_upload',requestId:made.requestId});
    await call(quoteApi,{action:'invite_vendors',requestId:made.requestId,vendorIds:selected});
    result.innerHTML='<div class="notice" style="margin-top:12px"><b>Bulk quote request sent.</b><br>Request ID: '+esc(made.requestId)+'<br>Invited '+selected.length+' eligible vendor(s). This is only a quote request; no order or delivery has been created.</div>';btn.textContent='Request sent';
   }catch(e){result.innerHTML='<div class="notice" style="margin-top:12px;color:#a12b2b">Upload was not completed: '+esc(e.message)+'. If the request was created, use My Marketplace Orders to check its status.</div>';btn.disabled=false;btn.textContent='Retry upload'}
 };
}
function attach(){if(typeof window.openCommerceHub!=='function'||window.openCommerceHub.__bulkWrapped)return;const raw=window.openCommerceHub;const wrap=function(){const out=raw.apply(this,arguments);setTimeout(()=>{const host=document.querySelector('#m .sectionHero');if(host&&!document.getElementById('marketplaceBulkOrderEntry')){const b=document.createElement('button');b.id='marketplaceBulkOrderEntry';b.className='btn soft';b.style.cssText='margin-top:12px;width:100%';b.textContent='📄 Upload Bulk Order';b.onclick=draw;host.appendChild(b)}},60);return out};wrap.__bulkWrapped=true;window.openCommerceHub=wrap}
[100,500,1200,2500].forEach(ms=>setTimeout(attach,ms));new MutationObserver(()=>setTimeout(attach,50)).observe(document.documentElement,{childList:true,subtree:true});
window.openMarketplaceBulkOrder=draw;
})();