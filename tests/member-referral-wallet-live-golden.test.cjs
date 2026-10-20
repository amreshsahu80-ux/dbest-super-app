'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const cp=require('node:child_process');
const fs=require('node:fs');
const lock=require('../member-referral-wallet-golden-lock.json');
const round=n=>Math.round(Number(n)*100)/100;
test('Golden freeze points at the original LIVE production deployment',()=>{
  assert.equal(lock.production.source_commit,'f7305e05d2bedc50760062316dc98ebb7dbe7c31');
  assert.equal(lock.production.deployment_id,'dpl_BH4La8R6fTTXKUPWVPJJKjyUtWkk');
  assert.equal(lock.production.domain,'https://dbest4u.com');
});
test('All frozen LIVE member, payout and payment source files retain exact SHA1 blob IDs',()=>{
  assert(Object.keys(lock.protected_files_sha1).length>=10);
  for(const [file,expected] of Object.entries(lock.protected_files_sha1)){
    assert.equal(cp.execFileSync('git',['hash-object',file],{encoding:'utf8'}).trim(),expected,file+' changed from golden');
  }
});
test('Owner-approved paid onboarding and automatic activation remain frozen but not overwritten by QA',()=>{
  assert(lock.scope.frozen_proven.some(s=>s.includes('automatic member activation')));
  assert(lock.scope.no_mutation.some(s=>s.includes('payment confirmation callbacks')));
  assert(lock.scope.no_mutation.some(s=>s.includes('payout amounts')));
});
test('Live Starter display and wallet module remain intentionally restricted',()=>{
  const code=fs.readFileSync('starter-member-safety-v1.js','utf8');
  assert(code.includes('Starter has no wallet, cashback, referral income, team earnings or payouts'));
  assert(code.includes("String(id)==='wallet'"));
  assert.equal(lock.evidence.active_starter,2);
});
test('Live referral summary has no orphan, self or duplicate links and demonstrates three levels',()=>{
  const v=lock.evidence.referrals;
  assert.equal(v.orphan_uplines,0);assert.equal(v.self_referrals,0);assert.equal(v.duplicate_nonblank_codes,0);
  assert(v.verified_path_depths['1']>0);assert(v.verified_path_depths['2']>0);assert(v.verified_path_depths['3']>0);
  assert.equal(v.with_upline,v.verified_path_depths['1']);
});
test('Live wallet earnings ledger reconciles after reversal without double-credit',()=>{
  const v=lock.evidence.wallet;
  assert.equal(round(v.lifetime_earned-v.lifetime_reversed),v.available+v.held+v.lifetime_paid);
  assert.equal(round(v.available+v.held),2901.47);
  assert.equal(v.negative_balance_count,0);assert.equal(v.duplicate_ledger_idempotency_keys,0);
});
test('Owner payout-rule and banking safeguards are not confused with real settlement',()=>{
  const v=lock.evidence;
  assert.equal(v.commission_rules.enabled,57);
  assert.equal(v.commission_rules.negative_rules,0);
  assert.equal(v.commission_rules.total_percentage_over_100,0);
  assert.equal(v.member_privileged_payout_rpcs.anonymous_can_execute,false);
  assert.equal(v.member_privileged_payout_rpcs.authenticated_can_execute,false);
  assert.equal(v.payout.actual_paid_payouts,0);
  assert(lock.scope.not_certified_and_out_of_scope.some(s=>s.includes('Real bank settlement')));
  assert.equal(v.payout.historical_failed_test.includes('Owner-confirmed deliberate test'),true);
});
test('The separate member UI hardening candidate remains preview-only',()=>{
  assert.equal(lock.separate_preview.branch,'fix/member-hierarchy-payout-audit-20261020');
  assert(lock.separate_preview.status.includes('NOT in this live frozen'));
  assert(lock.governance_note.includes('not GitHub branch protection'));
});
test('Existing backend Edge Function versions and SHA256 fingerprints are captured',()=>{
  const fs=lock.backend_edge_functions;
  for(const [name,hash] of Object.entries(fs.sha256)){
    assert.equal(hash.length,64,name+' fingerprint missing');
    assert(Number.isInteger(fs.versions[name]));
  }
  assert.equal(fs.versions['member-network-live'],10);
  assert.equal(fs.versions['member-wallet-live'],8);
});
