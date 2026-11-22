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
for (const file of files) {
  test(file + ' contains SELECT-only statements', () => {
    const sql = fs.readFileSync(path.join(root, file), 'utf8');
    const cleaned = stripCommentsAndStrings(sql);
    const statements = cleaned.split(';').map(s => s.trim()).filter(Boolean);
    assert.ok(statements.length > 0, 'expected inspection queries');
    for (const statement of statements) {
      assert.match(statement, /^(?:WITH\b[\s\S]*?\bSELECT\b|SELECT\b)/i);
      assert.doesNotMatch(statement, /\b(?:INSERT|UPDATE|DELETE|MERGE|TRUNCATE|ALTER|DROP|CREATE|GRANT|REVOKE|CALL|DO|COPY|EXECUTE|COMMIT|ROLLBACK)\b/i);
    }
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
