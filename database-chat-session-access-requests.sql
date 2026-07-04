-- Chat session access REQUESTS (idempotent)
-- Safe to run multiple times.
-- A request is created when an authenticated viewer asks the owner of a
-- session for compose access. The owner approves -> a grant is added to
-- chat_session_access; the owner denies -> the request is marked denied.

CREATE TABLE IF NOT EXISTS chat_session_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    requester_user_id TEXT NOT NULL,
    requester_email TEXT NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'denied')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by_user_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_chat_session_access_requests_session
    ON chat_session_access_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_session_access_requests_requester
    ON chat_session_access_requests(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_session_access_requests_status
    ON chat_session_access_requests(session_id, status);

-- Only one outstanding (pending) request per (session, requester).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_chat_session_access_requests_pending
    ON chat_session_access_requests(session_id, requester_user_id)
    WHERE status = 'pending';

ALTER TABLE chat_session_access_requests ENABLE ROW LEVEL SECURITY;

-- Read: owner sees requests for their session, requester sees their own.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = current_schema()
          AND tablename = 'chat_session_access_requests'
          AND policyname = 'Owner or requester can read'
    ) THEN
        CREATE POLICY "Owner or requester can read" ON chat_session_access_requests
            FOR SELECT USING (
                requester_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
                OR EXISTS (
                    SELECT 1 FROM chat_sessions s
                    WHERE s.id = chat_session_access_requests.session_id
                      AND s.owner_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
                )
            );
    END IF;
END $$;

COMMENT ON TABLE chat_session_access_requests IS
    'Access requests pending owner approval. Approve -> grant in chat_session_access.';
