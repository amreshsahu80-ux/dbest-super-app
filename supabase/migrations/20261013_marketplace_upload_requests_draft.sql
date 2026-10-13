-- Draft only. Apply after review and staging tests.
create table if not exists public.marketplace_upload_requests_live (
 id uuid primary key default gen_random_uuid(),
 category text not null check(category in ('grocery','medicine','restaurant')),
 vendor_id text not null,
 customer_member_id text,
 customer_contact text,
 object_path text not null unique,
 original_filename text not null,
 mime_type text not null check(mime_type in ('image/jpeg','image/png','application/pdf')),
 file_size_bytes integer not null check(file_size_bytes between 1 and 8388608),
 status text not null default 'Pending Upload' check(status in ('Pending Upload','Submitted','Vendor Reviewing','Quote Ready','Customer Accepted','Payment Pending','Verified/Paid','Fulfilment','Completed','Cancelled','Expired')),
 quote_items jsonb,
 quoted_total numeric(12,2),
 customer_approved_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.marketplace_upload_requests_live enable row level security;
revoke all on public.marketplace_upload_requests_live from anon,authenticated;
-- Enforce authenticated customer ownership for member-originated requests.
alter table public.marketplace_upload_requests_live
 add constraint marketplace_upload_member_required check (customer_member_id is not null and length(trim(customer_member_id)) > 0);
-- A quote cannot be approved without a nonnegative server-calculated amount.
alter table public.marketplace_upload_requests_live
 add constraint marketplace_upload_approved_quote_required check (
  status not in ('Customer Accepted','Payment Pending','Verified/Paid','Fulfilment','Completed')
  or (quoted_total is not null and quoted_total >= 0 and customer_approved_at is not null)
 );
-- Bound retention cleanup and Vendor/customer dashboard queries.
create index if not exists marketplace_upload_requests_customer_created_idx on public.marketplace_upload_requests_live(customer_member_id,created_at desc);
create index if not exists marketplace_upload_requests_status_created_idx on public.marketplace_upload_requests_live(status,created_at);
create index if not exists marketplace_upload_requests_vendor_status_idx on public.marketplace_upload_requests_live(vendor_id,status,created_at desc);
-- Files must be stored in a PRIVATE Supabase Storage bucket.
-- Access only through server-validated customer/vendor sessions and short-lived signed URLs.
-- Do not expose private prescription files through public URLs.

-- Private bucket: no public download access. Server-generated signed upload URLs only.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('marketplace-private-uploads','marketplace-private-uploads',false,8388608,array['image/jpeg','image/png','application/pdf'])
on conflict (id) do nothing;
