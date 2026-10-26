-- JanSathi Free pilot only: human-reviewed abuse queue with anti-spam limits.
-- No changes to DBest Pro and no automatic deletion of user reports.
create table if not exists jansathi_internal.abuse_review_decisions(
 flag_id uuid primary key references public.jansathi_abuse_flags(id) on delete restrict,
 reviewer_id uuid not null,
 decision text not null check (decision in ('dismissed','removed')),
 review_reason text not null check (char_length(btrim(review_reason)) between 10 and 500),
 reviewed_at timestamptz not null default now()
);
alter table jansathi_internal.abuse_review_decisions enable row level security;
revoke all on jansathi_internal.abuse_review_decisions from public, anon, authenticated;

create or replace function jansathi_internal.guard_abuse_flag()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public,jansathi_internal
as $$
begin
 if auth.uid() is null then
   raise exception 'Sign in to flag public content' using errcode='42501';
 end if;
 new.reporter_id:=auth.uid();
 new.created_at:=now();
 new.reason:=btrim(coalesce(new.reason,''));
 if char_length(new.reason) not between 12 and 500 then
   raise exception 'Flag reason must have 12 to 500 characters';
 end if;
 if new.content_kind not in ('news','civic') then
   raise exception 'Invalid content kind';
 end if;
 if not (
   (new.content_kind='news' and exists (
       select 1 from public.jansathi_news_feed where id=new.content_id))
   or (new.content_kind='civic' and exists (
       select 1 from public.jansathi_civic_feed where id=new.content_id))
 ) then
   raise exception 'Flag only a publicly visible post';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('js-flag:'||auth.uid()::text,0));
 if (select count(*) from public.jansathi_abuse_flags
     where reporter_id=auth.uid() and created_at > now()-interval '24 hours')>=8 then
   raise exception 'Daily flag limit reached';
 end if;
 if exists(select 1 from public.jansathi_abuse_flags
     where reporter_id=auth.uid() and content_kind=new.content_kind
       and content_id=new.content_id and created_at > now()-interval '30 days') then
   raise exception 'You already reported this post recently';
 end if;
 return new;
end;
$$;
drop trigger if exists jansathi_guard_abuse_flag on public.jansathi_abuse_flags;
create trigger jansathi_guard_abuse_flag before insert on public.jansathi_abuse_flags
for each row execute function jansathi_internal.guard_abuse_flag();

create or replace function public.jansathi_editor_abuse_queue(p_limit integer default 50)
returns setof jsonb language plpgsql security definer
set search_path=pg_catalog,public,jansathi_internal
as $$
begin
 if auth.uid() is null or not jansathi_internal.is_editor() then
   raise exception 'Not authorized to review flags' using errcode='42501';
 end if;
 return query
 select jsonb_build_object(
   'flag_id',f.id,'kind',f.content_kind,'content_id',f.content_id,
   'reason',f.reason,'created_at',f.created_at,
   'headline',case when f.content_kind='news' then
     (select n.headline from public.jansathi_news_feed n where n.id=f.content_id)
     else (select c.headline from public.jansathi_civic_feed c where c.id=f.content_id) end
 ) from public.jansathi_abuse_flags f
 left join jansathi_internal.abuse_review_decisions d on d.flag_id=f.id
 where d.flag_id is null
 order by f.created_at asc
 limit greatest(1,least(coalesce(p_limit,50),100));
end;
$$;

create or replace function public.jansathi_editor_resolve_abuse_flag(
 p_flag_id uuid,p_action text,p_reason text)
returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,jansathi_internal
as $$
declare f public.jansathi_abuse_flags%rowtype;
        action_name text:=lower(btrim(coalesce(p_action,'')));
        reason_text text:=btrim(coalesce(p_reason,''));
        changed_rows integer;
begin
 if auth.uid() is null or not jansathi_internal.is_editor() then
   raise exception 'Not authorized to resolve flags' using errcode='42501';
 end if;
 if char_length(reason_text) not between 10 and 500 then
   raise exception 'Reviewer reason must be 10 to 500 characters';
 end if;
 if action_name not in ('dismissed','removed') then
   raise exception 'Invalid abuse resolution';
 end if;
 select * into f from public.jansathi_abuse_flags where id=p_flag_id for update;
 if not found then raise exception 'Flag not found'; end if;
 if exists(select 1 from jansathi_internal.abuse_review_decisions where flag_id=f.id)
 then raise exception 'Flag already resolved'; end if;
 if action_name='removed' then
   if f.content_kind='news' then
     perform public.jansathi_editor_moderate_news(
       f.content_id,'removed','Abuse review: '||reason_text);
   elsif f.content_kind='civic' then
     update public.jansathi_civic_reports
     set status='rejected',last_updated_at=now()
     where id=f.content_id and status <> 'rejected';
     get diagnostics changed_rows=row_count;
     if changed_rows<>1 then
       raise exception 'Civic item not available for withdrawal';
     end if;
   else raise exception 'Unsupported flag content type';
   end if;
 end if;
 insert into jansathi_internal.abuse_review_decisions
   (flag_id,reviewer_id,decision,review_reason)
 values(f.id,auth.uid(),action_name,reason_text);
 return jsonb_build_object('ok',true,'flag_id',f.id,'decision',action_name);
end;
$$;

revoke all on function public.jansathi_editor_abuse_queue(integer) from public,anon,authenticated;
grant execute on function public.jansathi_editor_abuse_queue(integer) to authenticated;
revoke all on function public.jansathi_editor_resolve_abuse_flag(uuid,text,text) from public,anon,authenticated;
grant execute on function public.jansathi_editor_resolve_abuse_flag(uuid,text,text) to authenticated;