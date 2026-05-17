-- Chat sessions schema (idempotent)
-- Safe to run multiple times

CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    did TEXT NOT NULL, -- device id of the creator
    owner_user_id TEXT, -- user id if authenticated
    question TEXT NOT NULL,
    topic TEXT NULL,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    decision JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backfill-safe schema evolution (idempotent)
ALTER TABLE chat_sessions
    ADD COLUMN IF NOT EXISTS topic TEXT;

ALTER TABLE chat_sessions
    ADD COLUMN IF NOT EXISTS origin_context JSONB NULL;
COMMENT ON COLUMN chat_sessions.origin_context IS
    'Optional page context (birth chart / calendar day) captured when the session was started from a contextual page. Used to enrich AI contextSummary on every reply.';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_did ON chat_sessions(did);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_owner_user_id ON chat_sessions(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at);

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to update their own chat sessions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = current_schema()
          AND tablename = 'chat_sessions'
          AND policyname = 'Users can update their own chat sessions'
    ) THEN
        CREATE POLICY "Users can update their own chat sessions" ON chat_sessions
            FOR UPDATE USING (
                did = current_setting('request.jwt.claims', true)::json->>'device_id' OR
                owner_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
            );
    END IF;
END $$;

-- Policy to allow public read access (for shared links)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = current_schema()
          AND tablename = 'chat_sessions'
          AND policyname = 'Public read access for chat sessions'
    ) THEN
        CREATE POLICY "Public read access for chat sessions" ON chat_sessions
            FOR SELECT USING (true);
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON TABLE chat_sessions IS 'Stores chat session data for homepage chat flow';
COMMENT ON COLUMN chat_sessions.did IS 'Device ID of the creator for anonymous user tracking';
COMMENT ON COLUMN chat_sessions.decision IS 'Decision payload returned from the chat decision model';
