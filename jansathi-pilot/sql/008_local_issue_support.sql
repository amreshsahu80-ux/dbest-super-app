-- Locality-based JanSathi Issue Support (staging Free Supabase ONLY).
-- Support is endorsement of visibility, NOT verified evidence or official escalation.
-- A pilot test account has a self-declared, rate-limited locality.
-- Public launch must use a trusted DBest residence/KYC assertion where appropriate.
alter table public.jansathi_civic_feed
  add column support_count integer not null default 0 check(support_count>=0);

create table public.jansathi_support_localities (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  state text not null,
  district text not null,
  block text not null default '',
  town text not null,
  village text not null default '',
  created_at timestamptz not null default now(),
  last_changed_at timestamptz not null default now(),
  constraint jansathi_support_locality_bounds check(
    char_length(btrim(state)) between 2 and 90 and
    char_length(btrim(district)) between 2 and 90 and
    char_length(btrim(town)) between 2 and 90 and
    char_length(block)<=90 and char_length(village)<=90
  )
);
alter table public.jansathi_support_localities enable row level security;
revoke all on public.jansathi_support_localities from public,anon,authenticated;
grant select,insert,update on public.jansathi_support_localities to authenticated;
create policy "Own support locality only" on public.jansathi_support_localities
 for select to authenticated using(user_id=(select auth.uid()));
create policy "Create own support locality" on public.jansathi_support_localities
 for insert to authenticated with check(user_id=(select auth.uid()) and (select jansathi_internal.is_citizen_verified()));
create policy "Edit own support locality" on public.jansathi_support_localities
 for update to authenticated using(user_id=(select auth.uid()) and (select jansathi_internal.is_citizen_verified()))
 with check(user_id=(select auth.uid()) and (select jansathi_internal.is_citizen_verified()));

create function jansathi_internal.validate_support_locality() returns trigger
language plpgsql security definer set search_path=pg_catalog
as $function$
begin
 if auth.uid() is null or not jansathi_internal.is_citizen_verified() then
   raise exception 'Verified sign-in required for locality registration' using errcode='42501';
 end if;
 new.user_id:=auth.uid();
 new.state:=btrim(new.state); new.district:=btrim(new.district);
 new.town:=btrim(new.town); new.block:=btrim(new.block); new.village:=btrim(new.village);
 if tg_op='UPDATE' then
   if new.user_id is distinct from old.user_id then
     raise exception 'Cannot change locality ownership' using errcode='42501';
   end if;
   if lower(new.state)=lower(old.state) and lower(new.district)=lower(old.district)
      and lower(new.town)=lower(old.town) and lower(new.block)=lower(old.block)
      and lower(new.village)=lower(old.village) then
      new.last_changed_at:=old.last_changed_at;
   else
      if old.last_changed_at>now()-interval '30 days' then
         raise exception 'Registered support locality can only be changed once per 30 days' using errcode='42501';
      end if;
      new.last_changed_at:=now();
   end if;
   new.created_at:=old.created_at;
 else
   new.last_changed_at:=now();new.created_at:=now();
 end if;
 return new;
end $function$;
create trigger jansathi_support_location_pre
before insert or update on public.jansathi_support_localities
for each row execute function jansathi_internal.validate_support_locality();

