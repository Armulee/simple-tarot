-- =============================================================================
-- Admin analytics RPCs (Phase 1)  — AskingFate
-- =============================================================================
-- Source of truth: chat_sessions ONLY (per product decision).
--
-- LOCKED DEFINITIONS (agreed in Phase 0):
--   * Actor identity   : COALESCE(owner_user_id, did)
--                        -> logged-in users merge by user id; anonymous by device.
--   * Reading          : a card-draw EVENT = a messages[] element whose `cards`
--                        is a non-empty array. A session may contain several.
--   * Started Reading  : one chat_sessions row.
--   * Completed Reading: a session whose messages contain a role='assistant' entry.
--   * Active (DAU/etc) : an actor that STARTED >=1 session that calendar day.
--   * Returning user   : actor with sessions on >=2 distinct calendar days in range.
--   * Returning rate   : returning users / active users in range.
--   * Repeat rate      : % of all actors (lifetime) with >1 session.
--   * Avg return interval: mean gap (days) between consecutive active days,
--                          per returning user, averaged across returning users.
--   * Stickiness       : avg(daily active over trailing 30d) / MAU.
--   * Dn retention     : of the cohort whose FIRST session was on day X (lifetime),
--                        % active on day X+n (classic) and on day >= X+n (rolling).
--   * Weekly cohort    : rows = week of first session, cols = weeks-since (W0..W12),
--                        cell = % of cohort active that calendar week.
--
-- TIMEZONE: every calendar bucket is computed in Asia/Bangkok (UTC+7).
-- PARTIAL DAY: today (Bangkok) is excluded from every metric/trend; the effective
--              end day is min(range_end_day, today-1).
--
-- All functions take (range_start timestamptz, range_end timestamptz) and return
-- jsonb. Idempotent: safe to run multiple times.
-- =============================================================================

-- Canonical, de-duplicated per-session view used by every function below.
-- security_invoker = on: the view runs with the *querying* role's RLS, not the
-- creator's. The admin RPCs below are SECURITY DEFINER (run as the owner), so
-- they still read every row; a direct query by anon/authenticated would instead
-- be subject to chat_sessions' RLS. (Resolves Supabase "Security Definer View".)
CREATE OR REPLACE VIEW admin_analytics_sessions
    WITH (security_invoker = on) AS
SELECT
    s.id,
    COALESCE(NULLIF(s.owner_user_id, ''), s.did)            AS actor_key,
    s.owner_user_id,
    s.did,
    s.created_at,
    ((s.created_at AT TIME ZONE 'Asia/Bangkok'))::date      AS day_local,
    EXTRACT(ISODOW FROM (s.created_at AT TIME ZONE 'Asia/Bangkok'))::int AS dow_local, -- 1=Mon..7=Sun
    EXTRACT(HOUR  FROM (s.created_at AT TIME ZONE 'Asia/Bangkok'))::int  AS hour_local,
    GREATEST(EXTRACT(EPOCH FROM (s.updated_at - s.created_at)), 0)::int  AS duration_sec,
    (SELECT count(*) FROM jsonb_array_elements(COALESCE(s.messages, '[]'::jsonb)) m
       WHERE jsonb_typeof(m->'cards') = 'array'
         AND jsonb_array_length(m->'cards') > 0)            AS reading_count,
    EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(s.messages, '[]'::jsonb)) m
       WHERE m->>'role' = 'assistant')                      AS completed,
    (SELECT count(*) FROM jsonb_array_elements(COALESCE(s.messages, '[]'::jsonb)) m
       WHERE m->>'role' = 'user')                           AS question_count,
    jsonb_array_length(COALESCE(s.messages, '[]'::jsonb))   AS message_count
FROM chat_sessions s;


