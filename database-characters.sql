-- Characters schema (idempotent)
-- People the user knows (name + birth data) used for the synastry and
-- life-monitor features. Adding a character is gated to paid plans; that
-- check is enforced in the API layer (app/api/characters), not in SQL.
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL, -- user id of the owner (auth required)
    did TEXT, -- device id of the creator (best-effort, for tracking)
    name TEXT NOT NULL,
    birth_day INTEGER NOT NULL,
    birth_month INTEGER NOT NULL,
    birth_year INTEGER NOT NULL,
    birth_hour INTEGER, -- nullable: birth time may be unknown
    birth_minute INTEGER,
    birth_country TEXT,
    birth_state TEXT,
    lat NUMERIC,
    lng NUMERIC,
    timezone NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lookups by owner / device and recency ordering
CREATE INDEX IF NOT EXISTS idx_characters_owner_user_id ON characters(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_characters_did ON characters(did);
CREATE INDEX IF NOT EXISTS idx_characters_created_at ON characters(created_at);

-- Row level security: a character is private to its owner. API routes use the
-- service-role client (bypasses RLS); these policies are defence-in-depth for
-- any direct client access via the anon key.
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- Owner can read their own characters
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = current_schema()
          AND tablename = 'characters'
          AND policyname = 'Users can read their own characters'
    ) THEN
        CREATE POLICY "Users can read their own characters" ON characters
            FOR SELECT USING (
                owner_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
            );
    END IF;
END $$;

-- Owner can insert their own characters
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = current_schema()
          AND tablename = 'characters'
          AND policyname = 'Users can insert their own characters'
    ) THEN
        CREATE POLICY "Users can insert their own characters" ON characters
            FOR INSERT WITH CHECK (
                owner_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
            );
    END IF;
END $$;

-- Owner can update their own characters
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = current_schema()
          AND tablename = 'characters'
          AND policyname = 'Users can update their own characters'
    ) THEN
        CREATE POLICY "Users can update their own characters" ON characters
            FOR UPDATE USING (
                owner_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
            );
    END IF;
END $$;

-- Owner can delete their own characters
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = current_schema()
          AND tablename = 'characters'
          AND policyname = 'Users can delete their own characters'
    ) THEN
        CREATE POLICY "Users can delete their own characters" ON characters
            FOR DELETE USING (
                owner_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
            );
    END IF;
END $$;

COMMENT ON TABLE characters IS 'People the user knows (name + birth data) for synastry and life-monitor features. Adding a character is gated to paid plans in the API layer.';
