# DBest Super Platform — Launch Readiness Audit (2026-10-29, IST)

**Release gate: NO GO.** Read-only Supabase/Vercel verification plus one isolated, non-production Cab code correction. No public-launch authorization.

## New finding — server-side Google Places key is not configured in listed Vercel project environments

- On 2026-10-29, Vercel project `dbest-super-app` environment-variable inventory returned 22 entries. It contains `GOOGLE_MAPS_BROWSER_KEY` for production and one branch-scoped preview, but **no `GOOGLE_MAPS_SERVER_KEY`** and no `GOOGLE_MAPS_API_KEY` entry.
- The isolated Cab Nearby Places endpoint `api/runtime-config.js` now reads **only** `process.env.GOOGLE_MAPS_SERVER_KEY` for server-side Google Places New requests. Consequently, under the listed project environment configuration, this Google provider cannot run; the endpoint depends on public Overpass fallbacks. This is a configuration/code mismatch, not a proven production outage. Deployment-specific/shared environment injections were not independently excluded.
- Action needed before considering the preview ready: provision an appropriately restricted server-side Google Places API key in the correct **preview** environment (and production only after controlled release approval), verify API enablement, billing and provider behavior, and test with actual coordinates and Android UI. Do not reuse a browser-referrer-restricted key for server-side requests without checking restrictions. No secret values are included in this report.

## Verified isolated low-risk fix — remove prohibited public Nominatim POI fallback

- Commit [180f9e5fa796bd547b94deea2020a3ae56e51b39](https://github.com/amreshsahu80-ux/dbest-super-app/commit/180f9e5fa796bd547b94deea2020a3ae56e51b39) on branch `audit/cab-regression-hardening-20261018` removed the public Nominatim nearby-category fallback and its five simultaneous POI queries. The existing Google Places and Overpass fallback paths remain unchanged.
- The updated source was fetched back from GitHub and passed **three isolated mocked handler tests**: invalid coordinates return HTTP 400, mocked Google Places success returns HTTP 200 with a place, and all-provider failure returns HTTP 503 without fabricated places.
- No associated GitHub pull-request workflow run or combined status was returned for the new commit at verification time. **These are local/mocked tests only**, not CI or real-device functional proof.
- This removes the identified Nominatim policy issue from the **isolated audit branch only**. It does not restore Nearby Places or establish launch readiness. Production was not changed.

## Reverified database security and financial state

- Supabase original project `ydedmotbacnllkijzmvp` is accessible and `ACTIVE_HEALTHY`. Three `public` SECURITY DEFINER checkout functions remain executable by `anon`: `dbest_create_quote_checkout_draft`, `dbest_save_quote_delivery_address`, and `dbest_save_quote_delivery_details`. Prior source review found missing caller/session binding; no exploit or SQL changes attempted.
- Member wallets: **9 accounts**, ₹2,901.47 available, ₹0 held, **0 ledger mismatches**.
- Vaahak wallets: approved partner account **−₹45** matches its ledger; rejected QA account retains **₹9 mismatch**.
- Marketplace: **12 Paid/Created master orders** totalling ₹0 with no children, each linked to an internal transaction, **₹3,840** linked transaction total. Separately 6 Paid/Completed masters totalling ₹1,610 have children. Internal `Verified` is not settlement proof.
- Razorpay-labelled transactions: **22 Verified / ₹7,296** internally; prior evidence identifies one ₹400 QA entry, leaving 21 / ₹6,896 requiring independent capture/settlement/refund verification. **No gateway ledger/export was available**.
- Payout requests: one Failed request / ₹10; no adjustment.
- Supabase development branch `main` still reports `MIGRATIONS_FAILED` while its preview project reports `ACTIVE_HEALTHY`.

## Release and remaining gates

- Vercel production deployment inventory still shows READY `dpl_G7xwtaNKs7mq8LMJRTC57x5jPXwZ` (commit `e5a1bbe0a36ed41d9d7099e55d5f17e5063d8eda`) as latest production deployment; `dbest4u.com` remains verified on the project. No production deployment performed.
- Remediation and negative authorization tests for the three checkout functions, independent Razorpay reconciliation, anomalous master-order reconciliation, migration repair, production-equivalent Cab Nearby Places and Android tests, Marketplace quote-to-delivery E2E, idempotency, and release/rollback evidence remain incomplete.
- **NO GO** pending all material gates. No PayU changes, financial writes, SQL DDL, production deployment, or changes to frozen production Cab/Marketplace flows.

## Evidence scope

Connected read-only Supabase SQL, Supabase branch/project inventory, Vercel production deployment/domain/environment-key-name inventory (values intentionally excluded), GitHub source/commit verification, and mocked isolated handler tests. No gateway account settlement export, production Android device session, or public-launch signoff was obtained.