-- ---------------------------------------------------------------------------
-- 1) Returning users
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_analytics_returning(
    p_start timestamptz,
    p_end   timestamptz
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_today date := (now() AT TIME ZONE 'Asia/Bangkok')::date;
    v_start date := (p_start AT TIME ZONE 'Asia/Bangkok')::date;
    v_end   date := LEAST((p_end AT TIME ZONE 'Asia/Bangkok')::date, v_today - 1);
    result  jsonb;
BEGIN
    WITH active AS (
        SELECT actor_key, day_local
        FROM admin_analytics_sessions
        WHERE day_local BETWEEN v_start AND v_end
        GROUP BY actor_key, day_local
    ),
    per_actor AS (
        SELECT actor_key,
               count(*) AS active_days,
               CASE WHEN count(*) > 1
                    THEN (max(day_local) - min(day_local))::numeric / (count(*) - 1)
                    ELSE NULL END AS avg_gap
        FROM active GROUP BY actor_key
    ),
    agg AS (
        SELECT
            count(*) FILTER (WHERE active_days >= 2)        AS returning_users,
            count(*)                                        AS active_users,
            avg(avg_gap) FILTER (WHERE active_days >= 2)    AS avg_return_interval
        FROM per_actor
    ),
    lifetime AS (
        SELECT actor_key, count(*) AS n FROM admin_analytics_sessions GROUP BY actor_key
    ),
    rep AS (
        SELECT count(*) FILTER (WHERE n > 1)::numeric / NULLIF(count(*), 0) AS repeat_rate
        FROM lifetime
    ),
    trend AS (
        SELECT g.d::date AS day,
            (SELECT count(DISTINCT a.actor_key)
               FROM admin_analytics_sessions a
              WHERE a.day_local = g.d::date
                AND EXISTS (SELECT 1 FROM admin_analytics_sessions b
                             WHERE b.actor_key = a.actor_key
                               AND b.day_local < g.d::date)) AS value
        FROM generate_series(v_start::timestamp, v_end::timestamp, interval '1 day') g(d)
    )
    SELECT jsonb_build_object(
        'returningUsers',        COALESCE((SELECT returning_users FROM agg), 0),
        'returnRate',            COALESCE((SELECT returning_users::numeric / NULLIF(active_users, 0) FROM agg), 0),
        'repeatRate',            COALESCE((SELECT repeat_rate FROM rep), 0),
        'avgReturnIntervalDays', COALESCE((SELECT round(avg_return_interval, 2) FROM agg), 0),
        'trend', COALESCE((SELECT jsonb_agg(jsonb_build_object('date', day, 'value', value) ORDER BY day) FROM trend), '[]'::jsonb)
    ) INTO result;
    RETURN result;
END $$;


-- ---------------------------------------------------------------------------
-- 2) Active users (DAU / WAU / MAU / stickiness)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_analytics_active(
    p_start timestamptz,
    p_end   timestamptz
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_today date := (now() AT TIME ZONE 'Asia/Bangkok')::date;
    v_start date := (p_start AT TIME ZONE 'Asia/Bangkok')::date;
    v_end   date := LEAST((p_end AT TIME ZONE 'Asia/Bangkok')::date, v_today - 1);
    v_dau   int;
    v_wau   int;
    v_mau   int;
    v_avg_daily numeric;
    result  jsonb;
BEGIN
    SELECT count(DISTINCT actor_key) INTO v_dau
      FROM admin_analytics_sessions WHERE day_local = v_end;

    SELECT count(DISTINCT actor_key) INTO v_wau
      FROM admin_analytics_sessions WHERE day_local BETWEEN v_end - 6 AND v_end;

    SELECT count(DISTINCT actor_key) INTO v_mau
      FROM admin_analytics_sessions WHERE day_local BETWEEN v_end - 29 AND v_end;

    -- average daily active across the trailing 30-day window (missing days = 0)
    SELECT COALESCE(sum(dau), 0) / 30.0 INTO v_avg_daily
      FROM (
        SELECT day_local, count(DISTINCT actor_key) AS dau
        FROM admin_analytics_sessions
        WHERE day_local BETWEEN v_end - 29 AND v_end
        GROUP BY day_local
      ) d;

    SELECT jsonb_build_object(
        'dau', COALESCE(v_dau, 0),
        'wau', COALESCE(v_wau, 0),
        'mau', COALESCE(v_mau, 0),
        'stickiness', CASE WHEN COALESCE(v_mau,0) > 0 THEN round(v_avg_daily / v_mau, 4) ELSE 0 END,
        'trend', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('date', day, 'value', value) ORDER BY day)
            FROM (
                SELECT g.d::date AS day,
                    (SELECT count(DISTINCT a.actor_key) FROM admin_analytics_sessions a
                      WHERE a.day_local = g.d::date) AS value
                FROM generate_series(v_start::timestamp, v_end::timestamp, interval '1 day') g(d)
            ) t
        ), '[]'::jsonb)
    ) INTO result;
    RETURN result;
