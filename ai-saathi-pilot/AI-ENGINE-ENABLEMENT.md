# Gated AI model adapter — NOT ACTIVE

This branch adds a prepared server-only route \`/api/model-chat\` and contract tests. It does **not** modify the currently reviewed UI, which remains on the original isolated deployment.

## Status

- **Model calls:** OFF by default.
- **Production credentials, DBest integrations, bookings, wallets, Supabase and Android apps:** untouched and inaccessible.
- **Roles:** Untrusted preview personas only. There is no production identity bridge.
- **UI:** Unchanged. Do not replace the accepted demo or connect this endpoint to it until access control and billing limits pass review.

## Future activation preconditions (all mandatory)

1. Isolated Vercel project only, protected by Vercel Authentication.
2. Formal authorization for paid model calls and a **hard AI Gateway budget** with alerts.
3. Server-side rate limiting, abuse prevention and authentication review beyond basic preview protection.
4. PII minimization and privacy consent text before sending any user text to an AI provider.
5. Select a CURRENT \`provider/model\` slug from <https://ai-gateway.vercel.sh/v1/models>, review its cost and retention terms.
6. Configure \`AI_GATEWAY_MODEL\` in isolated server environment and Vercel OIDC auth (or a secret API key) without disclosing credentials.
7. Set both \`AI_SAATHI_LLM_ENABLED=true\` and \`AI_SAATHI_COST_GATE_APPROVED=true\` **only after** gates above pass.
8. Run isolated model smoke tests, role-injection tests, denial-of-service tests and verify billing logs.
9. Add distinct preview UI labels for model-backed answers and a graceful simulation fallback before any beta release.

## Guardrails

The route has no external DBest integrations and uses an AI SDK server-side call with no tools. Role labels are not authority. Model answers are non-transactional guidance only. Inputs are limited, common personal identifiers are blocked, and provider errors are not logged. The redaction is not comprehensive and is **not sufficient on its own** for production compliance.

There is no auto-enable and no auto-deploy. This feature should remain in a Draft PR until reviewed.
