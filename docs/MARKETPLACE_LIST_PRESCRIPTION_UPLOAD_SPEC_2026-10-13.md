# Marketplace: Upload List / Prescription

Status: proposed enhancement; not yet implemented or deployed.

## Customer
- Display Upload Shopping List for Grocery and Upload Prescription / Medicine List for Medicine; Upload Food Order List for Restaurant (including bulk and customised orders).
- Accept JPG, PNG and PDF from camera, gallery or file picker. Validate file type, size and count server-side.
- Show selected vendor, delivery address, contact details, upload preview and consent before submission.
- Submission creates a quote request, **not** a paid order or dispatch job.

## Vendor
- Only the selected, approved vendor can view the request and attachment through private, short-lived authorized URLs.
- Vendor can quote item-by-item price, quantity, substitutions, delivery fee and availability; customer explicitly approves before checkout.
- For prescriptions, a licensed pharmacy/pharmacist must review prescription requirements before sale; no automated dispensing authorization.

## Security and lifecycle
- Private storage bucket, authorization by request ownership, file validation, upload rate limits, malware/content safeguards, retention/deletion controls and audit trail.
- Statuses: Submitted, Vendor Reviewing, Quote Ready, Customer Accepted, Payment Pending, Verified/Paid, Fulfilment, Completed, Cancelled/Expired.
- Integrate with existing Razorpay verification and established Vendor/Vaahak flow only after customer accepts the quote. Do not trust client prepaid flags.
- Maintain current catalogue-based checkout unchanged; PayU deferred.

## Regression
- Grocery list, medicine prescription and restaurant food-order list uploads; invalid files; unauthorized access; rejected/expired quote; price confirmation; Razorpay payment; Vendor handover; Vaahak delivery; duplicate submission.

## Restaurant-specific quotation
- Place Upload Food Order List below Restaurant search beside catalogue ordering.
- Allow event date/time, number of people, preparation notes and optional delivery instructions.
- Restaurant confirms item quantities, substitutions, availability, preparation/delivery time and total quote before customer approval.
- Use the same secure upload, quotation and verified-payment lifecycle as Grocery and Medicine.
