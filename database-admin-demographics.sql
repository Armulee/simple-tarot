-- =============================================================================
-- Admin demographics RPC — AskingFate
-- =============================================================================
-- Who the users are, from what they have already told us. Nothing here is
-- inferred: every field is one the person entered themselves.
--
--   * Age      : profiles.birth_date for signed-in users, else the birth date on
--                a birth_charts row — which anonymous visitors have too, so age
--                coverage reaches well past the profiles table.
--   * Location : birth_charts.country, else the last comma-part of
--                profiles.birth_place (stored free-text as "State, Country" or
--                just "Country").
--   * Gender   : profiles.gender only. Signed-in users are the only ones ever
--                asked, so this is reported against signed-in users, not actors.
--
-- ACTOR: COALESCE(owner_user_id, did), the identity the rest of the admin
-- analytics uses — signed-in people merge by user id, guests by device.
--
-- p_exclude_owners: user ids whose rows don't count (the `admins` table — admins
-- are the ones testing). NULL / empty array excludes nobody.
--
-- Every bucket carries its own count and the payload carries the totals it was
-- computed from, so the dashboard can show "of the N we know" rather than
-- implying the whole userbase answered.
--
-- Idempotent: safe to run multiple times.
-- =============================================================================

-- birth_charts stores day/month/year as loose integers, so combinations that
-- are not real dates (31 February, day 0) do occur. make_date() raises on those
-- and would abort the whole report, and an inline guard is not enough — nothing
-- stops the planner evaluating make_date() before the guard in the same AND.
-- Catching it per row is the reliable form; the table is small.
CREATE OR REPLACE FUNCTION admin_safe_date(p_year int, p_month int, p_day int)
RETURNS date
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
BEGIN
    RETURN make_date(p_year, p_month, p_day);
EXCEPTION WHEN others THEN
    RETURN NULL;
END $$;

DROP FUNCTION IF EXISTS admin_analytics_demographics(text[]);

