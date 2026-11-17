const fs=require('node:fs');const assert=require('node:assert/strict');const vm=require('node:vm');
const upload=fs.readFileSync('partner-kyc-registration-upload-v2.js','utf8');
new vm.Script(upload,{filename:'partner-kyc-registration-upload-v2.js'});
assert.match(upload,/function missingRequired\(form,kind\)/);
assert.match(upload,/validateRequired\(form,'vendor'\)/);
assert.match(upload,/validateRequired\(form,'vaahak'\)/);
assert.match(upload,/kyc_upload_unconfirmed_/);
assert.match(upload,/kyc_documents_not_persisted_/);
assert.match(upload,/verified\.kyc\?\.complete!==true/);

// Registration must not resolve successfully when mandatory KYC persistence fails.
assert.match(upload,/throw new Error\('vendor_registration_id_unconfirmed'\)/);
assert.match(upload,/throw new Error\('vaahak_registration_id_unconfirmed'\)/);
assert.match(upload,/throw new Error\('vendor_kyc_registration_context_missing'\)/);
assert.match(upload,/throw new Error\('vaahak_kyc_registration_context_missing'\)/);
assert.match(upload,/await secureVendorRegistration\(id,fd,files\);return r/);
assert.match(upload,/await secureVaahakRegistration\(id,pin,files\);return r/);
assert.match(upload,/throw e\}\}/);

// Missing standalone Vaahak PIN/KYC context must cancel native submission, not just display a warning.
assert.match(upload,/Required Vaahak KYC or PIN is missing[^\n]*event\.preventDefault\(\);event\.stopImmediatePropagation\(\);return/);

// Standalone Vaahak asynchronous upload must have a rejection handler and actionable retry guidance.
assert.match(upload,/if\(!p\?\.id\)throw new Error\('vaahak_registration_id_unconfirmed'\)/);
assert.match(upload,/\}\)\(\)\.catch\(err=>\{/);
assert.match(upload,/Vaahak KYC upload was not confirmed/);

// Standalone Vaahak must await server-confirmed KYC before showing registration success.
const standalone=fs.readFileSync('vaahak.html','utf8');
assert.match(standalone,/await window\.DBEST_PARTNER_KYC_REGISTRATION_V2\.completeVaahakRegistration\(d\.id/);
assert.match(standalone,/Registration and mandatory KYC confirmed/);
assert.match(standalone,/partner-kyc-registration-upload-v2\.js/);
assert.match(upload,/completeVaahakRegistration:async\(id,pin,form\)/);
assert.match(upload,/await secureVaahakRegistration\(id,pin,files\)/);
assert.match(upload,/vh\.id!=='regForm'/);


// Explicit category choice avoids silently registering an electronics/retail shop as grocery.
const vendorPortal=fs.readFileSync('vendor.html','utf8');
assert.match(vendorPortal,/<select name="type" required><option value="" disabled selected>Select your business category<\/option>/);
for(const category of ['grocery','restaurant','medicine','fashion','electronics','other']) {
  assert.match(vendorPortal,new RegExp('<option value="'+category+'">'));
}

// Missing GPS must not be interpreted as valid zero coordinates in vendor discovery readiness.
assert.match(vendorPortal,/vendor\.lat!==null&&vendor\.lat!==undefined&&String\(vendor\.lat\)\.trim\(\)!==''/);
assert.match(vendorPortal,/vendor\.lng!==null&&vendor\.lng!==undefined&&String\(vendor\.lng\)\.trim\(\)!==''/);
assert.match(vendorPortal,/Math\.abs\(Number\(vendor\.lat\)\)<=90&&Math\.abs\(Number\(vendor\.lng\)\)<=180/);

// GPS retries must invalidate previous coordinates before a new capture attempt.
assert.match(vendorPortal,/if\(btn\.disabled\)return;regLoc=null;status\.textContent='Shop GPS not yet confirmed\.'/);
assert.match(vendorPortal,/btn\.disabled=true;btn\.setAttribute\('aria-busy','true'\)/);
assert.match(vendorPortal,/const finish=\(\)=>\{btn\.disabled=false;btn\.removeAttribute\('aria-busy'\)/);
assert.match(vendorPortal,/Math\.abs\(lat\)>90\|\|Math\.abs\(lng\)>180/);

const service=fs.readFileSync('service-partner-onboarding-v3.html','utf8');
assert.match(service,/document upload\(s\) need retry/);
assert.match(service,/Please retry submission with the missing documents/);
assert.match(service,/return}}localStorage\.removeItem\(savedKey\);await startAgreement/);
assert.match(service,/saved\?\.transactionId\?\{transactionId:saved\.transactionId/);
assert.match(service,/localStorage\.setItem\(savedKey/);
assert.match(service,/d\.ok!==true\|\|!d\.document\?\.id\|\|d\.document\?\.field_name!==field/);
assert.match(upload,/event\.preventDefault\(\);event\.stopImmediatePropagation\(\)/);

const owner=fs.readFileSync('owner-control-deployment-build10.html','utf8');
assert.match(owner,/owner-control-deployment/);
assert.match(owner,/x-dbest-owner-token/);
assert.match(owner,/verify-owner-otp/);
assert.match(owner,/window\.confirm\(/);
assert.match(owner,/Existing matching accounts may be updated/);
assert.match(owner,/service_partner/);
const ownerConsole=fs.readFileSync('owner-live-onboarding.html','utf8');
assert.match(ownerConsole,/owner-control-deployment-build10\.html/);
const gradle=fs.readFileSync('partner-android-app\/app\/build.gradle','utf8');
assert.match(gradle,/versionCode 10/);
assert.match(gradle,/versionName '1\.0\.6'/);
console.log('Build 10 static onboarding and release identity checks passed');
