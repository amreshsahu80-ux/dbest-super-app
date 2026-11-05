# DBest AI Saathi multilingual QA — activation checklist

This branch is a candidate only, not deployed into DBest or the previously approved isolated preview.

## Implemented
- The existing UI remains visually similar, with a consent checkbox dynamically displayed only if model activation gates are satisfied.
- A server-side assistant endpoint retains simulated replies while gates are OFF.
- New model gateway adapter uses AI SDK 7.0.93 and a fixed allowlist of low-cost model IDs.
- Up to six preceding role-labelled messages are passed to the AI for context; they remain only in the browser's current session and in flight to the model.
- English, Hindi and Odia instructions, basic PII blocking, nontransactional behavior and cross-origin rejection.
- Redis REST-based atomic rate limiting using EVAL: 3 messages per minute per network identifier and 60 messages per day globally, fail-closed.
- No DBest Supabase, payment, order, cab, wallet, Gmail, Drive or Android connection.
- Each role is a simulation persona; not an authenticated DBest user.

## Explicit remaining work (do NOT bypass)
1. Establish a HARD and verifiable AI Gateway spending budget on the isolated project/team with owner-approved amount.
2. Configure an independent isolated Redis instance for server-side rate limiting, with secrets kept in Vercel only.
3. Review privacy policy, consent text, data retention and provider hosting location; do not send real customer personal information for QA.
4. Verify the Vercel preview is access protected and contains no customer data.
5. Configure AI_GATEWAY_MODEL to openai/gpt-5.4-mini (verify current catalog again before enabling).
6. Configure an AI Gateway OIDC identity or secret key, restricted to the isolated QA project.
7. After budget and privacy approvals, set AI_SAATHI_LLM_ENABLED, AI_SAATHI_COST_GATE_APPROVED and AI_SAATHI_PRIVACY_GATE_APPROVED to true in the isolated Vercel QA project only.
8. Perform actual model-response tests and a limit-exceeding request; inspect usage/cost/error logs.
9. Obtain final review before any connection to DBest services or Android app.

## Prohibited in this stage
- Changing main or production deployments/domains.
- Reusing production Supabase or payment keys.
- Claiming live bookings or financial results.
- Linking owner persona selector to privileged data.
- Merging directly to main or publishing any Android release.