create table public.jansathi_issue_supports(
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 report_id uuid not null references public.jansathi_civic_feed(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(user_id,report_id)
);
create index jansathi_issue_supports_report_idx on public.jansathi_issue_supports(report_id);
alter table public.jansathi_issue_supports enable row level security;
revoke all on public.jansathi_issue_supports from public,anon,authenticated;
grant select,insert,delete on public.jansathi_issue_supports to authenticated;
create policy "Read only own issue support" on public.jansathi_issue_supports
 for select to authenticated using(user_id=(select auth.uid()));
create policy "Support only as yourself" on public.jansathi_issue_supports
 for insert to authenticated with check(user_id=(select auth.uid()) and (select jansathi_internal.is_citizen_verified()));
create policy "Withdraw only own support" on public.jansathi_issue_supports
 for delete to authenticated using(user_id=(select auth.uid()));

create function jansathi_internal.validate_issue_support() returns trigger
language plpgsql security definer set search_path=pg_catalog
as $function$
declare
 issue record;
 home record;
begin
 if not jansathi_internal.is_citizen_verified() then
   raise exception 'Verified JanSathi account required to support an issue' using errcode='42501';
 end if;
 new.user_id:=auth.uid();
 select r.user_id as reporter_id,f.state,f.district,f.block,f.town,f.village,f.status
 into issue
 from public.jansathi_civic_feed f
 join public.jansathi_civic_reports r on r.id=f.id
 where f.id=new.report_id;
 if not found then raise exception 'Issue is not currently public' using errcode='22023';end if;
 if issue.reporter_id=new.user_id then
   raise exception 'You cannot support your own issue' using errcode='42501';
 end if;
 if issue.status in ('resolved','rejected') then
   raise exception 'This issue is closed for new support' using errcode='22023';
 end if;
 select state,district,block,town,village into home
 from public.jansathi_support_localities where user_id=new.user_id;
 if not found then raise exception 'Register your locality before supporting an issue' using errcode='42501';end if;
 if lower(home.state)<>lower(issue.state) or lower(home.district)<>lower(issue.district) then
   raise exception 'You may support issues from your own locality only' using errcode='42501';
 end if;
 if btrim(issue.village)<>'' then
   if lower(home.village)<>lower(issue.village) or
      (btrim(issue.block)<>'' and lower(home.block)<>lower(issue.block)) then
     raise exception 'Issue belongs to a different village' using errcode='42501';
   end if;
 elsif lower(home.town)<>lower(issue.town) then
   raise exception 'Issue belongs to a different town' using errcode='42501';
 end if;
 new.created_at:=now();
 return new;
end $function$;
create trigger jansathi_issue_support_pre
before insert on public.jansathi_issue_supports
for each row execute function jansathi_internal.validate_issue_support();

-- DB-owned counter; no client may write civic_feed.support_count.
create function jansathi_internal.update_issue_support_count() returns trigger
language plpgsql security definer set search_path=pg_catalog
as $function$
begin
 if tg_op='INSERT' then
  update public.jansathi_civic_feed set support_count=support_count+1,updated_at=now() where id=new.report_id;
  return new;
 end if;
 update public.jansathi_civic_feed set support_count=greatest(support_count-1,0),updated_at=now()
 where id=old.report_id;
 return old;
end $function$;
create trigger jansathi_issue_support_post
after insert or delete on public.jansathi_issue_supports
for each row execute function jansathi_internal.update_issue_support_count();

-- New public feed stays compatible; add count for discovery and keep strict location / national behavior.
create or replace function public.jansathi_visible_feed(
 p_level text,p_state text,p_district text default '',p_block text default '',
 p_town text default '',p_village text default '',p_limit integer default 100
)
returns table (
 kind text,id uuid,category text,headline text,body text,city text,public_area text,status text,
 created_at timestamptz,village text,town text,block text,district text,state text,
 national_featured boolean,support_count integer
)
language sql stable security invoker set search_path=pg_catalog,public
as $function$
 select x.kind,x.id,x.category,x.headline,x.body,x.city,x.public_area,x.status,
        x.created_at,x.village,x.town,x.block,x.district,x.state,x.national_featured,x.support_count
 from (
   select 'news'::text as kind,n.id,n.category,n.headline,n.body,n.city,n.public_area,
          ''::text as status,n.created_at,n.village,n.town,n.block,n.district,n.state,n.national_featured,
          0::integer as support_count
   from public.jansathi_news_feed n
   union all
   select 'civic'::text as kind,c.id,c.category,c.headline,''::text as body,c.city,c.public_area,
          c.status,c.created_at,c.village,c.town,c.block,c.district,c.state,c.national_featured,c.support_count
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