END $$;


-- ---------------------------------------------------------------------------
-- 3) Reading behaviour (readings = card-draw events)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_analytics_reading(
    p_start timestamptz,
    p_end   timestamptz
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_today date := (now() AT TIME ZONE 'Asia/Bangkok')::date;
    v_start date := (p_start AT TIME ZONE 'Asia/Bangkok')::date;
    v_end   date := LEAST((p_end AT TIME ZONE 'Asia/Bangkok')::date, v_today - 1);
    result  jsonb;
BEGIN
    WITH in_range AS (
        SELECT actor_key, reading_count
        FROM admin_analytics_sessions
        WHERE day_local BETWEEN v_start AND v_end
    ),
    per_actor AS (
        SELECT actor_key, sum(reading_count) AS readings
        FROM in_range GROUP BY actor_key
    )
    SELECT jsonb_build_object(
        'total',     COALESCE((SELECT sum(reading_count) FROM in_range), 0),
        'avgPerUser',COALESCE((SELECT round(avg(readings), 2) FROM per_actor WHERE readings > 0), 0),
        'median',    COALESCE((SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY readings)
                               FROM per_actor WHERE readings > 0), 0),
        'distribution', jsonb_build_object(
            'one',       COALESCE((SELECT count(*) FROM per_actor WHERE readings = 1), 0),
            'twoToFive', COALESCE((SELECT count(*) FROM per_actor WHERE readings BETWEEN 2 AND 5), 0),
            'sixPlus',   COALESCE((SELECT count(*) FROM per_actor WHERE readings >= 6), 0)
        ),
        'trend', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('date', day, 'value', value) ORDER BY day)
            FROM (
                SELECT g.d::date AS day,
                    (SELECT COALESCE(sum(reading_count), 0) FROM admin_analytics_sessions a
                      WHERE a.day_local = g.d::date) AS value
                FROM generate_series(v_start::timestamp, v_end::timestamp, interval '1 day') g(d)
            ) t
        ), '[]'::jsonb)
    ) INTO result;
    RETURN result;
END $$;


-- ---------------------------------------------------------------------------
-- 4) Engagement (sessions / messages / questions / duration[noisy])
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_analytics_engagement(
    p_start timestamptz,
    p_end   timestamptz
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_today date := (now() AT TIME ZONE 'Asia/Bangkok')::date;
    v_start date := (p_start AT TIME ZONE 'Asia/Bangkok')::date;
    v_end   date := LEAST((p_end AT TIME ZONE 'Asia/Bangkok')::date, v_today - 1);
    result  jsonb;
BEGIN
    WITH in_range AS (
        SELECT * FROM admin_analytics_sessions
        WHERE day_local BETWEEN v_start AND v_end
    )
    SELECT jsonb_build_object(
        'totalSessions',           COALESCE((SELECT count(*) FROM in_range), 0),
        'totalMessages',           COALESCE((SELECT sum(message_count) FROM in_range), 0),
        'avgQuestionsPerSession',  COALESCE((SELECT round(avg(question_count), 2) FROM in_range), 0),
        -- duration is a noisy proxy (updated_at - created_at); not a headline.
        'avgSessionDurationSec',   COALESCE((SELECT round(avg(duration_sec)) FROM in_range), 0),
        'trend', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('date', day, 'value', value) ORDER BY day)
            FROM (
                SELECT g.d::date AS day,
                    (SELECT count(*) FROM admin_analytics_sessions a
                      WHERE a.day_local = g.d::date) AS value
                FROM generate_series(v_start::timestamp, v_end::timestamp, interval '1 day') g(d)
            ) t
        ), '[]'::jsonb)
    ) INTO result;
    RETURN result;
