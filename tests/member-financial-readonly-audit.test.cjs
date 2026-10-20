'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const snap=require('./member-financial-readonly-audit-snapshot.json');
const round=n=>Math.round(Number(n)*100)/100;
test('Read-only wallet accounting matches credited earnings after reversals',()=>{
 const w=snap.wallet;
 assert.equal(round(w.lifetime_earned-w.lifetime_reversed),w.credited_allocations);
 assert.equal(round(w.available+w.held+w.lifetime_paid),w.credited_allocations);
 assert.equal(w.reversed_allocations,w.lifetime_reversed);
 assert.equal(w.negative_balances,0);
 assert.equal(w.ledger_duplicate_idempotency_keys,0);
});
test('Observed referral hierarchy has no orphan, self, or duplicated referral identity',()=>{
 const a=snap.referral_hierarchy;
 assert.equal(a.orphan_uplines,0);
 assert.equal(a.self_referrals,0);
 assert.equal(a.duplicate_nonblank_referral_codes,0);
 assert.equal(a.active_with_upline,a.observed_depths[1]);
 assert(a.observed_depths[2]>0 && a.observed_depths[3]>0,'three-level downline must be evidenced');
});
test('Payout eligibility respects bank verification and is not mistaken for full member approval',()=>{
 const p=snap.payout_eligibility;
 assert(p.eligible_active_paid_with_verified_bank<=p.verified_bank_account_count);
 assert(p.eligible_active_paid_with_verified_bank<=p.payout_enabled_flag_count);
 assert(p.eligible_with_positive_wallet_balance<=p.eligible_active_paid_with_verified_bank);
 assert(p.active_paid_members>p.eligible_active_paid_with_verified_bank);
 assert.equal(p.automatic_payout_release_authorized,false);
 assert.equal(snap.actual_money_payouts.bank_settlement_proven,false);
 assert.equal(snap.actual_money_payouts.paid_requests,0);
 assert.equal(snap.actual_money_payouts.historical_intentional_failed_test_excluded,true);
});
test('Privileged payout functions are not directly executable by untrusted API roles',()=>{
 const roles=snap.permissions;
 assert.equal(roles.anon_execute,false);
 assert.equal(roles.authenticated_execute,false);
 assert.equal(roles.service_role_execute,true);
 assert(roles.functions.includes('dbest_owner_update_member_payout'));
 assert(roles.functions.includes('dbest_member_request_payout'));
});
test('Protect previously verified activation flow and frozen modules',()=>{
 assert.match(snap.proven_workflows.paid_registration_and_activation,/Owner-confirmed working/);
 assert.equal(snap.live_release_sha,'f7305e05d2bedc50760062316dc98ebb7dbe7c31');
 assert.match(snap.release_status,/PREVIEW ONLY/);
});
