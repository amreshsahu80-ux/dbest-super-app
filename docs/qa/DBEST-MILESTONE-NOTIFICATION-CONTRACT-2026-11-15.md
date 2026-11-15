# DBest Ride & Marketplace milestone notification contract
Status: approved requirement; not implemented or QA verified by this document. Isolated PR #157.

## Non-negotiable rules
- Trigger only after durable, authenticated backend transition. A client tap or optimistic state does not count.
- Emit once per job/order, milestone and recipient using durable idempotency key; retries must not duplicate pushes or WhatsApp.
- Persist notification event, delivery attempts, provider receipt, last error and timestamps. Retry transient failures; don't mark sent before provider acceptance.
- Do not send Ride PIN in push notifications or WhatsApp. Display PIN only inside authenticated customer's booking view after server-confirmed acceptance.
- Push only to currently authorized device session; respect explicit logout, new-device takeover, opt-in, and Android notification permission. Do not block core transaction when notification fails.
- WhatsApp only for compliant opt-in/approved templates. In-app timeline and polling remain fallback.
- Separate status transition from notification delivery; server returns authoritative status and accepted_at.

## Ride milestones
| Milestone | Authoritative event | Recipient |
| --- | --- | --- |
| Booking created | committed ride job | customer |
| Ride offered | dispatch offer assigned | offered Vaahak |
| Ride accepted | status Accepted + assigned_partner_id + accepted_at | customer |
| Arriving/arrived | verified driver location / explicit arrival event | customer |
| PIN verified, started | server OTP validation + Trip Started + started_at | customer, Vaahak |
| Completed | status Completed + completed_at | customer, Vaahak |
| Payment confirmed | payment status verified | customer, Vaahak as applicable |
| Invoice ready | invoice persisted | customer |
| Expired/cancelled | committed terminal transition | customer and affected Vaahak |

## Marketplace milestones
| Milestone | Authoritative event | Recipient |
| --- | --- | --- |
| Order placed | committed order | customer and eligible vendor(s) |
| Vendor accepted | vendor accepted order | customer |
| Preparing | vendor preparation state | customer |
| Ready for pickup | vendor ready state | customer and assigned Vaahak |
| Delivery offered | dispatch offer assigned | Vaahak |
| Delivery accepted | accepted job committed | customer, vendor |
| Handover confirmed | vendor and Vaahak handover verified | customer |
| Out for delivery | delivery started | customer |
| Delivered | delivery completed with proof/PIN if configured | customer, vendor |
| Payment confirmed | verified payment event | relevant parties |
| Cancelled/refunded | committed cancellation/refund | relevant parties |

## QA gates
1. Verify backend state changes, then notification event and provider receipt.
2. Verify customer in-app timeline updates without refreshing.
3. Simulate duplicate event and retry; exactly one customer-facing alert per milestone.
4. Test offline, denied notification permission, revoked session and second-device login.
5. Test ride accept rejection/expiry: no false Accepted alert or PIN.
6. Test Marketplace vendor and Vaahak notifications separately.
7. Keep existing live platform and Play submission untouched until verified.
