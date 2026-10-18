# DBest Cab regression and launch gates — 2026-10-18

## Scope and safety
Audit-only isolated branch. Do not deploy, merge, change live environment variables, Supabase records, Razorpay, PayU or production configuration without explicit approval.

## User-reported evidence
- Cab destination autosuggestions and Popular Nearby Places worked around 7–8 October 2026 (user-reported known-good baseline; exact commit not yet identified).
- On 18 October Android Chrome screenshot of dbest4u.com: pickup Jogibera/Chakradharpur, destination field 'Sonua', no visible suggestion dropdown. Map, Add Stop, One Way, 2 Way, Car Pool visible. Screenshot alone does not prove the root cause.
- Previous audit reported radius and competing async response defects in nearby places, but neither is established as cause of destination autocomplete failure.

## Required read-only investigation
1. Identify exact deployed build and 7–8 October known-good revision via release history, without assuming a date equals a commit.
2. Compare Cab destination autocomplete, Google Places request/auth/config, session and location handling, fallback logic, response cancellation/ordering, and error logs.
3. Reproduce in staging on Android Chrome with Sonua and other nearby destinations; confirm suggestion selection resolves coordinates and booking flow.
4. Validate nearby places ranking Hospitals > Station > Bus Stand > Airport > College > Parks, relevant images, correct radius, and location-specific results.
5. Preserve One Way, same-vehicle 2 Way, Add Stop, Car Pool, fares and Vaahak behavior.

## Release gates (proposed, not yet implemented)
- Branch protection and mandatory CI; no direct production changes.
- Automated Cab, Marketplace, login, wallet and payment regression tests, plus security authorization tests.
- Staging E2E, independent Razorpay reconciliation, wallet ledger consistency and safe rollback review.
- 72h stability observation after successful validation, no critical regressions.
- Public launch remains NO GO until evidence for all critical gates is documented.

## Verification status
Evidence recorded only; no fix, CI implementation, live deployment, or staging pass claimed.
