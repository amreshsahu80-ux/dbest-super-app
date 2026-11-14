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
