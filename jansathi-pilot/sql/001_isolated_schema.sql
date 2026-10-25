-- DBest JanSathi pilot: APPLY ONLY TO A BRAND-NEW, SEPARATE FREE SUPABASE PROJECT.
-- DO NOT APPLY TO ydedmotbacnllkijzmvp (DBest Super Platform Test).
-- No external authority submissions are performed by this schema.
begin;

create schema if not exists jansathi_internal;
revoke all on schema jansathi_internal from public, anon, authenticated;

create table public.jansathi_civic_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (category in ('road','drainage','streetlight','garbage','water','other')),
  title text not null check (char_length(btrim(title)) between 8 and 120),
  description text not null check (char_length(btrim(description)) between 15 and 2000),
  city text not null check (char_length(btrim(city)) between 2 and 90),
  public_area text not null check (char_length(btrim(public_area)) between 3 and 140),
  status text not null default 'dbest_received' check (status in (
    'dbest_received','under_review','ready_for_official_submission',
    'submitted_to_authority','officially_acknowledged','in_progress','resolved','rejected'
  )),
  assigned_authority text,
  official_reference text,
  official_submission_proof text,
  officially_submitted_at timestamptz,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  last_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint official_ack_requires_proof check (
    status <> 'officially_acknowledged' or
    (nullif(btrim(coalesce(official_reference,'')),'') is not null
     and nullif(btrim(coalesce(assigned_authority,'')),'') is not null
     and officially_submitted_at is not null)
  ),
  constraint submitted_requires_evidence check (
    status not in ('submitted_to_authority','officially_acknowledged','in_progress','resolved') or
    (nullif(btrim(coalesce(assigned_authority,'')),'') is not null
     and officially_submitted_at is not null
     and nullif(btrim(coalesce(official_submission_proof,'')),'') is not null)
  )
);
create index jansathi_civic_user_time_idx on public.jansathi_civic_reports (user_id, created_at desc);
create index jansathi_civic_city_time_idx on public.jansathi_civic_reports (city, created_at desc);

