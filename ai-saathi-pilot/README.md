# DBest AI Saathi — isolated pilot (2026-11-05)

This is a **fully isolated, mock-response UI/API prototype**, not a live AI model and **not** a booking or payments application.

## Isolation guarantees

- New files are restricted to the \`ai-saathi-pilot/\` folder on \`feat/ai-saathi-isolated-pilot-20261105\`.
- Deployed to a **separate Vercel project**, with Vercel Authentication enabled.
- No code is inserted into the main DBest homepage, Android apps, partner app or owner console.
- No import or connection to Supabase, third-party supplier APIs, payment gateways, Google Drive, Gmail or live DBest sessions.
- Role switcher is a **demo persona selector**, never user authentication.
- No real prices, bookings, jobs, customer records, transactions, ledger balances or reports.
- No model provider key and no model calls yet.
- No conversation persistence; the browser only holds chat during the current page session.
- Production feature flags remain absent/off.
- Avoid adding live credentials to preview environments.

## Files

- \`index.html\`, \`styles.css\`, \`app.js\`: standalone responsive demo interface.
- \`api/chat.js\`: deterministic, mock-only responses with role separation for simulations.
- \`api/health.js\`: zero-live-integration declaration.
- \`tests/chat.test.cjs\`: Node.js built-in integration contract tests.
- \`vercel.json\`: conservative security and anti-indexing headers.

## Verification

Run \`npm test\` from this folder (Node 20+). Verify all tests pass, the UI works on Android-sized viewports, three roles are clearly marked demo, no developer tools reveal unexpected network calls, and \`/api/health\` confirms live tools are disabled.

## Phase 2 (not authorized by the existence of this pilot)

Only after code review: implement identity verification and independently authorized tool gateway; use approved knowledge retrieval, read-only queries, redacted traces and robust RLS. Add actual model generation through a server-side model gateway without exposing secrets. Test prompt injection, tenant isolation, replay/idempotency, rate limiting, spend controls and incident rollback.

**Do not attach this project's credentials to production. Do not merge this branch into main or connect a production domain.**