CREATE OR REPLACE FUNCTION admin_analytics_demographics(
    p_exclude_owners text[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_today date := (now() AT TIME ZONE 'Asia/Bangkok')::date;
    -- `x <> ALL ('{}')` is true, so an empty list excludes nobody.
    v_exclude text[] := COALESCE(p_exclude_owners, ARRAY[]::text[]);
    result  jsonb;
BEGIN
    WITH
    -- One row per actor with whatever birth date / country we hold.
    -- Birth charts cover guests; profiles cover signed-in users and win on
    -- conflict, being the thing the person maintains about themselves.
    from_charts AS (
        SELECT
            COALESCE(NULLIF(b.owner_user_id, ''), b.did) AS actor_key,
            b.owner_user_id,
            admin_safe_date(b.year, b.month, b.day) AS birth_date,
            NULLIF(btrim(b.country), '') AS country
        FROM birth_charts b
    ),
    charts_per_actor AS (
        SELECT actor_key,
               max(owner_user_id)                     AS owner_user_id,
               (array_agg(birth_date) FILTER (WHERE birth_date IS NOT NULL))[1] AS birth_date,
               (array_agg(country)    FILTER (WHERE country    IS NOT NULL))[1] AS country
        FROM from_charts
        WHERE actor_key IS NOT NULL
        GROUP BY actor_key
    ),
    from_profiles AS (
        SELECT
            p.id::text        AS actor_key,
            p.birth_date,
            NULLIF(btrim(p.gender), '') AS gender,
            -- "State, Country" / "Country" -> country
            NULLIF(btrim(split_part(p.birth_place, ',',
                array_length(string_to_array(p.birth_place, ','), 1))), '') AS country
        FROM profiles p
    ),
    -- Actors we know anything at all about, profile values preferred.
    actors AS (
        SELECT
            COALESCE(pr.actor_key, ch.actor_key)      AS actor_key,
            COALESCE(pr.birth_date, ch.birth_date)    AS birth_date,
            COALESCE(pr.country, ch.country)          AS country,
            pr.gender                                 AS gender,
            (pr.actor_key IS NOT NULL)                AS is_registered
        FROM from_profiles pr
        FULL OUTER JOIN charts_per_actor ch ON ch.actor_key = pr.actor_key
        WHERE COALESCE(pr.actor_key, ch.actor_key) <> ALL (v_exclude)
    ),
    aged AS (
        SELECT *,
               CASE WHEN birth_date IS NOT NULL
                         AND birth_date <= v_today
                         AND birth_date > v_today - interval '120 years'
                    THEN EXTRACT(YEAR FROM age(v_today, birth_date))::int
               END AS age_years
        FROM actors
    ),
    age_buckets AS (
        SELECT b.key, b.ord, count(a.actor_key) AS count
        FROM (VALUES
            ('under18', 1, 0,   17),
            ('18to24',  2, 18,  24),
            ('25to34',  3, 25,  34),
            ('35to44',  4, 35,  44),
            ('45to54',  5, 45,  54),
            ('55to64',  6, 55,  64),
            ('65plus',  7, 65, 200)
        ) AS b(key, ord, lo, hi)
        LEFT JOIN aged a
               ON a.age_years BETWEEN b.lo AND b.hi
        GROUP BY b.key, b.ord
    ),
    -- Only the four options the profile form offers are named; anything else
    -- (e.g. a value enriched from Google) lands in "other".
    gendered AS (
        SELECT CASE
                   WHEN lower(gender) IN ('male', 'female', 'non-binary',
                                          'prefer-not-to-say')
                        THEN lower(gender)
                   WHEN gender IS NOT NULL THEN 'other'
                   ELSE 'unknown'
               END AS key
        FROM aged WHERE is_registered
    ),
    gender_buckets AS (
        SELECT g.key, g.ord, count(x.key) AS count
        FROM (VALUES
            ('male', 1), ('female', 2), ('non-binary', 3),
            ('prefer-not-to-say', 4), ('other', 5), ('unknown', 6)
        ) AS g(key, ord)
        LEFT JOIN gendered x ON x.key = g.key
        GROUP BY g.key, g.ord
    ),
    countries AS (
        SELECT country, count(*) AS count
        FROM aged WHERE country IS NOT NULL
        GROUP BY country ORDER BY count DESC, country LIMIT 15
    )
    SELECT jsonb_build_object(
        'actors',        (SELECT count(*) FROM aged),
        'registered',    (SELECT count(*) FROM aged WHERE is_registered),
        'age', jsonb_build_object(
            'known',   (SELECT count(*) FROM aged WHERE age_years IS NOT NULL),
            'unknown', (SELECT count(*) FROM aged WHERE age_years IS NULL),
            'median',  (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY age_years)
                          FROM aged WHERE age_years IS NOT NULL),
            'buckets', COALESCE((SELECT jsonb_agg(jsonb_build_object('key', key, 'count', count)
                                                  ORDER BY ord) FROM age_buckets), '[]'::jsonb)
        ),
        'gender', jsonb_build_object(
            'known',   (SELECT count(*) FROM gendered WHERE key <> 'unknown'),
            'unknown', (SELECT count(*) FROM gendered WHERE key =  'unknown'),
            'buckets', COALESCE((SELECT jsonb_agg(jsonb_build_object('key', key, 'count', count)
                                                  ORDER BY ord) FROM gender_buckets), '[]'::jsonb)
        ),
        'location', jsonb_build_object(
            'known',   (SELECT count(*) FROM aged WHERE country IS NOT NULL),
            'unknown', (SELECT count(*) FROM aged WHERE country IS NULL),
            'distinct',(SELECT count(DISTINCT country) FROM aged WHERE country IS NOT NULL),
            'top', COALESCE((SELECT jsonb_agg(jsonb_build_object('country', country, 'count', count))
                               FROM countries), '[]'::jsonb)
        )
    ) INTO result;
    RETURN result;
END $$;

-- Callable by the service role (the admin API uses the service key).
GRANT EXECUTE ON FUNCTION admin_safe_date(int, int, int)             TO service_role;
GRANT EXECUTE ON FUNCTION admin_analytics_demographics(text[])       TO service_role;