create table public.jansathi_civic_feed (
  id uuid primary key references public.jansathi_civic_reports(id) on delete cascade,
  category text not null,
  headline text not null,
  city text not null,
  public_area text not null,
  status text not null default 'dbest_received',
  created_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index jansathi_civic_feed_city_idx on public.jansathi_civic_feed(city, created_at desc);

create table public.jansathi_civic_events (
  id bigint generated always as identity primary key,
  report_id uuid not null references public.jansathi_civic_reports(id) on delete cascade,
  status text not null,
  note text not null default '',
  occurred_at timestamptz not null default now()
);
create index jansathi_events_report_idx on public.jansathi_civic_events(report_id,occurred_at desc);

create table public.jansathi_news_submissions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (category in ('community','health','education','sports','festival','traffic','other')),
  title text not null check (char_length(btrim(title)) between 8 and 140),
  body text not null check (char_length(btrim(body)) between 15 and 3000),
  city text not null check (char_length(btrim(city)) between 2 and 90),
  public_area text not null check (char_length(btrim(public_area)) between 3 and 140),
  event_date date,
  status text not null default 'pending' check (status in ('pending','published','held','rejected','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jansathi_news_author_idx on public.jansathi_news_submissions(author_id,created_at desc);
create index jansathi_news_city_idx on public.jansathi_news_submissions(city,created_at desc);

-- Only safe public-facing fields, never author_id, email, phone or submitter metadata.
create table public.jansathi_news_feed (
  id uuid primary key references public.jansathi_news_submissions(id) on delete cascade,
  category text not null,
  headline text not null,
  body text not null,
  city text not null,
  public_area text not null,
  event_date date,
  created_at timestamptz not null
);
create index jansathi_public_news_city_idx on public.jansathi_news_feed(city,created_at desc);

create table public.jansathi_follows (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  report_id uuid not null references public.jansathi_civic_feed(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id,report_id)
);

create table public.jansathi_abuse_flags (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content_kind text not null check(content_kind in ('news','civic')),
  content_id uuid not null,
  reason text not null check(char_length(btrim(reason)) between 5 and 500),
  created_at timestamptz not null default now(),
  unique(reporter_id,content_kind,content_id)
);

create table public.jansathi_authority_routes (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  category text not null,
  jurisdiction_notes text not null default '',
  authority_name text not null,
  official_portal_url text,
  official_email text,
  verification_state text not null default 'unverified'
    check(verification_state in ('unverified','verified','disabled')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique(city,category,authority_name)
);

-- Only members with a trusted Supabase app_metadata.jansathi_role value may moderate.
-- Assign this trusted claim via secure server/admin operation, not user_metadata.
create function jansathi_internal.is_editor() returns boolean
language sql stable security invoker set search_path = pg_catalog, public
as $$ select coalesce(auth.jwt()->'app_metadata'->>'jansathi_role','') in ('owner','editor') $$;

-- Run content checks server-side. A simple conservative text gate is NOT a
-- comprehensive moderation system: reported content still needs human review.
create function jansathi_internal.needs_human_review(t text) returns boolean
language sql immutable security invoker set search_path = pg_catalog
as $$
 select coalesce(t,'') ~* '(rape|murder|fraud|scam|riot|suicide|kidnap|assault|bomb|terror|corrupt|killed|dead|accident|crime|हत्या|बलात्कार|घोटाला|आरोप|दंगा|आत्महत्या|मौत|दुर्घटना)'
 or coalesce(t,'') ~* '([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?[0-9][0-9 -]{8,}[0-9])'
 $$;

-- Users cannot force news status to 'published': server decides for all new rows.
create function jansathi_internal.news_before_write() returns trigger
language plpgsql security definer set search_path = pg_catalog, public, jansathi_internal
as $$
begin
 if tg_op = 'INSERT' then
   new.author_id := auth.uid();
   new.created_at := now();
   new.status := case
     when jansathi_internal.needs_human_review(new.title || ' ' || new.body || ' ' || new.public_area)
     then 'held' else 'published' end;
 else
   -- UPDATE granted only to trusted editors via RLS; preserve author identity.
   new.author_id := old.author_id;
   new.created_at := old.created_at;
 end if;
 new.updated_at := now();
 return new;
end $$;
create trigger jansathi_news_pre
before insert or update on public.jansathi_news_submissions
for each row execute function jansathi_internal.news_before_write();

create function jansathi_internal.news_feed_sync() returns trigger
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
 if new.status = 'published' then
   insert into public.jansathi_news_feed(id,category,headline,body,city,public_area,event_date,created_at)
   values(new.id,new.category,new.title,new.body,new.city,new.public_area,new.event_date,new.created_at)
   on conflict(id) do update set
      category=excluded.category,headline=excluded.headline,body=excluded.body,
      city=excluded.city,public_area=excluded.public_area,event_date=excluded.event_date;
 else
   delete from public.jansathi_news_feed where id=new.id;
 end if;
 return new;
end $$;
create trigger jansathi_news_post
after insert or update on public.jansathi_news_submissions
for each row execute function jansathi_internal.news_feed_sync();

-- Civic issue public feed omits detailed description and user identity.
-- Hold potentially sensitive titles/places off the public feed until moderation.
create function jansathi_internal.civic_before_write() returns trigger
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
 if tg_op='INSERT' then
    new.user_id:=auth.uid();
    new.status:='dbest_received';
    new.assigned_authority:=null;
    new.official_reference:=null;
    new.official_submission_proof:=null;
    new.officially_submitted_at:=null;
    new.acknowledged_at:=null;
    new.resolved_at:=null;
    new.created_at:=now();
 else
    new.user_id:=old.user_id;
    new.created_at:=old.created_at;
 end if;
 new.last_updated_at:=now();
 return new;
end $$;
create trigger jansathi_civic_pre
before insert or update on public.jansathi_civic_reports
for each row execute function jansathi_internal.civic_before_write();

create function jansathi_internal.civic_feed_sync() returns trigger
language plpgsql security definer set search_path = pg_catalog, public, jansathi_internal
as $$
begin
 if not jansathi_internal.needs_human_review(new.title || ' ' || new.public_area) and
    new.status <> 'rejected' then
    insert into public.jansathi_civic_feed(id,category,headline,city,public_area,status,created_at,updated_at)
    values(new.id,new.category,new.title,new.city,new.public_area,new.status,new.created_at,now())
    on conflict(id) do update set status=excluded.status,updated_at=now(),
       headline=excluded.headline,public_area=excluded.public_area;
 else
    delete from public.jansathi_civic_feed where id=new.id;
 end if;
 if tg_op='INSERT' or new.status is distinct from old.status then
    insert into public.jansathi_civic_events(report_id,status,note)
    values(new.id,new.status,'Status recorded within DBest JanSathi');
 end if;
 return new;
end $$;
create trigger jansathi_civic_post
after insert or update on public.jansathi_civic_reports
for each row execute function jansathi_internal.civic_feed_sync();

-- Every public table is RLS-protected, including public projections.
alter table public.jansathi_civic_reports enable row level security;
alter table public.jansathi_civic_feed enable row level security;
alter table public.jansathi_civic_events enable row level security;
alter table public.jansathi_news_submissions enable row level security;
alter table public.jansathi_news_feed enable row level security;
alter table public.jansathi_follows enable row level security;
alter table public.jansathi_abuse_flags enable row level security;
alter table public.jansathi_authority_routes enable row level security;

-- Explicit minimal table privileges; RLS controls rows.
revoke all on all tables in schema public from anon, authenticated;
grant select,insert on public.jansathi_civic_reports to authenticated;
grant update on public.jansathi_civic_reports to authenticated;
grant select on public.jansathi_civic_feed to anon,authenticated;
grant select on public.jansathi_civic_events to authenticated;
grant select,insert,update on public.jansathi_news_submissions to authenticated;
grant select on public.jansathi_news_feed to anon,authenticated;
grant select,insert,delete on public.jansathi_follows to authenticated;
grant select,insert on public.jansathi_abuse_flags to authenticated;
grant select,insert,update on public.jansathi_authority_routes to authenticated;
grant usage on sequence public.jansathi_civic_events_id_seq to authenticated;

create policy "Read own civic submissions or editor" on public.jansathi_civic_reports
for select to authenticated using(user_id=(select auth.uid()) or jansathi_internal.is_editor());
create policy "Insert own civic submission" on public.jansathi_civic_reports
for insert to authenticated with check (user_id=(select auth.uid()) and status='dbest_received');
create policy "Editor can update civic status" on public.jansathi_civic_reports
for update to authenticated using(jansathi_internal.is_editor())
with check(jansathi_internal.is_editor());

create policy "Read public civic feed" on public.jansathi_civic_feed
for select to anon,authenticated using(true);
create policy "Read own issue events or editor" on public.jansathi_civic_events
for select to authenticated using(
  exists(select 1 from public.jansathi_civic_reports r
    where r.id=report_id and (r.user_id=(select auth.uid()) or jansathi_internal.is_editor()))
);

create policy "Read own news submissions or editor" on public.jansathi_news_submissions
for select to authenticated using(author_id=(select auth.uid()) or jansathi_internal.is_editor());
create policy "Insert own news" on public.jansathi_news_submissions
for insert to authenticated with check(author_id=(select auth.uid()));
create policy "Editor moderates news" on public.jansathi_news_submissions
for update to authenticated using(jansathi_internal.is_editor())
with check(jansathi_internal.is_editor());
create policy "Everyone reads published news only" on public.jansathi_news_feed
for select to anon,authenticated using(true);

create policy "Read own follows" on public.jansathi_follows
for select to authenticated using(user_id=(select auth.uid()));
create policy "Follow public issue" on public.jansathi_follows
for insert to authenticated with check(user_id=(select auth.uid()));
create policy "Unfollow public issue" on public.jansathi_follows
for delete to authenticated using(user_id=(select auth.uid()));

create policy "Report content for review" on public.jansathi_abuse_flags
for insert to authenticated with check(reporter_id=(select auth.uid()));
create policy "Read own flags or editor" on public.jansathi_abuse_flags
for select to authenticated using(reporter_id=(select auth.uid()) or jansathi_internal.is_editor());

create policy "Read verified authority directory" on public.jansathi_authority_routes
for select to authenticated using(verification_state='verified' or jansathi_internal.is_editor());
create policy "Editor inserts authority routes" on public.jansathi_authority_routes
for insert to authenticated with check(jansathi_internal.is_editor());
create policy "Editor verifies authority routes" on public.jansathi_authority_routes
for update to authenticated using(jansathi_internal.is_editor())
with check(jansathi_internal.is_editor());

-- Private evidence uploads: upload under <auth.uid()>/<random-filename>.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('jansathi-evidence','jansathi-evidence',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy "Upload own JanSathi evidence" on storage.objects
for insert to authenticated with check(
 bucket_id='jansathi-evidence' and
 (storage.foldername(name))[1]=(select auth.uid())::text
);
create policy "Read own JanSathi evidence" on storage.objects
for select to authenticated using(
 bucket_id='jansathi-evidence' and
 (storage.foldername(name))[1]=(select auth.uid())::text
);

-- Revoke trigger-function execution from public roles. Triggers run via database owner.
revoke all on all functions in schema jansathi_internal from public,anon,authenticated;
grant usage on schema jansathi_internal to authenticated;
grant execute on function jansathi_internal.is_editor() to authenticated;
grant execute on function jansathi_internal.needs_human_review(text) to authenticated;

commit;
