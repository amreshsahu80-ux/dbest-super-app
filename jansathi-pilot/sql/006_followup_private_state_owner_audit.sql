-- Intentional private state lockdown and Owner-only audit visibility.
-- These policies do not allow regular users to browse private follow-up scheduling state.
create policy "Never expose internal civic cadence table" on jansathi_internal.civic_followup_state
  for select to authenticated using(false);
grant select on public.jansathi_followup_severity_audit to authenticated;
create policy "Verified Owner reads follow-up severity audit" on public.jansathi_followup_severity_audit
  for select to authenticated using(jansathi_internal.is_owner());
