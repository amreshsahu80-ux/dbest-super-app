-- Safe, low-information APIs for verified PIN/distance eligibility.
-- No private home coordinates leave the database.
create function jansathi_internal.own_residence_status()
returns table(verified boolean,area_kind text,valid_until timestamptz)
language sql stable security definer set search_path=pg_catalog
as $$
select exists(select 1 from jansathi_internal.verified_residences h
    where h.user_id=auth.uid() and h.valid_until>now()
      and h.verified_at>now()-interval '90 days' and h.provenance='dbest_server_verified'),
 (select h.area_kind from jansathi_internal.verified_residences h where h.user_id=auth.uid()
    and h.valid_until>now() and h.verified_at>now()-interval '90 days' limit 1),
 (select h.valid_until from jansathi_internal.verified_residences h where h.user_id=auth.uid()
    and h.valid_until>now() and h.verified_at>now()-interval '90 days' limit 1)
$$;
revoke all on function jansathi_internal.own_residence_status() from public,anon,authenticated;
grant execute on function jansathi_internal.own_residence_status() to authenticated;
create function public.jansathi_my_residence_status()
returns table(verified boolean,area_kind text,valid_until timestamptz)
language sql stable security invoker set search_path=pg_catalog
as $$select * from jansathi_internal.own_residence_status()$$;
revoke all on function public.jansathi_my_residence_status() from public,anon,authenticated;
grant execute on function public.jansathi_my_residence_status() to authenticated;

create function jansathi_internal.my_supportable_issues(p_limit integer)
returns table(report_id uuid)
language sql stable security definer set search_path=pg_catalog
as $$
select f.id from public.jansathi_civic_feed f
where auth.uid() is not null
  and jansathi_internal.can_support_issue(f.id)
order by f.created_at desc
limit least(greatest(coalesce(p_limit,100),1),100)
$$;
revoke all on function jansathi_internal.my_supportable_issues(integer) from public,anon,authenticated;
grant execute on function jansathi_internal.my_supportable_issues(integer) to authenticated;
create function public.jansathi_my_supportable_issues(p_limit integer default 100)
returns table(report_id uuid)
language sql stable security invoker set search_path=pg_catalog
as $$select * from jansathi_internal.my_supportable_issues(p_limit)$$;
revoke all on function public.jansathi_my_supportable_issues(integer) from public,anon,authenticated;
grant execute on function public.jansathi_my_supportable_issues(integer) to authenticated;

create function jansathi_internal.owner_geo_review()
returns table(report_id uuid,headline text,issue_pincode text,submitted_issue_latitude double precision,
 submitted_issue_longitude double precision,geo_approved boolean,town text,district text,state text)
language plpgsql stable security definer set search_path=pg_catalog
as $$
begin
 if not jansathi_internal.is_owner() then raise exception 'Project Owner only' using errcode='42501';end if;
 return query
 select r.id,r.title,r.issue_pincode,r.submitted_issue_latitude,r.submitted_issue_longitude,
        (v.report_id is not null),r.town,r.district,r.state
 from public.jansathi_civic_reports r
 join public.jansathi_civic_feed f on f.id=r.id
 left join jansathi_internal.verified_issue_sites v on v.report_id=r.id
 order by r.created_at desc limit 100;
end $$;
revoke all on function jansathi_internal.owner_geo_review() from public,anon,authenticated;
grant execute on function jansathi_internal.owner_geo_review() to authenticated;
create function public.jansathi_owner_geo_review()
returns table(report_id uuid,headline text,issue_pincode text,submitted_issue_latitude double precision,
 submitted_issue_longitude double precision,geo_approved boolean,town text,district text,state text)
language sql stable security invoker set search_path=pg_catalog
as $$select * from jansathi_internal.owner_geo_review()$$;
revoke all on function public.jansathi_owner_geo_review() from public,anon,authenticated;
grant execute on function public.jansathi_owner_geo_review() to authenticated;
