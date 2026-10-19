'use strict';
/*
 * DBest Cab Golden Source Integrity Gate.
 * Snapshot approved by the Owner on 2026-10-20.
 *
 * This test is intentionally read-only. A change to any protected Cab file
 * fails until the Owner approves a new versioned Cab baseline.
 *
 * DO NOT auto-update the fingerprint file to make a failing gate green.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const lock=JSON.parse(fs.readFileSync(path.join(root,'cab-golden-lock.json'),'utf8'));
const BASELINE='f7305e05d2bedc50760062316dc98ebb7dbe7c31';
const expectedDeployment='dpl_BH4La8R6fTTXKUPWVPJJKjyUtWkk';
const expectedBranch='release/cab-golden-frozen-20261020';
assert.equal(lock.approved_production_commit,BASELINE,'Frozen CAB baseline SHA was altered');
assert.equal(lock.approved_deployment_id,expectedDeployment,'Frozen Vercel rollback target was altered');
assert.equal(lock.snapshot_branch,expectedBranch,'Frozen branch name was altered');
const files=lock.protected_source_git_blob_sha1;
assert(files&&Object.keys(files).length>=15,'Protected Cab files missing from freeze manifest');
let failures=[];
for(const [name,expected] of Object.entries(files)){
 const target=path.resolve(root,name);
 if(!target.startsWith(root+path.sep)){failures.push('Invalid protected path: '+name);continue}
 if(!fs.existsSync(target)){failures.push('Missing protected file: '+name);continue}
 const bytes=fs.readFileSync(target);
 const got=crypto.createHash('sha1')
   .update(Buffer.from('blob '+bytes.length+'\0','utf8'))
   .update(bytes).digest('hex');
 if(got!==expected)failures.push(name+': expected '+expected+', got '+got);
}
if(failures.length){
 console.error('BLOCKED: DBest Cab golden source has changed. Explicit Owner approval and an independently verified new release are required.');
 failures.forEach(x=>console.error(' - '+x));
 process.exit(1)
}
console.log('PASS: DBest Cab Golden 2026-10-20 integrity: '+Object.keys(files).length+' protected source files match approved production.');
