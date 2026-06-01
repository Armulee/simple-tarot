-- Chat session access grants (idempotent)
-- Safe to run multiple times.
-- Gates the chat composer: only the session owner and explicitly granted
-- users (matched by user_id or pending email) may submit new messages.

CREATE TABLE IF NOT EXISTS chat_session_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    -- Exactly one of grantee_user_id or grantee_email is meaningful.
    -- grantee_email is used until the invited person signs up; from then on
    -- requests can also match by user_id directly.
    grantee_user_id TEXT,
    grantee_email TEXT,
    granted_by_user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chat_session_access_grantee_chk
        CHECK (grantee_user_id IS NOT NULL OR grantee_email IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_chat_session_access_session
    ON chat_session_access(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_session_access_user
    ON chat_session_access(grantee_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_session_access_email
    ON chat_session_access(grantee_email);

-- Prevent duplicate grants per (session, grantee).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_chat_session_access_user
    ON chat_session_access(session_id, grantee_user_id)
    WHERE grantee_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_chat_session_access_email
    ON chat_session_access(session_id, grantee_email)
    WHERE grantee_email IS NOT NULL;

ALTER TABLE chat_session_access ENABLE ROW LEVEL SECURITY;

-- Read policy: only the session owner may read its grants via the anon key.
-- Service-role queries (supabaseAdmin) bypass RLS and are used by our API.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = current_schema()
          AND tablename = 'chat_session_access'
          AND policyname = 'Owner can read access grants'
    ) THEN
        CREATE POLICY "Owner can read access grants" ON chat_session_access
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM chat_sessions s
                    WHERE s.id = chat_session_access.session_id
                      AND s.owner_user_id =
                          current_setting('request.jwt.claims', true)::json->>'sub'
                )
            );
    END IF;
END $$;

COMMENT ON TABLE chat_session_access IS
    'Grants that allow non-owner users to compose on a chat session.';
COMMENT ON COLUMN chat_session_access.grantee_email IS
    'Lowercased email used to match the grantee before they sign up. After signup the same grant also matches by user_id (via the email index on auth.users).';
