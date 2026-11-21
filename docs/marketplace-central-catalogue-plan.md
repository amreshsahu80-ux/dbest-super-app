# DBest central catalogue / vendor offer architecture

Status: isolated design, not deployed. Existing marketplace_catalog_live and orders remain untouched.

## Master catalogue
Each DBest product has a stable master_product_id, brand, product title, category/subcategory, specifications JSON, pack size, barcode/GTIN, HSN/SAC, reviewed GST treatment and effective dates, vetted image source/license, and moderation status. A product is not automatically purchasable merely because it exists in the master catalogue.

## Vendor offers
Each vendor opts in to a master product using a vendor_offer row keyed by (vendor_id, master_product_id). Vendor-specific selling price (GST inclusive), MRP where applicable, stock, fulfillment eligibility, and availability are independent. Only approved active vendors with active in-stock offers may sell. Historical orders retain immutable item snapshots; never cascade-delete products referenced by orders.

## Import safety
CSV upload first goes into a staging table with batch ID, source, import timestamp and row validation status. Validate duplicate GTIN/SKU, product variants, image permissions, GST effective dates, brand naming, regulated medicines, and price/MRP. Approve and publish atomically. Archive old catalogue records after mapping IDs and checking open orders; do not truncate live tables.

## Customer checkout
Resolve offer prices and quantities server-side, calculate product GST from reviewed classification, verify vendor-to-drop road distance, calculate delivery per vendor, and issue an expiring signed quote. Recompute or validate quote at order placement. Customer UI displays final payable and a breakdown; Razorpay collection and invoice use exactly that total. Missing classifications or route verification must not silently default to zero.

## Medicines
OTC is not determined from the product name alone. Require licensed pharmacy/vendor verification and medicine-specific regulatory review; prescription-only items require valid prescription flow. Avoid treating supplements and medical devices as drugs automatically.

## Acceptance gates
1. CSV staging import and duplicate/invalid row reporting.
2. Vendor opt-in, price, stock, and out-of-stock tests.
3. Multi-vendor order pricing, GST-inclusive rounding and delivery fee tests.
4. Existing active orders and vendor data unchanged.
5. Preview end-to-end QA before any production migration.

## Vendor-created products (approved addition)
Vendors can (a) select existing DBest master products and create their own offers, (b) submit a new product with brand, category, variant, specifications, GST-inclusive selling price, stock and image rights/source, or (c) bulk-upload via CSV. These are parallel workflows, not mutually exclusive.

New submissions are vendor-owned pending records and must not modify or overwrite master records. Match by barcode/GTIN, brand + manufacturer SKU, and normalized variant attributes; propose duplicates for vendor confirmation. On a verified match, attach a vendor offer to the existing master ID. Otherwise send the new candidate for owner review and approval before customer visibility.

A vendor may edit its own offer price, stock and availability, subject to audit history. Product identity, verified HSN/SAC classification and master images are controlled centrally. Unverified GST or restricted-medicine status blocks checkout or publishing as appropriate; no assumed zero-tax rates. Vendor-uploaded images require rights checks. Bulk imports return row-level success, duplicate, and rejection reports.

Owner console must support approve, reject, request corrections, merge duplicates, suspend, and publish, while preserving vendor attribution and immutable order history. Existing live vendor onboarding and order processing remain unchanged until the isolated implementation passes QA.
