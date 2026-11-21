-- Isolated catalogue draft review audit. Apply only to the approved staging Supabase project.
create table if not exists public.dbest_master_catalogue_review_audit (
 id uuid primary key default gen_random_uuid(),
 draft_id uuid not null references public.dbest_master_catalogue_import_staging(id),
 batch_id uuid not null,
 row_number integer not null,
 prior_status text not null,
 new_status text not null check(new_status in ('reviewed','rejected')),
 actor text not null,
 reason text not null,
 created_at timestamptz not null default now()
);
alter table public.dbest_master_catalogue_review_audit enable row level security;
revoke all on public.dbest_master_catalogue_review_audit from anon, authenticated;
create or replace function public.dbest_review_master_catalogue_draft(
 p_batch_id uuid,p_row_number integer,p_decision text,p_reason text,p_actor text
) returns boolean language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if p_decision not in ('reviewed','rejected') or p_reason is null or length(trim(p_reason))<5 or
 p_actor is null or position('@' in p_actor)=0 then
  raise exception 'invalid review input';
 end if;
 update public.dbest_master_catalogue_import_staging
 set status=p_decision
 where batch_id=p_batch_id and row_number=p_row_number and status='draft'
 returning id into v_id;
 if v_id is null then return false; end if;
 insert into public.dbest_master_catalogue_review_audit
 (draft_id,batch_id,row_number,prior_status,new_status,actor,reason)
 values(v_id,p_batch_id,p_row_number,'draft',p_decision,p_actor,trim(p_reason));
 return true;
end $$;
revoke all on function public.dbest_review_master_catalogue_draft(uuid,integer,text,text,text) from public,anon,authenticated;
grant execute on function public.dbest_review_master_catalogue_draft(uuid,integer,text,text,text) to service_role;
