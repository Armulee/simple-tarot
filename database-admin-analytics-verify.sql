-- =============================================================================
-- Verification harness for admin analytics RPCs.
-- Run AFTER database-admin-analytics.sql. Read-only. Run in Supabase SQL editor.
--
-- It prints, side by side:
--   (A) what each RPC returns for the 7-day and 1-month ranges, and
--   (B) independent raw counts computed inline, so you can sanity-check.
-- All raw counts use Asia/Bangkok and EXCLUDE today (partial), matching the RPCs.
-- =============================================================================

-- ---- (A) RPC outputs --------------------------------------------------------
SELECT '7d'  AS range, 'returning'  AS metric, admin_analytics_returning (now() - interval '7 days',  now()) AS result
UNION ALL SELECT '7d','active',     admin_analytics_active     (now() - interval '7 days',  now())
UNION ALL SELECT '7d','reading',    admin_analytics_reading    (now() - interval '7 days',  now())
UNION ALL SELECT '7d','engagement', admin_analytics_engagement (now() - interval '7 days',  now())
UNION ALL SELECT '7d','retention',  admin_analytics_retention  (now() - interval '7 days',  now())
UNION ALL SELECT '7d','conversion', admin_analytics_conversion (now() - interval '7 days',  now())
UNION ALL SELECT '1m','returning',  admin_analytics_returning  (now() - interval '30 days', now())
UNION ALL SELECT '1m','active',     admin_analytics_active     (now() - interval '30 days', now())
UNION ALL SELECT '1m','reading',    admin_analytics_reading    (now() - interval '30 days', now())
UNION ALL SELECT '1m','engagement', admin_analytics_engagement (now() - interval '30 days', now())
UNION ALL SELECT '1m','retention',  admin_analytics_retention  (now() - interval '30 days', now())
UNION ALL SELECT '1m','conversion', admin_analytics_conversion (now() - interval '30 days', now());

-- ---- (B) Independent raw cross-checks --------------------------------------
WITH bounds AS (
    SELECT (now() AT TIME ZONE 'Asia/Bangkok')::date            AS today,
           (now() AT TIME ZONE 'Asia/Bangkok')::date - 1        AS last_complete
),
s AS (
    SELECT COALESCE(NULLIF(owner_user_id,''), did) AS actor_key,
           owner_user_id,
           ((created_at AT TIME ZONE 'Asia/Bangkok'))::date AS day_local,
           (SELECT count(*) FROM jsonb_array_elements(COALESCE(messages,'[]'::jsonb)) m
              WHERE jsonb_typeof(m->'cards')='array' AND jsonb_array_length(m->'cards')>0) AS readings,
           EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(messages,'[]'::jsonb)) m
              WHERE m->>'role'='assistant') AS completed
    FROM chat_sessions
)
SELECT label,
       count(*)                                   AS raw_sessions,
       count(DISTINCT actor_key)                  AS raw_actors,
       count(*) FILTER (WHERE completed)          AS raw_completed_sessions,
       sum(readings)                              AS raw_reading_events,
       count(DISTINCT owner_user_id) FILTER (WHERE owner_user_id IS NOT NULL) AS raw_registered_actors
FROM (
    SELECT '7d' AS label, s.* FROM s, bounds b
      WHERE s.day_local BETWEEN b.last_complete - 6  AND b.last_complete
    UNION ALL
    SELECT '1m' AS label, s.* FROM s, bounds b
      WHERE s.day_local BETWEEN b.last_complete - 29 AND b.last_complete
) x
GROUP BY label
ORDER BY label;
