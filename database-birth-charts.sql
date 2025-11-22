-- Birth charts schema (idempotent)
-- Safe to run multiple times

CREATE TABLE IF NOT EXISTS birth_charts (
    id TEXT PRIMARY KEY,
    did TEXT NOT NULL, -- device id of the creator
    owner_user_id TEXT, -- user id if authenticated
    day INTEGER NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    hour INTEGER NOT NULL,
    minute INTEGER NOT NULL,
    timezone NUMERIC NOT NULL,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    country TEXT,
    state_prov TEXT,
    houses JSONB, -- stores the houses data from the API
    planets JSONB, -- stores the planets data from the API
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_birth_charts_did ON birth_charts(did);
CREATE INDEX IF NOT EXISTS idx_birth_charts_owner_user_id ON birth_charts(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_birth_charts_created_at ON birth_charts(created_at);

-- Add RLS policies
ALTER TABLE birth_charts ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own birth charts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = current_schema()
          AND tablename = 'birth_charts'
          AND policyname = 'Users can read their own birth charts'
    ) THEN
        CREATE POLICY "Users can read their own birth charts" ON birth_charts
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
          AND tablename = 'birth_charts'
          AND policyname = 'Public read access for shared birth charts'
    ) THEN
        CREATE POLICY "Public read access for shared birth charts" ON birth_charts
            FOR SELECT USING (true);
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON TABLE birth_charts IS 'Stores birth chart data with planetary positions and houses';
COMMENT ON COLUMN birth_charts.did IS 'Device ID of the creator for anonymous user tracking';
COMMENT ON COLUMN birth_charts.houses IS 'JSONB data containing house positions';
COMMENT ON COLUMN birth_charts.planets IS 'JSONB data containing planetary positions';
