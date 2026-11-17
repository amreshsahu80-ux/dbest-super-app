'use strict';
// Isolated source-level regression guard. This is NOT an end-to-end backend test.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../vendor.html'),'utf8');
const names=['shopPhoto','ownerPhoto','panCopy','establishment','bankProof'];
for(const name of names){
 assert.match(html,new RegExp('name="'+name+'"[^>]*required'),name+' required file input');
 assert.ok(html.includes('data-kyc-camera="'+name+'"'),name+' camera button');
 assert.ok(html.includes('data-kyc-camera-input="'+name+'"'),name+' camera input');
}
for(const category of ['grocery','restaurant','medicine','fashion','electronics','other']) assert.ok(html.includes('<option value="'+category+'">'),category+' option');
assert.ok(html.includes('x.file.size>8*1024*1024'),'all document size cap');
assert.ok(html.includes("target.dispatchEvent(new Event('change',{bubbles:true}))"),'camera must trigger file validation');
assert.ok(html.includes('transfer.items.add(camera.files[0])'),'camera must attach captured file');
assert.ok(html.includes("submit.disabled=true"),'registration duplicate submit guard');
// Registration must not report completed KYC before an authenticated, awaited upload.
assert.ok(html.includes("if(!d||!d.id)throw new Error('registration_not_confirmed')"),'confirmed vendor ID required');
assert.ok(html.includes("if(!auth?.token)throw new Error('kyc_login_token_missing')"),'authenticated KYC token required');
assert.ok(html.includes("await uploader.upload('vendor',auth.token,kycDocs)"),'await confirmed KYC uploader');
assert.ok(html.includes("if(!uploader?.upload)throw new Error('kyc_uploader_unavailable')"),'missing uploader must fail closed');
assert.ok(html.includes("do not submit another registration"),'failed KYC must not prompt duplicate registration');
assert.ok(html.includes("submit.setAttribute('aria-busy','true')"),'visible registration loading state');
assert.ok(html.includes("submit.removeAttribute('aria-busy')"),'loading state cleared after failure');
assert.ok(html.includes("clear.addEventListener('click'"),'selected document removal');
assert.ok(html.includes("input.addEventListener('change',refresh)"),'document replacement status');
console.log('PASS: vendor KYC static regression assertions; browser and backend integration not tested');
