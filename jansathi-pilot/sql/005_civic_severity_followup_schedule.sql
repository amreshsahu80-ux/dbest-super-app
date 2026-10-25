-- DBest JanSathi staging ONLY: reporter follow-ups by severity; no real authority messages.
-- One citizen follow-up per interval measured from initial report/last update.
-- Categories are triaged into default severity; only verified Project Owner may override.
create function jansathi_internal.followup_hours(p_severity text) returns integer
language sql immutable security invoker set search_path=pg_catalog
as $function$
 select case p_severity
  when 'urgent' then 48
  when 'high' then 168
  when 'moderate' then 720
  when 'low' then 2160
  else 720 end
$function$;

create function jansathi_internal.followup_default_severity(p_category text) returns text
language sql immutable security invoker set search_path=pg_catalog
as $function$
 select case when p_category in ('road','drainage','garbage','water') then 'high'
             when p_category='streetlight' then 'moderate'
             else 'low' end
$function$;

create table jansathi_internal.civic_followup_state(
 report_id uuid primary key references public.jansathi_civic_reports(id) on delete cascade,
 severity text not null default 'high' check(severity in ('urgent','high','moderate','low')),
 cadence_hours integer not null check(cadence_hours in (48,168,720,2160)),
 next_eligible_at timestamptz not null,
 last_citizen_update_at timestamptz,
 citizen_update_count integer not null default 0 check(citizen_update_count>=0),
 severity_set_by uuid references auth.users(id),
 severity_reason text,
 updated_at timestamptz not null default now()
);
alter table jansathi_internal.civic_followup_state enable row level security;
revoke all on jansathi_internal.civic_followup_state from public,anon,authenticated;

create table public.jansathi_civic_followups(
 id uuid primary key default gen_random_uuid(),
 report_id uuid not null references public.jansathi_civic_reports(id) on delete cascade,
 reporter_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(char_length(btrim(body)) between 20 and 1000),
 observed_status text not null check(observed_status in ('still_unresolved','improving','getting_worse','appears_fixed')),
 moderation_status text not null default 'pending' check(moderation_status in ('pending','held','approved','rejected')),
 submitted_at timestamptz not null default now()
);
create index jansathi_followups_by_issue_idx on public.jansathi_civic_followups(report_id,submitted_at desc);
create index jansathi_followups_by_owner_idx on public.jansathi_civic_followups(reporter_id,submitted_at desc);
alter table public.jansathi_civic_followups enable row level security;
revoke all on public.jansathi_civic_followups from public,anon,authenticated;
grant select on public.jansathi_civic_followups to authenticated;
create policy "View own followups" on public.jansathi_civic_followups
for select to authenticated using(reporter_id=(select auth.uid()));

create function jansathi_internal.initialize_issue_followup() returns trigger
language plpgsql security definer set search_path=pg_catalog
as $function$
declare
 initial_severity text;
 initial_hours integer;
begin
 initial_severity:=jansathi_internal.followup_default_severity(new.category);
 initial_hours:=jansathi_internal.followup_hours(initial_severity);
 insert into jansathi_internal.civic_followup_state(report_id,severity,cadence_hours,next_eligible_at)
 values(new.id,initial_severity,initial_hours,new.created_at+make_interval(hours=>initial_hours));
 return new;
end $function$;
create trigger z_jansathi_init_civic_followup
after insert on public.jansathi_civic_reports
for each row execute function jansathi_internal.initialize_issue_followup();

-- This private function executes all checks server-side and locks the issue's schedule
-- to prevent double submissions or browser clock manipulation.
create function jansathi_internal.submit_civic_followup(
 p_report_id uuid,p_body text,p_observed_status text
) returns uuid
language plpgsql security definer set search_path=pg_catalog
as $function$
declare
 current_user_id uuid:=auth.uid();
 r record;
 st record;
 new_followup_id uuid;
 note_text text:=btrim(coalesce(p_body,''));
