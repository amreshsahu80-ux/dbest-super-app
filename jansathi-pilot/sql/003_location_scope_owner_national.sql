-- JanSathi location hierarchy + owner-only nationwide publication.
-- ISOLATED PROJECT: zgjkzqfabbvctcjspvfd. Never run on DBest App Pro.
-- PUBLIC news and issues remain readable; discovery is local by default and national only by Owner promotion.
alter table public.jansathi_civic_reports
  add column village text not null default '',
  add column town text not null default '',
  add column block text not null default '',
  add column district text not null default '',
  add column state text not null default '';
alter table public.jansathi_news_submissions
  add column village text not null default '',
  add column town text not null default '',
  add column block text not null default '',
  add column district text not null default '',
  add column state text not null default '';
alter table public.jansathi_civic_feed
  add column village text not null default '',
  add column town text not null default '',
  add column block text not null default '',
  add column district text not null default '',
  add column state text not null default '',
  add column national_featured boolean not null default false;
alter table public.jansathi_news_feed
  add column village text not null default '',
  add column town text not null default '',
  add column block text not null default '',
  add column district text not null default '',
  add column state text not null default '',
  add column national_featured boolean not null default false;

-- Public coarse location fields only; no GPS, private home address, or exact location coordinates.
create or replace function jansathi_internal.normalize_locality() returns trigger
language plpgsql security invoker set search_path=pg_catalog
as $function$
begin
  new.village:=btrim(coalesce(new.village,''));
  new.town:=btrim(coalesce(nullif(new.town,''),new.city,''));
  new.block:=btrim(coalesce(new.block,''));
  new.district:=btrim(coalesce(new.district,''));
  new.state:=btrim(coalesce(new.state,''));
  if length(new.state) < 2 or length(new.district) < 2 or length(new.town) < 2 then
    raise exception 'State, district and town are required for JanSathi location visibility'
      using errcode='23514';
  end if;
  if length(new.state)>90 or length(new.district)>90 or length(new.block)>90 or
     length(new.town)>90 or length(new.village)>90 then
    raise exception 'Locality names must be 90 characters or less' using errcode='23514';
  end if;
  new.city:=new.town;
  return new;
end $function$;

create trigger a_jansathi_news_locality
before insert or update on public.jansathi_news_submissions
for each row execute function jansathi_internal.normalize_locality();
create trigger a_jansathi_civic_locality
before insert or update on public.jansathi_civic_reports
for each row execute function jansathi_internal.normalize_locality();

-- Mirror only public fields to the public discovery feed.
create or replace function jansathi_internal.news_feed_sync() returns trigger
language plpgsql security definer set search_path=pg_catalog,public
as $function$
begin
  if new.status='published' then
    insert into public.jansathi_news_feed
      (id,category,headline,body,city,public_area,event_date,created_at,village,town,block,district,state)
    values(new.id,new.category,new.title,new.body,new.city,new.public_area,new.event_date,new.created_at,
           new.village,new.town,new.block,new.district,new.state)
    on conflict(id) do update set
       category=excluded.category,headline=excluded.headline,body=excluded.body,
       city=excluded.city,public_area=excluded.public_area,event_date=excluded.event_date,
       village=excluded.village,town=excluded.town,block=excluded.block,district=excluded.district,state=excluded.state;
  else
    delete from public.jansathi_news_feed where id=new.id;
  end if;
  return new;
end $function$;

create or replace function jansathi_internal.civic_feed_sync() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,jansathi_internal
as $function$
begin
  if not jansathi_internal.needs_human_review(new.title||' '||new.public_area)
     and new.status<>'rejected' then
    insert into public.jansathi_civic_feed
      (id,category,headline,city,public_area,status,created_at,updated_at,village,town,block,district,state)
    values(new.id,new.category,new.title,new.city,new.public_area,new.status,new.created_at,now(),
           new.village,new.town,new.block,new.district,new.state)
    on conflict(id) do update set
       status=excluded.status,updated_at=now(),headline=excluded.headline,
       public_area=excluded.public_area,city=excluded.city,
       village=excluded.village,town=excluded.town,block=excluded.block,
       district=excluded.district,state=excluded.state;
  else
    delete from public.jansathi_civic_feed where id=new.id;
  end if;
  if tg_op='INSERT' then
    insert into public.jansathi_civic_events(report_id,status,note)
    values(new.id,new.status,'DBest JanSathi received the issue');
  elsif new.status is distinct from old.status then
    insert into public.jansathi_civic_events(report_id,status,note)
    values(new.id,new.status,'Status updated in DBest JanSathi');
  end if;
  return new;
end $function$;

