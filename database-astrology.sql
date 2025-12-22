-- Astrology (horoscope) readings schema (idempotent)
-- Safe to run multiple times

CREATE TABLE IF NOT EXISTS astrology_readings (
    id TEXT PRIMARY KEY,
    did TEXT NOT NULL, -- device id of the creator
    owner_user_id TEXT, -- user id if authenticated

    -- Birth info
    birth_day INTEGER NOT NULL,
    birth_month INTEGER NOT NULL,
    birth_year INTEGER NOT NULL,
    birth_hour INTEGER NOT NULL DEFAULT 12,
    birth_minute INTEGER NOT NULL DEFAULT 0,
    birth_timezone NUMERIC NOT NULL DEFAULT 0,
    birth_lat NUMERIC NOT NULL DEFAULT 0,
    birth_lng NUMERIC NOT NULL DEFAULT 0,
    birth_country TEXT,
    birth_state_province TEXT,

    -- Transit info
    transit_day INTEGER NOT NULL,
    transit_month INTEGER NOT NULL,
    transit_year INTEGER NOT NULL,
    transit_hour INTEGER NOT NULL DEFAULT 12,
    transit_minute INTEGER NOT NULL DEFAULT 0,
    transit_timezone NUMERIC NOT NULL DEFAULT 0,
    transit_lat NUMERIC NOT NULL DEFAULT 0,
    transit_lng NUMERIC NOT NULL DEFAULT 0,
    transit_country TEXT,
    transit_state_province TEXT,

    -- Optional user intent
    question TEXT,

    -- Computed chart snapshots
    birth_houses JSONB,
    birth_planets JSONB,
    transit_houses JSONB,
    transit_planets JSONB,

    -- Generated summary (AI)
    summary TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_astrology_readings_did ON astrology_readings(did);
CREATE INDEX IF NOT EXISTS idx_astrology_readings_owner_user_id ON astrology_readings(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_astrology_readings_created_at ON astrology_readings(created_at);

-- RLS
ALTER TABLE astrology_readings ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own astrology readings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = current_schema()
          AND tablename = 'astrology_readings'
          AND policyname = 'Users can read their own astrology readings'
    ) THEN
        CREATE POLICY "Users can read their own astrology readings" ON astrology_readings
            FOR SELECT USING (
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
          AND tablename = 'astrology_readings'
          AND policyname = 'Public read access for shared astrology readings'
    ) THEN
        CREATE POLICY "Public read access for shared astrology readings" ON astrology_readings
            FOR SELECT USING (true);
    END IF;
END $$;

COMMENT ON TABLE astrology_readings IS 'Stores astrology readings with birth + transit snapshots and an optional AI-generated summary';

