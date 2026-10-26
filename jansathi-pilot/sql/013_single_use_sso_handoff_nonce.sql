-- Only JanSathi Free project: zgjkzqfabbvctcjspvfd.
-- Atomic one-time login assertion claim, server-role ONLY.
-- NEVER accept an assertion in the browser or permit anon/authenticated calls.
-- This is infrastructure for a future server-verified DBest handoff, not an enabled SSO route.

create table jansathi_internal.sso_handoff_claims (
  nonce_hash text primary key check (nonce_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  claimed_at timestamptz not null default now()
);
create index jansathi_sso_claims_expiry_idx on jansathi_internal.sso_handoff_claims(expires_at);
alter table jansathi_internal.sso_handoff_claims enable row level security;
revoke all on jansathi_internal.sso_handoff_claims from public,anon,authenticated;

create function public.jansathi_claim_sso_handoff(
  p_nonce_hash text,p_expires_at timestamptz
) returns boolean
language plpgsql volatile security definer
set search_path=pg_catalog
as $fn$
declare inserted_rows integer;
begin
  -- Caller must already have validated the issuer's HMAC and bounded expiry.
  if p_nonce_hash is null or p_nonce_hash !~ '^[0-9a-f]{64}$'
    or p_expires_at is null or p_expires_at <= now()
    or p_expires_at > now() + interval '2 minutes' then
    return false;
  end if;
  insert into jansathi_internal.sso_handoff_claims(nonce_hash,expires_at)
  values(p_nonce_hash,p_expires_at)
  on conflict (nonce_hash) do nothing;
  get diagnostics inserted_rows=row_count;
  return inserted_rows=1;
end $fn$;

-- PostgREST exposes public schema, but the only permitted caller is the
-- server-side service role. All ordinary users must be unable to invoke it.
revoke all on function public.jansathi_claim_sso_handoff(text,timestamptz)
  from public,anon,authenticated;
grant execute on function public.jansathi_claim_sso_handoff(text,timestamptz)
  to service_role;

comment on function public.jansathi_claim_sso_handoff(text,timestamptz) is
  'Server-only atomic one-use nonce claim AFTER verifying trusted DBest signed assertion; rejects replay and expired requests.';