END $$;


-- ---------------------------------------------------------------------------
-- 5) Retention (Dn classic + rolling, curve 0..30, weekly cohort grid W0..W12)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_analytics_retention(
    p_start timestamptz,
    p_end   timestamptz
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_today date := (now() AT TIME ZONE 'Asia/Bangkok')::date;
    v_start date := (p_start AT TIME ZONE 'Asia/Bangkok')::date;
    v_end   date := LEAST((p_end AT TIME ZONE 'Asia/Bangkok')::date, v_today - 1);
    result  jsonb;
BEGIN
    WITH
    -- lifetime first-session day per actor, and the set of distinct active days
    first_seen AS (
        SELECT actor_key, min(day_local) AS f
        FROM admin_analytics_sessions GROUP BY actor_key
    ),
    days AS (
        SELECT DISTINCT actor_key, day_local FROM admin_analytics_sessions
    ),
    curve AS (
        SELECT n,
            (SELECT count(*) FROM first_seen fr
              WHERE fr.f BETWEEN v_start AND v_end - n) AS cohort_size,
            (SELECT count(*) FROM first_seen fr
              WHERE fr.f BETWEEN v_start AND v_end - n
                AND EXISTS (SELECT 1 FROM days d WHERE d.actor_key = fr.actor_key AND d.day_local = fr.f + n)) AS classic_hit,
            (SELECT count(*) FROM first_seen fr
              WHERE fr.f BETWEEN v_start AND v_end - n
                AND EXISTS (SELECT 1 FROM days d WHERE d.actor_key = fr.actor_key AND d.day_local >= fr.f + n)) AS rolling_hit
        FROM generate_series(0, 30) g(n)
    ),
    curve_rate AS (
        SELECT n,
               cohort_size,
               CASE WHEN cohort_size > 0 THEN round(classic_hit::numeric / cohort_size, 4) ELSE NULL END AS classic,
               CASE WHEN cohort_size > 0 THEN round(rolling_hit::numeric / cohort_size, 4) ELSE NULL END AS rolling
        FROM curve
    ),
    -- weekly cohort grid: cohort = ISO week of first session (Bangkok)
    cohort_actor AS (
        SELECT actor_key, date_trunc('week', f::timestamp)::date AS cohort_week
        FROM first_seen WHERE f BETWEEN v_start AND v_end
    ),
    cohort_size AS (
        SELECT cohort_week, count(*) AS size FROM cohort_actor GROUP BY cohort_week
    ),
    actor_week AS (
        SELECT DISTINCT actor_key, date_trunc('week', day_local::timestamp)::date AS active_week
        FROM admin_analytics_sessions
    ),
    grid AS (
        SELECT cs.cohort_week,
               cs.size,
               wk.n AS week_offset,
               (SELECT count(*) FROM cohort_actor ca
                  JOIN actor_week aw ON aw.actor_key = ca.actor_key
                 WHERE ca.cohort_week = cs.cohort_week
                   AND aw.active_week = cs.cohort_week + (wk.n * 7)) AS active
        FROM cohort_size cs
        CROSS JOIN generate_series(0, 12) wk(n)
        -- only offsets whose week could have completed by v_end
        WHERE cs.cohort_week + (wk.n * 7) <= v_end
    ),
    cohorts AS (
        SELECT cohort_week, size,
               jsonb_agg(jsonb_build_object(
                   'n', week_offset,
                   'rate', CASE WHEN size > 0 THEN round(active::numeric / size, 4) ELSE 0 END
               ) ORDER BY week_offset) AS weeks
        FROM grid GROUP BY cohort_week, size
    )
    SELECT jsonb_build_object(
        'd1',  COALESCE((SELECT classic FROM curve_rate WHERE n = 1), 0),
        'd7',  COALESCE((SELECT classic FROM curve_rate WHERE n = 7), 0),
        'd30', COALESCE((SELECT classic FROM curve_rate WHERE n = 30), 0),
        'rollingD1',  COALESCE((SELECT rolling FROM curve_rate WHERE n = 1), 0),
        'rollingD7',  COALESCE((SELECT rolling FROM curve_rate WHERE n = 7), 0),
        'rollingD30', COALESCE((SELECT rolling FROM curve_rate WHERE n = 30), 0),
        'curve', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('day', n, 'rate', classic, 'rolling', rolling) ORDER BY n)
            FROM curve_rate), '[]'::jsonb),
        'cohorts', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('week', cohort_week, 'size', size, 'weeks', weeks) ORDER BY cohort_week)
            FROM cohorts), '[]'::jsonb)
    ) INTO result;
    RETURN result;
