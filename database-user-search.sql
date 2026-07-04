-- find_user_by_email: lookup helper used by the chat-session sharing UI to
-- show the existing user's avatar/name before inviting them. SECURITY
-- DEFINER lets us read auth.users; access is gated to authenticated
-- callers only.

CREATE OR REPLACE FUNCTION public.find_user_by_email(p_email TEXT)
RETURNS TABLE (
    user_id   UUID,
    name      TEXT,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT u.id AS user_id,
           p.name,
           p.avatar_url
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.id = u.id
     WHERE LOWER(u.email) = LOWER(BTRIM(p_email))
     LIMIT 1;
END;
$$;

-- Restrict to authenticated callers; service role bypasses these grants.
REVOKE ALL ON FUNCTION public.find_user_by_email(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_user_by_email(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(TEXT) TO service_role;

COMMENT ON FUNCTION public.find_user_by_email(TEXT) IS
    'Resolve a user (id, name, avatar_url) by email. Used by Share access UI to preview the invitee.';