begin
 if current_user_id is null or p_report_id is null then
   raise exception 'Sign in to JanSathi to submit an issue update' using errcode='42501';
 end if;
 if length(note_text) not between 20 and 1000 then
   raise exception 'Write an issue update between 20 and 1000 characters' using errcode='22023';
 end if;
 if p_observed_status not in ('still_unresolved','improving','getting_worse','appears_fixed') then
   raise exception 'Choose a valid observed issue condition' using errcode='22023';
 end if;
 if not jansathi_internal.is_citizen_verified() then
   raise exception 'A verified JanSathi citizen account is required' using errcode='42501';
 end if;
 select r0.id,r0.user_id,r0.status into r
 from public.jansathi_civic_reports r0 where r0.id=p_report_id;
 if not found or r.user_id is distinct from current_user_id then
   raise exception 'Only the original issue reporter may submit a follow-up' using errcode='42501';
 end if;
 if r.status in ('resolved','rejected') then
   raise exception 'This issue is closed or rejected; new follow-ups are disabled' using errcode='22023';
 end if;
 select * into st from jansathi_internal.civic_followup_state s
 where s.report_id=p_report_id for update;
 if not found then raise exception 'Issue follow-up schedule unavailable' using errcode='22023'; end if;
 if now()<st.next_eligible_at then
   raise exception 'Next update is eligible after %', st.next_eligible_at using errcode='P0001';
 end if;
 insert into public.jansathi_civic_followups(report_id,reporter_id,body,observed_status,moderation_status,submitted_at)
 values(p_report_id,current_user_id,note_text,p_observed_status,
        case when jansathi_internal.needs_human_review(note_text) then 'held' else 'pending' end,now())
 returning id into new_followup_id;
 update jansathi_internal.civic_followup_state set
  last_citizen_update_at=now(),
  next_eligible_at=now()+make_interval(hours=>st.cadence_hours),
  citizen_update_count=st.citizen_update_count+1,
  updated_at=now()
 where report_id=p_report_id;
 return new_followup_id;
end $function$;

create function public.jansathi_submit_civic_followup(
 p_report_id uuid,p_body text,p_observed_status text
) returns uuid
language sql volatile security invoker set search_path=pg_catalog
as $function$
 select jansathi_internal.submit_civic_followup(p_report_id,p_body,p_observed_status);
$function$;

-- Only the signed-in reporter sees their own schedule and private follow-up history.
create function jansathi_internal.my_civic_followup_schedule()
returns table(report_id uuid,issue_title text,issue_status text,severity text,
 cadence_hours integer,next_eligible_at timestamptz,last_citizen_update_at timestamptz,
 citizen_update_count integer,can_submit boolean)
language sql stable security definer set search_path=pg_catalog
as $function$
 select r.id,r.title,r.status,s.severity,s.cadence_hours,s.next_eligible_at,
  s.last_citizen_update_at,s.citizen_update_count,
  now()>=s.next_eligible_at and r.status not in ('resolved','rejected')
 from public.jansathi_civic_reports r
 join jansathi_internal.civic_followup_state s on s.report_id=r.id
 where r.user_id=auth.uid()
 order by r.created_at desc
$function$;
create function public.jansathi_my_civic_followup_schedule()
returns table(report_id uuid,issue_title text,issue_status text,severity text,
 cadence_hours integer,next_eligible_at timestamptz,last_citizen_update_at timestamptz,
 citizen_update_count integer,can_submit boolean)
language sql stable security invoker set search_path=pg_catalog
as $function$
 select * from jansathi_internal.my_civic_followup_schedule();
$function$;

-- Owner only: change severity of a real issue with an auditable reason.
create table public.jansathi_followup_severity_audit(
 id bigint generated always as identity primary key,
 report_id uuid not null references public.jansathi_civic_reports(id) on delete cascade,
 old_severity text not null,
 new_severity text not null,
 reason text not null check(length(btrim(reason)) between 5 and 500),
 changed_by uuid not null references auth.users(id),
 changed_at timestamptz not null default now()
);
alter table public.jansathi_followup_severity_audit enable row level security;
revoke all on public.jansathi_followup_severity_audit from public,anon,authenticated;

create function jansathi_internal.owner_set_civic_followup_severity(
 p_report_id uuid,p_severity text,p_reason text
) returns boolean
language plpgsql security definer set search_path=pg_catalog
as $function$
declare
 st record;
 fresh_hours integer;
 last_anchor timestamptz;