END $$;


-- ---------------------------------------------------------------------------
-- 6) Conversion funnel: Started -> Completed -> Registered -> Subscribed
--    (actor-based; Visitor stage intentionally omitted — no traffic tracking)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_analytics_conversion(
    p_start timestamptz,
    p_end   timestamptz
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_today date := (now() AT TIME ZONE 'Asia/Bangkok')::date;
    v_start date := (p_start AT TIME ZONE 'Asia/Bangkok')::date;
    v_end   date := LEAST((p_end AT TIME ZONE 'Asia/Bangkok')::date, v_today - 1);
    v_started    int;
    v_completed  int;
    v_registered int;
    v_subscribed int;
    result jsonb;
BEGIN
    SELECT count(DISTINCT actor_key) INTO v_started
      FROM admin_analytics_sessions WHERE day_local BETWEEN v_start AND v_end;

    SELECT count(DISTINCT actor_key) INTO v_completed
      FROM admin_analytics_sessions WHERE day_local BETWEEN v_start AND v_end AND completed;

    -- registered = of the actors above, those who are logged-in users
    SELECT count(DISTINCT owner_user_id) INTO v_registered
      FROM admin_analytics_sessions
     WHERE day_local BETWEEN v_start AND v_end AND owner_user_id IS NOT NULL;

    -- subscribed = those registered actors that have any subscription row
    SELECT count(DISTINCT s.owner_user_id) INTO v_subscribed
      FROM admin_analytics_sessions s
      JOIN billing_subscriptions bs ON bs.user_id::text = s.owner_user_id
     WHERE s.day_local BETWEEN v_start AND v_end AND s.owner_user_id IS NOT NULL;

    SELECT jsonb_build_object('stages', jsonb_build_array(
        jsonb_build_object('key','started',    'count', COALESCE(v_started,0),    'pct', 1.0),
        jsonb_build_object('key','completed',  'count', COALESCE(v_completed,0),  'pct', CASE WHEN v_started>0 THEN round(v_completed::numeric/v_started,4) ELSE 0 END),
        jsonb_build_object('key','registered', 'count', COALESCE(v_registered,0), 'pct', CASE WHEN v_started>0 THEN round(v_registered::numeric/v_started,4) ELSE 0 END),
        jsonb_build_object('key','subscribed', 'count', COALESCE(v_subscribed,0), 'pct', CASE WHEN v_started>0 THEN round(v_subscribed::numeric/v_started,4) ELSE 0 END)
    )) INTO result;
    RETURN result;
END $$;


-- ---------------------------------------------------------------------------
-- Permissions: callable by the service role (admin API uses the service key).
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION admin_analytics_returning(timestamptz, timestamptz)  TO service_role;
GRANT EXECUTE ON FUNCTION admin_analytics_active(timestamptz, timestamptz)      TO service_role;
GRANT EXECUTE ON FUNCTION admin_analytics_reading(timestamptz, timestamptz)     TO service_role;
GRANT EXECUTE ON FUNCTION admin_analytics_engagement(timestamptz, timestamptz)  TO service_role;
GRANT EXECUTE ON FUNCTION admin_analytics_retention(timestamptz, timestamptz)   TO service_role;
GRANT EXECUTE ON FUNCTION admin_analytics_conversion(timestamptz, timestamptz)  TO service_role;
