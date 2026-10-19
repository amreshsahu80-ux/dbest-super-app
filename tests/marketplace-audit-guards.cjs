'use strict';
/* Marketplace source-guard test: read-only; never place orders or call an API. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function read(path){return fs.readFileSync(path,'utf8')}
function has(path,parts){const s=read(path);new vm.Script(s,{filename:path});for(const p of parts)assert(s.includes(p),path+' missing '+p)}
const app=read('index.html'),bootstrap=read('app-bootstrap-performance-v1.js');
has('marketplace-list-upload-preview-v1.js',['Upload Bulk Order','Upload Shopping List','Upload Prescription / Medicine List']);
has('marketplace-upload-client-v1.js',['x-dbest-member-token','x-vendor-token','marketplace-upload-requests','application/pdf','8*1024*1024','finalize_upload']);
has('marketplace-master-cart.js',['marketplace-master-order-live','x-dbest-member-token','secureCheckout','status']);
has('marketplace-live-catalog-authority.js',['marketplace-local-catalog-live','public_catalog','readKnownLocation','liveProduct']);
has('marketplace-multi-vendor-client-v1.js',['cfg.marketplaceMultiVendorEnabled===true','x-dbest-member-token','x-vendor-token']);
has('marketplace-pay-at-delivery-hardening-v1.js',['x-dbest-member-token','pay-at-delivery-order','save()']);
has('marketplace-quote-comparison-v1.js',['grocery: 10','restaurant: 15','medicine: 15']);
for(const name of ['marketplace-secure-session-v1.js','marketplace-vaahak-live-v2.js','marketplace-minimum-order-ux.js','marketplace-live-order-submit-final.js','marketplace-cart-quantity-v1.js','marketplace-customer-stage-wording-fix.js','customer-marketplace-my-orders.js','marketplace-completion-green.js','marketplace-delivery-rules.js','marketplace-delivery-order-display.js','marketplace-master-cart.js','marketplace-pay-at-delivery-v2.js']){
 const src=read(name);
 new vm.Script(src,{filename:name});
 assert(bootstrap.includes("'"+name+"'"),'Marketplace bootstrap must load '+name)
}
for(const name of ['marketplace-upload-client-v1.js','marketplace-multi-vendor-client-v1.js','marketplace-list-upload-preview-v1.js']){
 assert(app.includes("'"+name+"'"),'Entrypoint must load '+name);
}
assert(!app.includes("'marketplace-checkout-standalone-route-v1.js'"),'Do not let preview route hijack the production checkout');
assert(!app.includes("'marketplace-cod-option-v1.js'"),'Do not load unimplemented legacy COD preview flow');
assert(!app.includes("'vendor-image-storage-fix.js'"),'Do not load broken legacy vendor image script');
console.log('PASS: Marketplace authentication, upload, category, checkout and navigation source guards. No network or database calls.');
