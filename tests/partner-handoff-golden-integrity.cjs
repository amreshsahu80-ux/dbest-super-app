'use strict';
/* DBest partner handoff source freeze — local/read-only guard.
 * Does not call partner sites, Supabase, Razorpay or payment services. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const m=JSON.parse(fs.readFileSync(path.join(root,'partner-handoff-freeze.json'),'utf8'));
assert.equal(m.freeze_id,'DBEST-PARTNER-HANDOFF-PREDEPLOY-20261020');
assert.equal(m.production_frontend_commit,'f7305e05d2bedc50760062316dc98ebb7dbe7c31');
assert.equal(m.hardened_candidate_commit,'c5ebf3913e65f275836772e2e950f8f1660c6ec3');
const destinations={
 insurance:'https://www.insurancedekho.com/?source=PARTNER&sub-source=BESTSERVICES_B2C',
 flights:'https://dbestfly.com',
 travel:'https://dbestfly.com',
 mf:'https://p.njw.bz/13879'
};
assert.deepEqual(m.partner_urls,destinations,'An Owner-confirmed partner URL changed. Requires explicit new approval');
const expected=m.protected_deeplink_git_blob_sha1||{};
assert.equal(Object.keys(expected).length,6,'Handoff module fingerprint list changed');
const violations=[];
for(const [p,sha] of Object.entries(expected)){
 const target=path.resolve(root,p);
 if(!target.startsWith(root+path.sep)){violations.push('Invalid path '+p);continue}
 if(!fs.existsSync(target)){violations.push('Missing '+p);continue}
 const data=fs.readFileSync(target);
 const actual=crypto.createHash('sha1').update(Buffer.from('blob '+data.length+'\0')).update(data).digest('hex');
 if(actual!==sha)violations.push('Modified '+p+' (expected '+sha+', got '+actual+')');
}
if(violations.length){console.error('BLOCKED: Owner-approved partner handoff source differs from its reviewed candidate.');violations.forEach(x=>console.error(' - '+x));process.exit(1)}
console.log('PASS: Partner Handoff Golden candidate protected: 6 sources, 4 destination mappings, exact affiliate link policy.');
console.log('NOTE: Candidate NOT deployed; Vercel daily deployment quota blocked preview/production. Separate Owner approval and live-device smoke test required to promote.');
