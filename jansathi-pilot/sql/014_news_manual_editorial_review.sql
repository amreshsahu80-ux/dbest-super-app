-- JanSathi isolated pilot: require reviewed, audited approval for EVERY news item.
-- Does not touch DBest Pro or the established Cab / Marketplace flows.
create table if not exists jansathi_internal.news_moderation_audit(
 id bigint generated always as identity primary key,
 news_id uuid not null,
 actor_id uuid not null,
 from_status text not null,
 to_status text not null,
 reason text not null check (length(btrim(reason)) between 10 and 500),
 recorded_at timestamptz not null default now()
);
alter table jansathi_internal.news_moderation_audit enable row level security;
revoke all on jansathi_internal.news_moderation_audit from public, anon, authenticated;
revoke all on sequence jansathi_internal.news_moderation_audit_id_seq from public, anon, authenticated;

create or replace function jansathi_internal.news_before_write()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, jansathi_internal
as $function$
begin
 if tg_op='INSERT' then
   new.author_id:=auth.uid();
   new.created_at:=now();
   -- No routine user-submitted news may publish without an editor's review.
   new.status:='held';
 else
   new.author_id:=old.author_id;
   new.created_at:=old.created_at;
 end if;
 new.updated_at:=now();
 return new;
end $function$;

-- Remove the shortcut that allowed editor accounts to update a full row
-- without a logged editorial decision.
drop policy if exists "Editor moderates news" on public.jansathi_news_submissions;
revoke update on public.jansathi_news_submissions from authenticated;

create or replace function public.jansathi_editor_moderate_news(
 p_news_id uuid, p_action text, p_reason text
) returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public, jansathi_internal
as $function$
declare r public.jansathi_news_submissions%rowtype;
        previous text;
        action_value text:=lower(btrim(coalesce(p_action,'')));
        rationale text:=btrim(coalesce(p_reason,''));
        actor uuid:=auth.uid();
begin
 if actor is null or not jansathi_internal.is_editor() then
   raise exception 'Not authorized to moderate news' using errcode='42501';
 end if;
 if char_length(rationale) not between 10 and 500 then
   raise exception 'Reason must be 10 to 500 characters';
 end if;
 if action_value not in ('published','rejected','removed','held') then
   raise exception 'Invalid moderation action';
 end if;
 select * into r from public.jansathi_news_submissions
 where id=p_news_id for update;
 if not found then raise exception 'News submission not found'; end if;
 previous:=r.status;
 if not (
   (previous in ('pending','held') and action_value in ('published','rejected'))
   or (previous='published' and action_value in ('removed','held'))
   or (previous='rejected' and action_value='held')
   or (previous='removed' and action_value='held')
 ) then
   raise exception 'Invalid news status transition: % -> %',previous,action_value;
 end if;
 update public.jansathi_news_submissions
 set status=action_value where id=p_news_id;
 insert into jansathi_internal.news_moderation_audit
 (news_id,actor_id,from_status,to_status,reason)
 values(p_news_id,actor,previous,action_value,rationale);
 return jsonb_build_object('ok',true,'id',p_news_id,'status',action_value);
end $function$;
revoke all on function public.jansathi_editor_moderate_news(uuid,text,text)
from public, anon, authenticated;
grant execute on function public.jansathi_editor_moderate_news(uuid,text,text)
to authenticated;