begin
 if not jansathi_internal.is_owner() then
   raise exception 'Only the verified JanSathi Project Owner may change issue severity' using errcode='42501';
 end if;
 if p_severity not in ('urgent','high','moderate','low') or p_report_id is null or
    length(btrim(coalesce(p_reason,''))) not between 5 and 500 then
   raise exception 'A valid severity and audit reason are required' using errcode='22023';
 end if;
 select s.severity,s.last_citizen_update_at,r.created_at
 into st from jansathi_internal.civic_followup_state s
 join public.jansathi_civic_reports r on r.id=s.report_id
 where s.report_id=p_report_id for update of s;
 if not found then raise exception 'Issue not found' using errcode='22023'; end if;
 if st.severity=p_severity then return true; end if;
 fresh_hours:=jansathi_internal.followup_hours(p_severity);
 last_anchor:=coalesce(st.last_citizen_update_at,st.created_at);
 update jansathi_internal.civic_followup_state set severity=p_severity,
  cadence_hours=fresh_hours,
  next_eligible_at=greatest(now(),last_anchor+make_interval(hours=>fresh_hours)),
  severity_set_by=auth.uid(),severity_reason=btrim(p_reason),updated_at=now()
 where report_id=p_report_id;
 insert into public.jansathi_followup_severity_audit(report_id,old_severity,new_severity,reason,changed_by)
 values(p_report_id,st.severity,p_severity,btrim(p_reason),auth.uid());
 return true;
end $function$;

create function public.jansathi_owner_set_civic_followup_severity(
 p_report_id uuid,p_severity text,p_reason text
) returns boolean
language sql volatile security invoker set search_path=pg_catalog
as $function$
 select jansathi_internal.owner_set_civic_followup_severity(p_report_id,p_severity,p_reason);
$function$;

create function jansathi_internal.owner_issue_followup_schedule(p_limit integer default 100)
returns table(report_id uuid,issue_title text,issue_status text,severity text,
 cadence_hours integer,next_eligible_at timestamptz,citizen_update_count integer)
language plpgsql stable security definer set search_path=pg_catalog
as $function$
begin
 if not jansathi_internal.is_owner() then
   raise exception 'Verified Project Owner role required' using errcode='42501';
 end if;
 return query
 select r.id,r.title,r.status,s.severity,s.cadence_hours,s.next_eligible_at,s.citizen_update_count
 from public.jansathi_civic_reports r
 join jansathi_internal.civic_followup_state s on s.report_id=r.id
 order by r.created_at desc
 limit least(greatest(coalesce(p_limit,100),1),150);
end $function$;
create function public.jansathi_owner_issue_followup_schedule(p_limit integer default 100)
returns table(report_id uuid,issue_title text,issue_status text,severity text,
 cadence_hours integer,next_eligible_at timestamptz,citizen_update_count integer)
language sql stable security invoker set search_path=pg_catalog
as $function$
 select * from jansathi_internal.owner_issue_followup_schedule(p_limit);
$function$;

-- By default PostgreSQL gives functions PUBLIC EXECUTE. Explicitly restrict exposed RPCs.
revoke all on function public.jansathi_submit_civic_followup(uuid,text,text) from public,anon,authenticated;
revoke all on function public.jansathi_my_civic_followup_schedule() from public,anon,authenticated;
revoke all on function public.jansathi_owner_set_civic_followup_severity(uuid,text,text) from public,anon,authenticated;
revoke all on function public.jansathi_owner_issue_followup_schedule(integer) from public,anon,authenticated;
grant execute on function public.jansathi_submit_civic_followup(uuid,text,text) to authenticated;
grant execute on function public.jansathi_my_civic_followup_schedule() to authenticated;
grant execute on function public.jansathi_owner_set_civic_followup_severity(uuid,text,text) to authenticated;
grant execute on function public.jansathi_owner_issue_followup_schedule(integer) to authenticated;

revoke all on all functions in schema jansathi_internal from public,anon,authenticated;
grant usage on schema jansathi_internal to authenticated;
grant execute on function jansathi_internal.is_owner() to authenticated;
grant execute on function jansathi_internal.is_editor() to authenticated;
grant execute on function jansathi_internal.is_citizen_verified() to authenticated;
grant execute on function jansathi_internal.has_verified_paid_membership() to authenticated;
grant execute on function jansathi_internal.needs_human_review(text) to authenticated;
grant execute on function jansathi_internal.submit_civic_followup(uuid,text,text) to authenticated;
grant execute on function jansathi_internal.my_civic_followup_schedule() to authenticated;
grant execute on function jansathi_internal.owner_set_civic_followup_severity(uuid,text,text) to authenticated;
grant execute on function jansathi_internal.owner_issue_followup_schedule(integer) to authenticated;
