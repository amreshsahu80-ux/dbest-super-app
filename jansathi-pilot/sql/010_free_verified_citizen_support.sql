-- Free/Starter/Guest citizens with a trusted verified residence may support civic issues.
-- News publishing independently retains the ₹299+ verified DBest membership requirement.
create or replace function jansathi_internal.can_support_issue(p_report_id uuid) returns boolean
language plpgsql stable security definer set search_path=pg_catalog
as $$
declare
 v_home record;v_site record;v_report record;v_rules record;
begin
 if auth.uid() is null or not jansathi_internal.is_citizen_verified() then return false; end if;
 select r.user_id,r.status into v_report from public.jansathi_civic_reports r
 join public.jansathi_civic_feed f on f.id=r.id where r.id=p_report_id;
 if not found or v_report.user_id=auth.uid() or v_report.status in ('resolved','rejected') then return false; end if;
 select home_geog,area_kind,pincode into v_home
 from jansathi_internal.verified_residences h
 where h.user_id=auth.uid() and h.provenance='dbest_server_verified'
   and h.valid_until>now() and h.verified_at>now()-interval '90 days';
 if not found then return false;end if;
 select issue_geog,pincode into v_site from jansathi_internal.verified_issue_sites where report_id=p_report_id;
 if not found then return false; end if;
 select urban_radius_m,rural_radius_m into v_rules from jansathi_internal.support_radius_settings where singleton;
 if not found then return false;end if;
 return extensions.st_dwithin(v_home.home_geog,v_site.issue_geog,
    case when v_home.area_kind='urban' then v_rules.urban_radius_m else v_rules.rural_radius_m end);
end $$;
