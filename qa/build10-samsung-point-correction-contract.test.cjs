// Build 10: guard the REVIEW-ONLY staging correction against unsafe edits.
// Run: node --test qa/build10-samsung-point-correction-contract.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sql=fs.readFileSync(path.join(__dirname,'build10-samsung-point-staging-correction-REVIEW-ONLY.sql'),'utf8');
function required(fragment){assert.ok(sql.includes(fragment),'missing safety contract: '+fragment);}
test('correction remains explicitly staging-gated and optimistic',()=>{
  for(const s of ["dbest.build10_isolated_staging_approved","dbest.build10_expected_updated_at","IS DISTINCT FROM 'yes'","v.updated_at IS DISTINCT FROM expected_at","updated_at=expected_at","GET DIAGNOSTICS affected = ROW_COUNT","affected <> 1"]) required(s);
});
test('registry and catalogue rows remain locked and validated',()=>{
  for(const s of ["WHERE key='marketplace_categories' FOR SHARE","INTO STRICT registry_value","category_count <> 1 OR valid_category_count <> 1","deleted_at","archived_at","WHERE c.vendor_id=v.id FOR SHARE","catalogue_row.market_type IS DISTINCT FROM 'electronics'","sellable_electronics_count = 0"]) required(s);
});
test('only the intended approved, active, signed vendor can change',()=>{
  for(const s of ["WHERE id='VND8597199' FOR UPDATE","v.type IS DISTINCT FROM 'other'","v.owner_approval IS DISTINCT FROM 'Approved'","v.active IS DISTINCT FROM true","v.agreement_status IS DISTINCT FROM 'Fully Signed'","v.operational_hold IS DISTINCT FROM false","profile_meta IS NOT DISTINCT FROM v.profile_meta","profile_meta=jsonb_set(v.profile_meta"]) required(s);
  assert.equal((sql.match(/\bUPDATE\s+public\.marketplace_vendors_live\b/gi)||[]).length,1,'one vendor update only');
  assert.doesNotMatch(sql,/\b(?:DELETE|TRUNCATE|DROP|ALTER)\s+(?:TABLE\s+)?public\./i);
});

test('atomic UPDATE repeats approval, active, signed and no-hold eligibility',()=>{
  const update=sql.slice(sql.indexOf('UPDATE public.marketplace_vendors_live'));
  assert.match(update,/WHERE id=v\.id AND updated_at=expected_at AND type='other'/);
  for(const clause of ["owner_approval='Approved'","active IS TRUE","agreement_status='Fully Signed'","operational_hold IS FALSE","profile_meta IS NOT DISTINCT FROM v.profile_meta"]) assert.ok(update.includes(clause),'missing atomic UPDATE predicate: '+clause);
});

test('nullable eligibility fields fail closed and registry key is canonical',()=>{
  required("jsonb_typeof(v.profile_meta) IS DISTINCT FROM 'object'");
  required("WHERE c->>'key' = 'electronics'");
  required("WHERE lower(trim(c->>'key'))='electronics'");
});

test('persisted category and all unrelated vendor fields are verified before commit',()=>{
  const post=sql.slice(sql.indexOf('GET DIAGNOSTICS affected = ROW_COUNT'));
  for(const s of ["persisted.id=v.id","persisted.type='electronics'","persisted.profile_meta IS NOT DISTINCT FROM","jsonb_set(v.profile_meta","to_jsonb(persisted) - ARRAY['type','profile_meta','updated_at']","to_jsonb(v) - ARRAY['type','profile_meta','updated_at']","RAISE EXCEPTION 'Build 10 correction blocked: persisted vendor postcondition failed'"]) assert.ok(post.includes(s),'missing persisted postcondition: '+s);
});
