-- PROPOSED ONLY. Do not apply to live until separately reviewed.
create table if not exists public.dbest_master_catalogue_import_staging (
 id uuid primary key default gen_random_uuid(),
 batch_id uuid not null,
 row_number integer not null check (row_number between 1 and 1000),
 payload jsonb not null,
 status text not null default 'draft' check (status in ('draft','rejected','reviewed')),
 imported_by text not null,
 created_at timestamptz not null default now(),
 unique(batch_id,row_number)
);
alter table public.dbest_master_catalogue_import_staging enable row level security;
-- No client RLS policies: access only via service role from authenticated Owner API.
revoke all on public.dbest_master_catalogue_import_staging from anon, authenticated;
