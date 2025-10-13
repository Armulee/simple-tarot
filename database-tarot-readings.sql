-- Create tarot_readings table for the new flow
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS tarot_readings (
    id TEXT PRIMARY KEY,
    did TEXT NOT NULL, -- device id of the creator
    owner_user_id TEXT, -- user id if authenticated
    question TEXT NOT NULL,
    cards TEXT[] NOT NULL,
    interpretation TEXT, -- null until first visit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tarot_readings_did ON tarot_readings(did);
CREATE INDEX IF NOT EXISTS idx_tarot_readings_owner_user_id ON tarot_readings(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_tarot_readings_created_at ON tarot_readings(created_at);
CREATE INDEX IF NOT EXISTS idx_tarot_readings_interpretation ON tarot_readings(interpretation) WHERE interpretation IS NOT NULL;

-- Add RLS policies (adjust as needed for your security requirements)
ALTER TABLE tarot_readings ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own readings
CREATE POLICY "Users can read their own readings" ON tarot_readings
    FOR SELECT USING (
        did = current_setting('request.jwt.claims', true)::json->>'device_id' OR
        owner_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    );

-- Policy to allow users to update their own readings (for adding interpretation)
CREATE POLICY "Users can update their own readings" ON tarot_readings
    FOR UPDATE USING (
        did = current_setting('request.jwt.claims', true)::json->>'device_id' OR
        owner_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    );

-- Policy to allow public read access (for shared links)
CREATE POLICY "Public read access for shared readings" ON tarot_readings
    FOR SELECT USING (true);

-- Add comment for documentation
COMMENT ON TABLE tarot_readings IS 'Stores tarot reading data with interpretation generated on first visit';
COMMENT ON COLUMN tarot_readings.did IS 'Device ID of the creator for anonymous user tracking';
COMMENT ON COLUMN tarot_readings.interpretation IS 'AI-generated interpretation, null until first visit';