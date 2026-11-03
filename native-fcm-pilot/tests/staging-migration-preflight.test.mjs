import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Repository-only migration ordering check. This is not a database replay.
const path="../migrations/20260915185000_vaahak_historical_replay_compatibility_STAGING_ONLY.sql";
const sql=readFileSync(new URL(path,import.meta.url),"utf8");
test("staged compatibility migration timestamp precedes broken trigger migration",()=>{
  const name=path.match(/(\d{14})_/)?.[1];
  assert.ok(name);
  assert.ok(name>"20260915181311");
  assert.ok(name<"20260915190058");
});
test("three missing fields use live catalog types and safe Pending default",()=>{
  assert.match(sql,/ADD COLUMN IF NOT EXISTS order_meta jsonb/i);
  assert.match(sql,/ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'Pending'/i);
  assert.match(sql,/ADD COLUMN IF NOT EXISTS payment_received_at timestamptz/i);
});
test("migration fails closed if Vaahak jobs table is not present",()=>{
  assert.match(sql,/to_regclass\('public.vaahak_jobs_live'\)/i);
  assert.match(sql,/RAISE EXCEPTION/i);
});
test("no destructive or production write operations in compatibility SQL",()=>{
  assert.doesNotMatch(sql,/\b(?:DROP|TRUNCATE|DELETE|UPDATE|INSERT)\s+(?:TABLE|INTO|FROM|public\.)/i);
  assert.match(sql,/STAGING REPLAY COMPATIBILITY CANDIDATE/i);
});
