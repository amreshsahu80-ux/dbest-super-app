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

## Original historical trigger body: synthetic delivery replay (2026-11-03)

- CI https://github.com/amreshsahu80-ux/dbest-super-app/actions/runs/41557913039: PostgreSQL 17 job and native FCM Node QA **SUCCESS**.
- Captured the 2,880-byte recorded SQL source from migration `20260915190058` as an isolated, secret-free fixture: `native-fcm-pilot/tests/fixtures/20260915190058_original_trigger.sql`.
- Following the compatibility patch in disposable PostgreSQL, the **actual recorded PL/pgSQL trigger function** successfully processed a synthetic Marketplace delivery:
  - new delivery assigned to Vaahak → vendor order moves to `Vaahak Assigned / Going to Vendor`
  - `Trip Started` → vendor pickup/out-for-delivery fields update
  - `Completed` with `Received` payment → vendor order completed/payment fields update
  - unrelated `ride` event → does not alter Marketplace order
- All synthetic SQL ran in a transaction that was rolled back. No production or real records were touched.
- This substantially raises confidence in the **first** migration repair, but still does **not** prove replay of all 207 migrations, later migration dependencies, or native FCM-to-Android end-to-end operation.

## Successive recorded migration verification (2026-11-03)

- CI: https://github.com/amreshsahu80-ux/dbest-super-app/actions/runs/41558621371 — PostgreSQL 17 and Node jobs both **SUCCESS**.
- Replayed **five recorded SQL migrations** in timestamp order on a disposable minimal PostgreSQL schema (20260915190058, 20260915190237, 20260915191206, 20260915192326, 20260915192348), after the proposed 20260915185000 compatibility patch. Historical SQL fixtures are kept under `native-fcm-pilot/tests/fixtures/`.
- `native-fcm-pilot/tests/staging-next-five-migrations.sql` verifies three Vaahak triggers, dual 4-digit distinct PIN creation, blocking unverified pickup, successful verified pickup, blocking unverified completion, successful verified completion/payment status sync, and no Marketplace contamination by ride jobs.
- Each test runs with `BEGIN ... ROLLBACK`. No customer data, real dispatch, Firebase credentials, or paid Supabase staging were involved.
- **Limit:** these are five genuine historical SQL statements tested against representative synthetic tables, **not** a full replay from migration 1 to 207. More migration dependencies may fail later; do not treat this as production deployment approval.

## Eight-migration PostgreSQL replay and second schema-gap fix (2026-11-03)

- CI run: https://github.com/amreshsahu80-ux/dbest-super-app/actions/runs/41560030399 — both PostgreSQL and Node test jobs **SUCCESS**. First attempt failed because plain PostgreSQL lacks Supabase's default `anon` role; the synthetic test fixture now creates `anon` and `authenticated` as disposable roles. No live configuration changed.
- Original historical SQL fixtures were replayed sequentially for versions `20260915190058`, `20260915190237`, `20260915191206`, `20260915192326`, `20260915192348`, `20260915192625`, `20260915200257`, `20260915204539`, following the staging-only compatibility patch. These are **eight historical statements in a representative database**, not a full 207-migration recreation.
- Historical migration `20260915204539` also refers to `vaahak_jobs_live.payment_method`, which is present in the current parent schema as nullable `text` but not introduced in preceding recorded table-alter migrations. Staging-only patch now includes `payment_method text` to support this downstream normalization trigger; it has **not been applied to the parent**.
- `native-fcm-pilot/tests/staging-next-eight-migrations.sql` validated: dedicated PIN table replaces public order PIN columns; generated pickup/delivery PINs differ; unverified pickup and delivery are rejected; verified progression succeeds; Pay-at-Delivery `Prepaid` is normalized to `Pending` on both order and Vaahak; handover event uniqueness holds; completed payment and Marketplace status sync.
- SQL tests were transactional `BEGIN/ROLLBACK`. No actual rides, account registrations, FCM sends, production migrations, or paid Supabase branches were involved.
- **Remaining limitation:** full replay of migrations 1–207, Supabase-specific RLS/runtime differences, full backend function E2E, and phone pilot are not yet verified.

## Ninth historical migration: Marketplace delivery settlement (2026-11-03)

- Disposable PostgreSQL 17 CI: https://github.com/amreshsahu80-ux/dbest-super-app/actions/runs/41560647357 — both Node QA and historical PostgreSQL replay jobs **SUCCESS**.
- Recorded historical migration `20260916081248 marketplace_vaahak_50_split_and_vendor_margin_v2` was saved as an isolated original SQL fixture and run after the previous eight historical migration fixtures and the staged compatibility patch, using representative synthetic tables.
- `native-fcm-pilot/tests/staging-next-nine-migrations.sql` checked the **50% Vaahak / 50% DBest** delivery-charge split; vendor-agreed margin application; gross, delivery, margin and net settlement calculations; idempotent settlement upsert; no settlement for unpaid orders; isolation of regular passenger rides; and the margin constraint rejecting values above 100%.
- Verification was performed in an explicit `BEGIN ... ROLLBACK` transaction on disposable PostgreSQL. No real DBest jobs, marketplace payments, Supabase data, sending flags or paid preview environments were changed.
- **Scope:** nine successive *original recorded migrations* tested on a synthetic minimal schema, NOT full replay of 207 migrations and NOT a proof of the complete real production data model. Later migration prerequisites and schema drift remain open.

## Vaahak daily platform fee / delivery fee reversal — migration 20260916081907 (2026-11-03)

- CI: https://github.com/amreshsahu80-ux/dbest-super-app/actions/runs/41561228415 — Node rules and disposable PostgreSQL 17 jobs both **SUCCESS**.
- Saved original migration SQL in `native-fcm-pilot/tests/fixtures/20260916081907_original.sql`. Tested it using `native-fcm-pilot/tests/staging-vaahak-platform-fee-replay.sql` on minimal, synthetic tables. This is a test of the original migration body, **not** a full historical replay.
- Synthetic checks passed: old Marketplace delivery fee entries reversed with `Reversed` audit status; one positive wallet adjustment per prior fee; already-refunded fees did not credit a wallet twice; rerunning the migration did not duplicate adjustments or modify wallet balances; a completed delivery incurred **no extra platform fee**; a completed Cab ride incurred its configured daily fee; repeated/same-day completed rides did not duplicate the charge; with `noJobNoFee=false`, no new Cab fee was accrued.
- All synthetic inserts/updates were wrapped in `BEGIN ... ROLLBACK`. No production wallet, Cab, Marketplace, financial record, application function, FCM switch, or billable branch was altered.
- **Release gate still NO-GO:** the migration body passes on a representative environment only. Full ordered replay of migrations 1–207 with complete schema + security controls, and controlled notification E2E, remain untested.

## Remaining gates

1. Reproduce the exact failure in a controlled full migration replay and capture logs.
2. Apply the staged compatibility change only before its dependent migration in the *isolated replay* and rerun **all** 207 historical migrations.
3. Inspect for additional drift and compare the reconstructed schema against the current parent.
4. Re-verify native FCM private tables, single-device bindings, Vaahak ride lifecycle and auth; no real devices/FCM sends until approved.
5. Seek separate cost approval before any new billable Supabase branch/project is created.

Production Cab/Marketplace and all FCM send flags are outside this migration investigation; none were altered.
