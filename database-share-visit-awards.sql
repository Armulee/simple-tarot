-- Create share_visit_awards table for tracking earned stars from visitors
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS share_visit_awards (
    id SERIAL PRIMARY KEY,
    shared_id TEXT NOT NULL, -- ID of the shared tarot reading
    visitor_user_id TEXT, -- User ID if visitor is authenticated
    visitor_did TEXT, -- Device ID if visitor is anonymous
    owner_user_id TEXT, -- Owner's user ID if authenticated
    owner_did TEXT, -- Owner's device ID
    date_key TEXT NOT NULL, -- Date in YYYY-MM-DD format (Bangkok timezone)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_share_visit_awards_shared_id ON share_visit_awards(shared_id);
CREATE INDEX IF NOT EXISTS idx_share_visit_awards_visitor_user_id ON share_visit_awards(visitor_user_id);
CREATE INDEX IF NOT EXISTS idx_share_visit_awards_visitor_did ON share_visit_awards(visitor_did);
CREATE INDEX IF NOT EXISTS idx_share_visit_awards_date_key ON share_visit_awards(date_key);
CREATE INDEX IF NOT EXISTS idx_share_visit_awards_owner_user_id ON share_visit_awards(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_share_visit_awards_owner_did ON share_visit_awards(owner_did);

-- Composite index for share visit awards lookups
CREATE INDEX IF NOT EXISTS idx_share_visit_awards_lookup 
ON share_visit_awards(shared_id, visitor_user_id, date_key);

-- Index for anonymous visitor lookups
CREATE INDEX IF NOT EXISTS idx_share_visit_awards_anon_lookup 
ON share_visit_awards(shared_id, visitor_did, date_key);

-- Index for owner daily cap checks
CREATE INDEX IF NOT EXISTS idx_share_visit_awards_owner_cap 
ON share_visit_awards(date_key, owner_user_id) 
WHERE owner_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_share_visit_awards_owner_did_cap 
ON share_visit_awards(date_key, owner_did) 
WHERE owner_did IS NOT NULL;

-- Add RLS policies (adjust as needed for your security requirements)
ALTER TABLE share_visit_awards ENABLE ROW LEVEL SECURITY;

-- Policy to allow reading share visit awards
CREATE POLICY "Allow reading share visit awards" ON share_visit_awards
    FOR SELECT USING (true);

-- Policy to allow inserting share visit awards
CREATE POLICY "Allow inserting share visit awards" ON share_visit_awards
    FOR INSERT WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE share_visit_awards IS 'Tracks earned stars from visitors viewing shared tarot readings';
COMMENT ON COLUMN share_visit_awards.shared_id IS 'ID of the shared tarot reading';
COMMENT ON COLUMN share_visit_awards.visitor_user_id IS 'User ID of the visitor if authenticated';
COMMENT ON COLUMN share_visit_awards.visitor_did IS 'Device ID of the visitor if anonymous';
COMMENT ON COLUMN share_visit_awards.owner_user_id IS 'User ID of the reading owner if authenticated';
COMMENT ON COLUMN share_visit_awards.owner_did IS 'Device ID of the reading owner';
COMMENT ON COLUMN share_visit_awards.date_key IS 'Date in YYYY-MM-DD format for daily caps';