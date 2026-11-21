-- DBest single-device session replacement and renewal.
-- STAGED ONLY: do not execute until all login clients/handlers are upgraded.
-- Prerequisite: uniqueness indexes in 20261115_single_device_session_uniqueness_REVIEW_ONLY.sql.
-- Caller MUST be a trusted server-side Edge Function using service role credentials.
-- NEVER expose this RPC to anon/authenticated browser roles.
CREATE OR REPLACE FUNCTION public.dbest_replace_device_session(
  p_role text, p_account_id text, p_token_hash text, p_expires_at timestamptz
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF p_account_id IS NULL OR length(p_account_id)=0
    OR p_token_hash IS NULL OR length(p_token_hash)<32
    OR p_expires_at<=now() OR p_expires_at>now()+interval '30 days'
 THEN RAISE EXCEPTION 'invalid_session_parameters'; END IF;
 CASE p_role
 WHEN 'member' THEN
  INSERT INTO member_sessions_live(member_id,token_hash,expires_at)
  VALUES(p_account_id,p_token_hash,p_expires_at)
  ON CONFLICT (member_id) DO UPDATE
  SET token_hash=EXCLUDED.token_hash,expires_at=EXCLUDED.expires_at,created_at=now();
 WHEN 'vendor' THEN
  INSERT INTO marketplace_vendor_sessions_live(vendor_id,token_hash,expires_at)
  VALUES(p_account_id,p_token_hash,p_expires_at)
  ON CONFLICT (vendor_id) DO UPDATE
  SET token_hash=EXCLUDED.token_hash,expires_at=EXCLUDED.expires_at,created_at=now();
 WHEN 'vaahak' THEN
  INSERT INTO vaahak_sessions_live(partner_id,token_hash,expires_at)
  VALUES(p_account_id,p_token_hash,p_expires_at)
  ON CONFLICT (partner_id) DO UPDATE
  SET token_hash=EXCLUDED.token_hash,expires_at=EXCLUDED.expires_at,created_at=now();
 WHEN 'partner' THEN
  INSERT INTO partner_sessions_live(account_id,token_hash,expires_at)
  VALUES(p_account_id,p_token_hash,p_expires_at)
  ON CONFLICT (account_id) DO UPDATE
  SET token_hash=EXCLUDED.token_hash,expires_at=EXCLUDED.expires_at,created_at=now();
 ELSE RAISE EXCEPTION 'invalid_session_role';
 END CASE;
END $$;
REVOKE ALL ON FUNCTION public.dbest_replace_device_session(text,text,text,timestamptz)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dbest_replace_device_session(text,text,text,timestamptz) TO service_role;

-- Renew only the currently valid token; cannot revive expired or displaced sessions.
CREATE OR REPLACE FUNCTION public.dbest_renew_device_session(
 p_role text,p_token_hash text,p_new_expires_at timestamptz
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE updated_count integer;
BEGIN
 IF p_token_hash IS NULL OR length(p_token_hash)<32
 OR p_new_expires_at<=now() OR p_new_expires_at>now()+interval '30 days'
 THEN RETURN false; END IF;
 CASE p_role
 WHEN 'member' THEN
  UPDATE member_sessions_live SET expires_at=greatest(expires_at,p_new_expires_at)
  WHERE token_hash=p_token_hash AND expires_at>now();
 WHEN 'vendor' THEN
  UPDATE marketplace_vendor_sessions_live SET expires_at=greatest(expires_at,p_new_expires_at)
  WHERE token_hash=p_token_hash AND expires_at>now();
 WHEN 'vaahak' THEN
  UPDATE vaahak_sessions_live SET expires_at=greatest(expires_at,p_new_expires_at)
  WHERE token_hash=p_token_hash AND expires_at>now();
 WHEN 'partner' THEN
  UPDATE partner_sessions_live SET expires_at=greatest(expires_at,p_new_expires_at)
  WHERE token_hash=p_token_hash AND expires_at>now();
 ELSE RETURN false;
 END CASE;
 GET DIAGNOSTICS updated_count=ROW_COUNT;
 RETURN updated_count=1;
END $$;
REVOKE ALL ON FUNCTION public.dbest_renew_device_session(text,text,timestamptz)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dbest_renew_device_session(text,text,timestamptz) TO service_role;
