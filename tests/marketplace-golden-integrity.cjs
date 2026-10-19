'use strict';
/*
 * DBest Owner-approved Marketplace Golden Release source integrity gate.
 * All checks run locally; NO network calls or database changes.
 * The immutable reference is the production code snapshot from 2026-10-20.
 *
 * Do not modify this manifest merely to make a failed gate pass.
 * Explicit Owner change approval, a new versioned manifest, full regression
 * tests and a rollback plan are required before altering protected code.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'marketplace-golden-lock.json'),'utf8'));
assert.equal(manifest.freeze_id,'DBEST-MARKETPLACE-GOLDEN-20261020','Golden Marketplace freeze identifier modified');
assert.equal(manifest.production_frontend_commit,'f7305e05d2bedc50760062316dc98ebb7dbe7c31','Protected public frontend version changed');
assert.equal(manifest.production_vercel_deployment_id,'dpl_BH4La8R6fTTXKUPWVPJJKjyUtWkk','Baseline production deployment reference changed');
assert.equal(manifest.marketplace_backend_source_commit,'0ea380bc88bba7cc6d22facfa199c846c192af99','Backend golden snapshot commit changed');
assert.equal(manifest.marketplace_golden_branch,'release/marketplace-golden-frozen-20261020','Golden Marketplace branch reference changed');
assert.equal(manifest.cab_golden_commit,'f7305e05d2bedc50760062316dc98ebb7dbe7c31','Protected Cab baseline changed');
const files=manifest.protected_source_git_blob_sha1||{};
const edge=manifest.protected_edge_functions||{};
assert.equal(Object.keys(files).length,41,'Expected 41 protected Marketplace and integration sources');
assert.equal(Object.keys(edge).length,18,'Expected 18 recorded Marketplace Edge Functions');
let failures=[];
for(const [file,expected] of Object.entries(files)){
 const full=path.resolve(root,file);
 if(!full.startsWith(root+path.sep)){failures.push('Unsafe path: '+file);continue}
 if(!fs.existsSync(full)){failures.push('Missing protected file: '+file);continue}
 const bytes=fs.readFileSync(full);
 const actual=crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
 if(actual!==expected)failures.push('Unexpected source change: '+file+' (expected '+expected+', got '+actual+')');
}
const critical={'vaahak-commerce-live':15,'marketplace-vaahak-sync':7,'marketplace-handover-live':7,'marketplace-local-catalog-live':9,'marketplace-master-order-live':8,'marketplace-upload-requests':6,'marketplace-multi-vendor-quotes':21};
for(const [name,version] of Object.entries(critical)){
 const item=edge[name];
 if(!item||item.version!==version||item.status!=='ACTIVE'||item.verify_jwt!==false||!/^([0-9a-f]{64})$/.test(item.ezbr_sha256||''))failures.push('Recorded Edge freeze identity changed: '+name);
}
for(const [name,item] of Object.entries(edge)){
 if(!Number.isInteger(item.version)||item.version<1||!/^([0-9a-f]{64})$/.test(item.ezbr_sha256||''))failures.push('Malformed Edge version or compiled checksum: '+name);
}
if(failures.length){
 console.error('BLOCKED: Marketplace Golden source changed without a new Owner-approved release.');
 for(const reason of failures)console.error(' - '+reason);
 process.exit(1);
}
console.log('PASS: DBest Marketplace Golden release source integrity — 41 protected files and 18 recorded Edge versions.');
console.log('NOTE: CI verifies committed sources; active Supabase Edge versions must be checked separately against this manifest before any deployment.');
