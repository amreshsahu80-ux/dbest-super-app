# Automatic category catalogue — approved product policy

Owner approves a master CSV product once. All active, Owner-approved, non-held vendors of the same category inherit it automatically. No per-product vendor activation, no per-product Owner offer approval, and no manual vendor selection.

## Vendor overrides
Each eligible vendor may optionally override selling price (not exceeding Owner MRP), discount, stock, and vendor image. These overrides must be scoped to that vendor and must not change the master record or other vendors' offers. Valid overrides are auto-approved, subject to automated validation and moderation for unsafe images/content.

## Customer availability safeguard
Automatic catalogue assignment is distinct from confirmed stock. A mapped product must not be represented as in-stock or orderable until inventory availability is established by a reliable stock source or explicit vendor stock data. The product may still appear as unavailable.

## Lifecycle
New approved vendor inherits all approved products of its category automatically. Newly approved product maps to all eligible vendors. Suspended, rejected, inactive or operationally held vendors are excluded immediately. Owner may suspend any master product. Mapping should be derived from current status, not a one-time copied assignment.

## Release
Implement and test on isolated branch and preview before touching live marketplace flows. No claim of live functionality until production release.
