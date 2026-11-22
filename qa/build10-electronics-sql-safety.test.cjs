// Build 10: local regression guard for read-only Samsung Point diagnostics.
// Run: node --test qa/build10-electronics-sql-safety.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const files = [
  'build10-samsung-point-electronics-dry-run.sql',
  'build10-electronics-discovery-contract-inspection.sql'
];
function stripCommentsAndStrings(sql) {
  return sql.replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:''|[^'])*'/g, "''")
    .replace(/\$([a-zA-Z_][\w]*)?\$[\s\S]*?\$\1\$/g, "''");
}
// SELECT INTO and row-locking SELECT are writes/locks even without a DML verb.
function assertReadOnlyStatement(statement) {
  assert.match(statement, /^(?:WITH\b[\s\S]*?\bSELECT\b|SELECT\b)/i);
  assert.doesNotMatch(statement, /\b(?:INSERT|UPDATE|DELETE|MERGE|TRUNCATE|ALTER|DROP|CREATE|GRANT|REVOKE|CALL|DO|COPY|EXECUTE|COMMIT|ROLLBACK)\b/i);
  assert.doesNotMatch(statement, /\bSELECT\b[\s\S]*?\bINTO\s+(?:TEMP(?:ORARY)?\s+|UNLOGGED\s+)?(?:TABLE\s+)?[a-z_]/i);
  assert.doesNotMatch(statement, /\bFOR\s+(?:NO\s+KEY\s+UPDATE|KEY\s+SHARE|UPDATE|SHARE)\b/i);
}
test('SQL safety guard rejects SELECT INTO and locking SELECT', () => {
  for (const unsafe of ['SELECT * INTO TEMP TABLE x FROM vendors', 'SELECT * FROM vendors FOR UPDATE', 'WITH x AS (DELETE FROM vendors RETURNING *) SELECT * FROM x']) {
    assert.throws(() => assertReadOnlyStatement(unsafe), undefined, unsafe);
  }
  assert.doesNotThrow(() => assertReadOnlyStatement('SELECT id FROM vendors WHERE active IS TRUE'));
});
for (const file of files) {
  test(file + ' contains SELECT-only statements', () => {
    const sql = fs.readFileSync(path.join(root, file), 'utf8');
    const cleaned = stripCommentsAndStrings(sql);
    const statements = cleaned.split(';').map(s => s.trim()).filter(Boolean);
    assert.ok(statements.length > 0, 'expected inspection queries');
    for (const statement of statements) assertReadOnlyStatement(statement);
  });
}
test('Samsung Point preview preserves fail-closed category and catalogue guards', () => {
  const sql = fs.readFileSync(path.join(root, files[0]), 'utf8');
  for (const guard of [
    "v.id = 'VND8597199'",
    "v.type = 'other'",
    "v.owner_approval = 'Approved'",
    "v.active IS TRUE",
    "v.agreement_status = 'Fully Signed'",
    "v.operational_hold IS FALSE",
    "r.electronics_enabled",
    "i.market_type IS DISTINCT FROM 'electronics'",
    "AS correction_eligible"
  ]) assert.ok(sql.includes(guard), 'missing guard: ' + guard);
});
