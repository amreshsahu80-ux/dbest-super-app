# DBest WhatsApp Marketing — isolated implementation plan

Status: PREPARATION ONLY. No production deployment, sending, contact import or credentials changes.
Branch: feat/whatsapp-marketing-isolated-20261108

## Non-negotiable boundaries
- Never modify the existing whatsapp-notification-live Edge Function, its secrets, webhook, or utility notification queues.
- Do not use any phone number for promotional messaging until WABA ownership and approved marketing messaging permissions are confirmed.
- Never treat DUNS registration, existing phone contacts, or email addresses as WhatsApp marketing consent.
- No promotional sends without documented, channel-specific consent and a clear opt-out mechanism.

## Modules to build in an isolated preview
1. Consent capture: DBest website opt-in checkbox (unchecked), WhatsApp click-to-chat, and opt-in email landing page. Store consent timestamp, source, notice version, exact disclosure, and evidence.
2. Contacts: deduplication, E.164 normalization, suppression list, CSV import preview, and consent eligibility validation.
3. Campaigns: draft, template mapping, audience filters, test-only mode, approvals, scheduled batches, per-recipient send ledger and retries with idempotency.
4. Inbox: webhook events for delivered/read/failed and STOP/UNSUBSCRIBE opt-outs; ensure no interference with existing utility webhook.
5. Owner Console: campaign approval, audience size, send limits, budget guardrails, reporting, and immutable audit trail.

## Proposed data model (not deployed)
- wa_marketing_contacts: id, phone_e164, status, created_at, updated_at
- wa_marketing_consents: id, contact_id, channel, consent_text, consent_version, source, evidence_ref, consented_at, revoked_at
- wa_marketing_suppressions: id, phone_e164, reason, recorded_at
- wa_marketing_templates: id, meta_template_name, language, category, meta_status, updated_at
- wa_marketing_campaigns: id, title, template_id, audience_filter, status, scheduled_at, approved_by, approved_at
- wa_marketing_deliveries: id, campaign_id, contact_id, idempotency_key, status, provider_message_id, error_code, updated_at
- wa_marketing_events: id, delivery_id, event_type, payload_redacted, occurred_at
- wa_marketing_audit: id, actor_id, action, entity_type, entity_id, occurred_at

## Release gates
- Restore admin access to WABA 1886401955857273 and verify Phone Number ID 1345339418658745.
- Confirm actual registered phone number, Meta app, business owner, token permissions, and marketing template approvals.
- Separate marketing send identity from critical operational notifications where appropriate.
- Validate opt-in proof, unsubscribe, data retention, access control/RLS, rate limiting, budget, monitoring, and provider charges.
- Run synthetic tests in an isolated environment; then manually approve a small consented test audience.
- Only after explicit owner approval may any live changes or promotional sends occur.
