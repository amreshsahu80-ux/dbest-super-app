-- Move privileged national promotion mutation into an unexposed internal function.
-- The public RPC becomes SECURITY INVOKER; the private function rechecks trusted owner identity.
create function jansathi_internal.set_national_featured(
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
revoke all on function jansathi_internal.set_national_featured(text,uuid,boolean,text) from public,anon,authenticated;
grant execute on function jansathi_internal.set_national_featured(text,uuid,boolean,text) to authenticated;
create or replace function public.jansathi_set_national_featured(
 p_kind text,p_content_id uuid,p_featured boolean,p_reason text
) returns boolean
language sql volatile security invoker set search_path=pg_catalog
as $function$
 select jansathi_internal.set_national_featured(p_kind,p_content_id,p_featured,p_reason);
$function$;
revoke all on function public.jansathi_set_national_featured(text,uuid,boolean,text) from public,anon;
grant execute on function public.jansathi_set_national_featured(text,uuid,boolean,text) to authenticated;