-- Users may optionally remember their preferred view. Self-declared region != verified residence.
create table public.jansathi_location_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  village text not null default '',
  town text not null default '',
  block text not null default '',
  district text not null default '',
  state text not null default '',
  preferred_level text not null default 'town' check(preferred_level in ('village','town','block','district','state')),
  updated_at timestamptz not null default now(),
  constraint jansathi_user_loc_state check(char_length(state) between 2 and 90),
  constraint jansathi_user_loc_district check(char_length(district) between 2 and 90)
);
alter table public.jansathi_location_preferences enable row level security;
revoke all on public.jansathi_location_preferences from public,anon,authenticated;
grant select,insert,update on public.jansathi_location_preferences to authenticated;
create policy "Read own JanSathi locality" on public.jansathi_location_preferences
  for select to authenticated using(user_id=(select auth.uid()));
create policy "Create own JanSathi locality" on public.jansathi_location_preferences
  for insert to authenticated with check(user_id=(select auth.uid()));
create policy "Update own JanSathi locality" on public.jansathi_location_preferences
  for update to authenticated using(user_id=(select auth.uid()))
  with check(user_id=(select auth.uid()));

create index jansathi_news_loc_state_district on public.jansathi_news_feed(state,district,created_at desc);
create index jansathi_news_loc_town on public.jansathi_news_feed(state,district,town,created_at desc);
create index jansathi_civic_loc_state_district on public.jansathi_civic_feed(state,district,created_at desc);
create index jansathi_civic_loc_town on public.jansathi_civic_feed(state,district,town,created_at desc);
create index jansathi_news_national_idx on public.jansathi_news_feed(created_at desc) where national_featured;
create index jansathi_civic_national_idx on public.jansathi_civic_feed(created_at desc) where national_featured;

-- Owner identity must match CURRENT trusted auth.users raw_app_meta_data, not just stale JWTs.
create function jansathi_internal.is_owner() returns boolean
language sql stable security definer set search_path=pg_catalog
as $function$
  select auth.uid() is not null
    and coalesce(auth.jwt()->'app_metadata'->>'jansathi_role','')='owner'
    and exists(
      select 1 from auth.users u where u.id=auth.uid()
        and u.raw_app_meta_data->>'jansathi_role'='owner'
        and u.deleted_at is null
        and (u.banned_until is null or u.banned_until<=now())
        and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null)
    )
$function$;
revoke all on function jansathi_internal.is_owner() from public,anon,authenticated;

-- Owner promotion/retraction audit is append-only from a guarded RPC.
create table public.jansathi_national_audit(
 id bigint generated always as identity primary key,
 content_kind text not null check(content_kind in ('news','civic')),
 content_id uuid not null,
 national_featured boolean not null,
 reason text not null check(char_length(btrim(reason)) between 5 and 500),
 approved_by uuid not null references auth.users(id),
 occurred_at timestamptz not null default now()
);
alter table public.jansathi_national_audit enable row level security;
revoke all on public.jansathi_national_audit from public,anon,authenticated;
grant select on public.jansathi_national_audit to authenticated;
create policy "Owner reads national promotion audit" on public.jansathi_national_audit
 for select to authenticated using(jansathi_internal.is_owner());

-- SEC-DEF RPC: enabled ONLY for authenticated owner, with current trusted DB identity check.
create function public.jansathi_set_national_featured(
 p_kind text,p_content_id uuid,p_featured boolean,p_reason text
) returns boolean
language plpgsql security definer set search_path=pg_catalog
as $function$
begin
 if not jansathi_internal.is_owner() then
   raise exception 'Only the verified JanSathi Project Owner can publish nationally' using errcode='42501';
 end if;
 if p_kind not in ('news','civic') or p_content_id is null or p_featured is null
    or char_length(btrim(coalesce(p_reason,''))) not between 5 and 500 then
   raise exception 'Valid content, selection and audit reason required' using errcode='22023';
 end if;
 if p_kind='news' then
   update public.jansathi_news_feed set national_featured=p_featured where id=p_content_id;
 else
   update public.jansathi_civic_feed set national_featured=p_featured where id=p_content_id;
 end if;
 if not found then
   raise exception 'Only an existing publicly visible post may be featured nationwide' using errcode='22023';
 end if;
 insert into public.jansathi_national_audit(content_kind,content_id,national_featured,reason,approved_by)
 values(p_kind,p_content_id,p_featured,btrim(p_reason),auth.uid());
 return true;
