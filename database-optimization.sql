-- Database optimization for faster interpretation lookups
-- Run these commands in your Supabase SQL editor

-- Add indexes for faster lookups on shared_tarot table
CREATE INDEX IF NOT EXISTS idx_shared_tarot_question ON shared_tarot(question);
CREATE INDEX IF NOT EXISTS idx_shared_tarot_interpretation ON shared_tarot(interpretation);
CREATE INDEX IF NOT EXISTS idx_shared_tarot_did ON shared_tarot(did);
CREATE INDEX IF NOT EXISTS idx_shared_tarot_owner_user_id ON shared_tarot(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_shared_tarot_created_at ON shared_tarot(created_at);

-- Composite index for the most common lookup pattern
-- This will speed up the check for existing interpretations
CREATE INDEX IF NOT EXISTS idx_shared_tarot_lookup 
ON shared_tarot(question, interpretation, did);

-- Index for user-specific lookups
CREATE INDEX IF NOT EXISTS idx_shared_tarot_user_lookup 
ON shared_tarot(question, interpretation, owner_user_id) 
WHERE owner_user_id IS NOT NULL;

-- Index for share visit awards table (if it exists)
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

-- Analyze tables to update statistics for better query planning
ANALYZE shared_tarot;
ANALYZE share_visit_awards;

-- Optional: Add a function to clean up old shared interpretations
-- This can help keep the database size manageable
CREATE OR REPLACE FUNCTION cleanup_old_shared_interpretations()
RETURNS void AS $$
BEGIN
    -- Delete shared interpretations older than 1 year that have no visits
    DELETE FROM shared_tarot 
    WHERE created_at < NOW() - INTERVAL '1 year'
    AND id NOT IN (
        SELECT DISTINCT shared_id 
        FROM share_visit_awards 
        WHERE shared_id IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to run cleanup monthly
-- (This requires pg_cron extension to be enabled)
-- SELECT cron.schedule('cleanup-old-interpretations', '0 2 1 * *', 'SELECT cleanup_old_shared_interpretations();');

-- Add comments for documentation
COMMENT ON INDEX idx_shared_tarot_lookup IS 'Composite index for checking existing interpretations by question, interpretation, and device ID';
COMMENT ON INDEX idx_shared_tarot_user_lookup IS 'Composite index for checking existing interpretations by question, interpretation, and user ID';
COMMENT ON INDEX idx_share_visit_awards_lookup IS 'Composite index for checking existing share visit awards';
COMMENT ON INDEX idx_share_visit_awards_anon_lookup IS 'Composite index for checking existing share visit awards for anonymous users';
