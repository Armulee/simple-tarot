-- Create share_visit_awards table for tracking earned stars from visitors
-- Unified identifiers: visitor_id and owner_id (store user_id or DID as opaque text)
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS share_visit_awards (
    id SERIAL PRIMARY KEY,
    shared_id TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    date_key TEXT NOT NULL, -- YYYY-MM-DD (Bangkok timezone)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_share_visit_awards_shared_id ON share_visit_awards(shared_id);
CREATE INDEX IF NOT EXISTS idx_share_visit_awards_date_key ON share_visit_awards(date_key);
CREATE INDEX IF NOT EXISTS idx_share_visit_awards_lookup ON share_visit_awards(shared_id, visitor_id, date_key);
CREATE INDEX IF NOT EXISTS idx_share_visit_awards_owner_cap ON share_visit_awards(date_key, owner_id);

-- RLS
ALTER TABLE share_visit_awards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow reading share visit awards" ON share_visit_awards;
CREATE POLICY "Allow reading share visit awards" ON share_visit_awards
    FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow inserting share visit awards" ON share_visit_awards;
CREATE POLICY "Allow inserting share visit awards" ON share_visit_awards
    FOR INSERT WITH CHECK (true);

-- Comments
COMMENT ON TABLE share_visit_awards IS 'Tracks earned stars from visitors viewing shared or reading pages';
COMMENT ON COLUMN share_visit_awards.shared_id IS 'ID of the shared or reading resource';
COMMENT ON COLUMN share_visit_awards.visitor_id IS 'Opaque visitor identifier (user_id or DID)';
COMMENT ON COLUMN share_visit_awards.owner_id IS 'Opaque owner identifier (user_id or DID)';
COMMENT ON COLUMN share_visit_awards.date_key IS 'Date in YYYY-MM-DD format for daily caps';