end $function$;
revoke all on function public.jansathi_set_national_featured(text,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.jansathi_set_national_featured(text,uuid,boolean,text) to authenticated;

-- Private owner feed, allowing owner to select ANY real published post in the country.
create function public.jansathi_owner_review_feed(p_limit integer default 100)
returns table (
 kind text,id uuid,headline text,city text,town text,block text,village text,district text,state text,
 national_featured boolean,created_at timestamptz
)
language plpgsql stable security definer set search_path=pg_catalog
as $function$
begin
 if not jansathi_internal.is_owner() then
   raise exception 'Owner privileges required' using errcode='42501';
 end if;
 return query
  select f.kind,f.id,f.headline,f.city,f.town,f.block,f.village,f.district,f.state,f.national_featured,f.created_at
  from (
   select 'news'::text as kind,n.id,n.headline,n.city,n.town,n.block,n.village,n.district,n.state,n.national_featured,n.created_at
   from public.jansathi_news_feed n
   union all
   select 'civic'::text as kind,c.id,c.headline,c.city,c.town,c.block,c.village,c.district,c.state,c.national_featured,c.created_at
   from public.jansathi_civic_feed c
  ) f
  order by f.created_at desc limit least(greatest(coalesce(p_limit,100),1),150);
end $function$;
revoke all on function public.jansathi_owner_review_feed(integer) from public,anon,authenticated;
grant execute on function public.jansathi_owner_review_feed(integer) to authenticated;

-- Everyone may DISCOVER news/issues for their selected area and nationally promoted posts.
-- Regional matches are scoped by state, district and requested locality, not arbitrary substring.
create function public.jansathi_visible_feed(
 p_level text,p_state text,p_district text default '',p_block text default '',
 p_town text default '',p_village text default '',p_limit integer default 100
)
returns table (
 kind text,id uuid,category text,headline text,body text,city text,public_area text,status text,
 created_at timestamptz,village text,town text,block text,district text,state text,national_featured boolean
)
language sql stable security invoker set search_path=pg_catalog,public
as $function$
 select x.kind,x.id,x.category,x.headline,x.body,x.city,x.public_area,x.status,
        x.created_at,x.village,x.town,x.block,x.district,x.state,x.national_featured
 from (
   select 'news'::text as kind,n.id,n.category,n.headline,n.body,n.city,n.public_area,
          ''::text as status,n.created_at,n.village,n.town,n.block,n.district,n.state,n.national_featured
   from public.jansathi_news_feed n
   union all
   select 'civic'::text as kind,c.id,c.category,c.headline,''::text as body,c.city,c.public_area,
          c.status,c.created_at,c.village,c.town,c.block,c.district,c.state,c.national_featured
   from public.jansathi_civic_feed c
 ) x
 where x.national_featured or (
   lower(x.state)=lower(btrim(coalesce(p_state,''))) and length(btrim(coalesce(p_state,'')))>=2 and
   case p_level
    when 'state' then true
    when 'district' then lower(x.district)=lower(btrim(coalesce(p_district,''))) and length(btrim(coalesce(p_district,'')))>=2
    when 'block' then lower(x.district)=lower(btrim(coalesce(p_district,''))) and
                      lower(x.block)=lower(btrim(coalesce(p_block,''))) and
                      length(btrim(coalesce(p_block,'')))>=2
    when 'town' then lower(x.district)=lower(btrim(coalesce(p_district,''))) and
                     lower(x.town)=lower(btrim(coalesce(p_town,''))) and
                     length(btrim(coalesce(p_town,'')))>=2
    when 'village' then lower(x.district)=lower(btrim(coalesce(p_district,''))) and
                        lower(x.village)=lower(btrim(coalesce(p_village,''))) and
                        length(btrim(coalesce(p_village,'')))>=2 and
                        (btrim(coalesce(p_block,''))='' or lower(x.block)=lower(btrim(p_block)))
    else false
   end
 )
 order by x.national_featured desc,x.created_at desc
 limit least(greatest(coalesce(p_limit,100),1),200)
$function$;
revoke all on function public.jansathi_visible_feed(text,text,text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.jansathi_visible_feed(text,text,text,text,text,text,integer) to anon,authenticated;

-- Optional owner-role display function: NEVER confers any privilege to callers.
create function public.jansathi_can_manage_national() returns boolean
language sql stable security definer set search_path=pg_catalog
as $function$ select jansathi_internal.is_owner() $function$;
revoke all on function public.jansathi_can_manage_national() from public,anon,authenticated;
grant execute on function public.jansathi_can_manage_national() to authenticated;

-- Only the privileged trigger owner, not any browser/API key, can write national flags.
revoke update on public.jansathi_news_feed from public,anon,authenticated;
revoke update on public.jansathi_civic_feed from public,anon,authenticated;
revoke all on all functions in schema jansathi_internal from public,anon,authenticated;
grant usage on schema jansathi_internal to authenticated;
grant execute on function jansathi_internal.is_editor() to authenticated;
grant execute on function jansathi_internal.is_citizen_verified() to authenticated;
grant execute on function jansathi_internal.has_verified_paid_membership() to authenticated;
grant execute on function jansathi_internal.needs_human_review(text) to authenticated;
