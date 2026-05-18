-- Speeds up the personal /birth-chart lookup, which fetches the most recent
-- birth_charts row for a signed-in user via:
--   SELECT ... FROM birth_charts
--   WHERE owner_user_id = $1
--   ORDER BY created_at DESC
--   LIMIT 1
--
-- Idempotent: safe to run multiple times.

CREATE INDEX IF NOT EXISTS idx_birth_charts_owner_recent
  ON birth_charts (owner_user_id, created_at DESC);
