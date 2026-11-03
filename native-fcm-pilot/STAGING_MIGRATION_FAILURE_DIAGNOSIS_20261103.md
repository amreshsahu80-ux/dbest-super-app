# Staging migration failure investigation — 2026-11-03

## Evidence (read-only on existing parent database)

- Parent project `ydedmotbacnllkijzmvp` has 207 recorded database migrations. Its `main` branch is listed as `MIGRATIONS_FAILED`, despite the parent project reporting healthy.
- Previously approved temporary preview branch `slhvcylhtkkutvgcxpfx` replayed the first **128** recorded migrations, ending at `20260915181311 vendor_marketplace_settlements_v1`. The next migration was `20260915190058 sync_marketplace_delivery_from_vaahak_job`. The preview branch is **deleted** and no longer billing.
- The next migration creates a trigger on `public.vaahak_jobs_live` with `AFTER INSERT OR UPDATE OF status,assigned_partner_id,accepted_at,started_at,completed_at,payment_status,payment_received_at,order_meta`. It also accesses `new.order_meta`, `new.payment_status`, `new.payment_received_at`.
- The original Vaahak table creation recorded in `20260821105323 vaahak_live_dispatch` omits `payment_status`, `payment_received_at`, `order_meta`. Inspection of recorded **earlier migrations** did not find `ALTER TABLE public.vaahak_jobs_live` introducing those fields before this trigger migration.
- Current parent DB *does* have these three fields: `order_meta jsonb NULL`, `payment_status text NOT NULL DEFAULT 'Pending'`, `payment_received_at timestamptz NULL`. This is evidence of replay incompatibility/schema-history drift, **not proof of which migration statement threw the error**. The removed preview's exact deployment error logs were not recovered.
- No migration SQL files were found under `supabase/migrations/` in the connected repository's `main` tree. This makes it unsafe to assume adding a GitHub SQL file will automatically influence the Supabase history-driven branch creation.

## Isolated candidate repair, NOT applied

`native-fcm-pilot/migrations/20260915185000_vaahak_historical_replay_compatibility_STAGING_ONLY.sql` stages the three historically missing fields with current parent types/default. Its intended position is **between** `20260915181311` and `20260915190058`.

**This file has not been executed on the parent or a live database.** It cannot be tested by creating a standard Supabase branch and *then* applying it, because branch provisioning automatically replays the broken history before the branch is available. To verify, use an isolated, explicitly approved local Postgres/Supabase CLI reset or an isolated preview configured to include the ordered historical migrations, then replay fully and compare schemas. Never rewrite the live `supabase_migrations.schema_migrations` table just to make the status green.


## Independent no-cost PostgreSQL 17 reproduction (2026-11-03)

- CI: https://github.com/amreshsahu80-ux/dbest-super-app/actions/runs/41557533893 (both existing Node QA and PostgreSQL job **SUCCESS**).
- Executed a minimal historical table/trigger boundary reproduction in disposable `postgres:17` inside GitHub Actions; no Supabase preview project or live credentials involved.
- The pre-patch `CREATE TRIGGER ... AFTER INSERT OR UPDATE OF payment_status,payment_received_at,order_meta` failed with **PostgreSQL SQLSTATE `42703`**. Log: `column "payment_status" of relation "vaahak_jobs_live" does not exist`.
- Applied the staged compatibility patch **twice**, then successfully created the same trigger and checked `pg_trigger`; all SQL was `ROLLBACK`ed.
- Test code: `native-fcm-pilot/tests/staging-trigger-boundary-replay.sql`; workflow: `.github/workflows/vaahak-fcm-offer-rules.yml`.
- **Limit:** this is a structural reproduction of the trigger-column migration boundary using a representative table and a no-op function, NOT the original 207-migration replay or an end-to-end running Cab database.

## Remaining gates

1. Reproduce the exact failure in a controlled full migration replay and capture logs.
2. Apply the staged compatibility change only before its dependent migration in the *isolated replay* and rerun **all** 207 historical migrations.
3. Inspect for additional drift and compare the reconstructed schema against the current parent.
4. Re-verify native FCM private tables, single-device bindings, Vaahak ride lifecycle and auth; no real devices/FCM sends until approved.
5. Seek separate cost approval before any new billable Supabase branch/project is created.

Production Cab/Marketplace and all FCM send flags are outside this migration investigation; none were altered.
