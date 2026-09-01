-- =============================================================================
-- Admin demographics RPC — AskingFate
-- =============================================================================
-- Who the users are, from what they have already told us. Nothing here is
-- inferred: every field is one the person entered themselves.
--
--   * Age      : profiles.birth_date for signed-in users, else the birth date on
--                a birth_charts row — which anonymous visitors have too, so age
--                coverage reaches well past the profiles table.
--   * Location : birth_charts.country (chosen from a country picker), else
--                profiles.birth_place. That column is written in two different
--                orders by two different screens, so no position is assumed:
--                each comma part is checked against a real country list and the
--                one that IS a country wins. A province is never a country here.
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

-- ---------------------------------------------------------------------------
-- Country reference, so a place name can be *checked* rather than assumed.
--
-- profiles.birth_place is a free-text box: people type "Bangkok", "Bangkok,
-- Thailand", "TH", "กรุงเทพ". Taking the last comma-part on faith turns a
-- province into a "country", which is exactly the bug this guards against —
-- a string that is not a country resolves to NULL and counts as unknown.
--
-- Generated from the `country-state-city` package the app already ships
-- (Country.getAllCountries(), 250 entries), so the admin list and the pickers
-- users choose from stay the same set.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_countries (
    name text PRIMARY KEY,
    iso2 text NOT NULL
);

INSERT INTO admin_countries (name, iso2) VALUES
    ('Afghanistan', 'AF'),
    ('Aland Islands', 'AX'),
    ('Albania', 'AL'),
    ('Algeria', 'DZ'),
    ('American Samoa', 'AS'),
    ('Andorra', 'AD'),
    ('Angola', 'AO'),
    ('Anguilla', 'AI'),
    ('Antarctica', 'AQ'),
    ('Antigua And Barbuda', 'AG'),
    ('Argentina', 'AR'),
    ('Armenia', 'AM'),
    ('Aruba', 'AW'),
    ('Australia', 'AU'),
    ('Austria', 'AT'),
    ('Azerbaijan', 'AZ'),
    ('The Bahamas', 'BS'),
    ('Bahrain', 'BH'),
    ('Bangladesh', 'BD'),
    ('Barbados', 'BB'),
    ('Belarus', 'BY'),
    ('Belgium', 'BE'),
    ('Belize', 'BZ'),
    ('Benin', 'BJ'),
    ('Bermuda', 'BM'),
    ('Bhutan', 'BT'),
    ('Bolivia', 'BO'),
    ('Bosnia and Herzegovina', 'BA'),
    ('Botswana', 'BW'),
    ('Bouvet Island', 'BV'),
    ('Brazil', 'BR'),
    ('British Indian Ocean Territory', 'IO'),
    ('Brunei', 'BN'),
    ('Bulgaria', 'BG'),
    ('Burkina Faso', 'BF'),
    ('Burundi', 'BI'),
    ('Cambodia', 'KH'),
    ('Cameroon', 'CM'),
    ('Canada', 'CA'),
    ('Cape Verde', 'CV'),
    ('Cayman Islands', 'KY'),
    ('Central African Republic', 'CF'),
    ('Chad', 'TD'),
    ('Chile', 'CL'),
    ('China', 'CN'),
    ('Christmas Island', 'CX'),
    ('Cocos (Keeling) Islands', 'CC'),
    ('Colombia', 'CO'),
    ('Comoros', 'KM'),
    ('Congo', 'CG'),
    ('Democratic Republic of the Congo', 'CD'),
    ('Cook Islands', 'CK'),
    ('Costa Rica', 'CR'),
    ('Cote D''Ivoire (Ivory Coast)', 'CI'),
    ('Croatia', 'HR'),
    ('Cuba', 'CU'),
    ('Cyprus', 'CY'),
    ('Czech Republic', 'CZ'),
    ('Denmark', 'DK'),
    ('Djibouti', 'DJ'),
    ('Dominica', 'DM'),
    ('Dominican Republic', 'DO'),
    ('East Timor', 'TL'),
    ('Ecuador', 'EC'),
    ('Egypt', 'EG'),
    ('El Salvador', 'SV'),
    ('Equatorial Guinea', 'GQ'),
    ('Eritrea', 'ER'),
    ('Estonia', 'EE'),
    ('Ethiopia', 'ET'),
    ('Falkland Islands', 'FK'),
    ('Faroe Islands', 'FO'),
    ('Fiji Islands', 'FJ'),
    ('Finland', 'FI'),
    ('France', 'FR'),
    ('French Guiana', 'GF'),
    ('French Polynesia', 'PF'),
    ('French Southern Territories', 'TF'),
    ('Gabon', 'GA'),
    ('The Gambia', 'GM'),
    ('Georgia', 'GE'),
    ('Germany', 'DE'),
    ('Ghana', 'GH'),
    ('Gibraltar', 'GI'),
    ('Greece', 'GR'),
    ('Greenland', 'GL'),
    ('Grenada', 'GD'),
    ('Guadeloupe', 'GP'),
    ('Guam', 'GU'),
    ('Guatemala', 'GT'),
    ('Guernsey and Alderney', 'GG'),
    ('Guinea', 'GN'),
    ('Guinea-Bissau', 'GW'),
    ('Guyana', 'GY'),
    ('Haiti', 'HT'),
    ('Heard Island and McDonald Islands', 'HM'),
    ('Honduras', 'HN'),
    ('Hong Kong S.A.R.', 'HK'),
    ('Hungary', 'HU'),
    ('Iceland', 'IS'),
    ('India', 'IN'),
    ('Indonesia', 'ID'),
    ('Iran', 'IR'),
    ('Iraq', 'IQ'),
    ('Ireland', 'IE'),
    ('Israel', 'IL'),
    ('Italy', 'IT'),
    ('Jamaica', 'JM'),
    ('Japan', 'JP'),
    ('Jersey', 'JE'),
    ('Jordan', 'JO'),
    ('Kazakhstan', 'KZ'),
    ('Kenya', 'KE'),
    ('Kiribati', 'KI'),
    ('North Korea', 'KP'),
    ('South Korea', 'KR'),
    ('Kuwait', 'KW'),
    ('Kyrgyzstan', 'KG'),
    ('Laos', 'LA'),
    ('Latvia', 'LV'),
    ('Lebanon', 'LB'),
    ('Lesotho', 'LS'),
    ('Liberia', 'LR'),
    ('Libya', 'LY'),
    ('Liechtenstein', 'LI'),
    ('Lithuania', 'LT'),
    ('Luxembourg', 'LU'),
    ('Macau S.A.R.', 'MO'),
    ('Macedonia', 'MK'),
    ('Madagascar', 'MG'),
    ('Malawi', 'MW'),
    ('Malaysia', 'MY'),
    ('Maldives', 'MV'),
    ('Mali', 'ML'),
    ('Malta', 'MT'),
    ('Man (Isle of)', 'IM'),
    ('Marshall Islands', 'MH'),
    ('Martinique', 'MQ'),
    ('Mauritania', 'MR'),
    ('Mauritius', 'MU'),
    ('Mayotte', 'YT'),
    ('Mexico', 'MX'),
    ('Micronesia', 'FM'),
    ('Moldova', 'MD'),
    ('Monaco', 'MC'),
    ('Mongolia', 'MN'),
    ('Montenegro', 'ME'),
    ('Montserrat', 'MS'),
    ('Morocco', 'MA'),
    ('Mozambique', 'MZ'),
    ('Myanmar', 'MM'),
    ('Namibia', 'NA'),
    ('Nauru', 'NR'),
    ('Nepal', 'NP'),
    ('Bonaire, Sint Eustatius and Saba', 'BQ'),
    ('Netherlands', 'NL'),
    ('New Caledonia', 'NC'),
    ('New Zealand', 'NZ'),
    ('Nicaragua', 'NI'),
    ('Niger', 'NE'),
    ('Nigeria', 'NG'),
    ('Niue', 'NU'),
    ('Norfolk Island', 'NF'),
    ('Northern Mariana Islands', 'MP'),
    ('Norway', 'NO'),
    ('Oman', 'OM'),
    ('Pakistan', 'PK'),
    ('Palau', 'PW'),
    ('Palestinian Territory Occupied', 'PS'),
    ('Panama', 'PA'),
    ('Papua new Guinea', 'PG'),
    ('Paraguay', 'PY'),
    ('Peru', 'PE'),
    ('Philippines', 'PH'),
    ('Pitcairn Island', 'PN'),
    ('Poland', 'PL'),
    ('Portugal', 'PT'),
    ('Puerto Rico', 'PR'),
    ('Qatar', 'QA'),
    ('Reunion', 'RE'),
    ('Romania', 'RO'),
    ('Russia', 'RU'),
    ('Rwanda', 'RW'),
    ('Saint Helena', 'SH'),
    ('Saint Kitts And Nevis', 'KN'),
    ('Saint Lucia', 'LC'),
    ('Saint Pierre and Miquelon', 'PM'),
    ('Saint Vincent And The Grenadines', 'VC'),
    ('Saint-Barthelemy', 'BL'),
    ('Saint-Martin (French part)', 'MF'),
    ('Samoa', 'WS'),
    ('San Marino', 'SM'),
    ('Sao Tome and Principe', 'ST'),
    ('Saudi Arabia', 'SA'),
    ('Senegal', 'SN'),
    ('Serbia', 'RS'),
    ('Seychelles', 'SC'),
    ('Sierra Leone', 'SL'),
    ('Singapore', 'SG'),
    ('Slovakia', 'SK'),
    ('Slovenia', 'SI'),
    ('Solomon Islands', 'SB'),
    ('Somalia', 'SO'),
    ('South Africa', 'ZA'),
    ('South Georgia', 'GS'),
    ('South Sudan', 'SS'),
    ('Spain', 'ES'),
    ('Sri Lanka', 'LK'),
    ('Sudan', 'SD'),
    ('Suriname', 'SR'),
    ('Svalbard And Jan Mayen Islands', 'SJ'),
    ('Swaziland', 'SZ'),
    ('Sweden', 'SE'),
    ('Switzerland', 'CH'),
    ('Syria', 'SY'),
    ('Taiwan', 'TW'),
    ('Tajikistan', 'TJ'),
    ('Tanzania', 'TZ'),
    ('Thailand', 'TH'),
    ('Togo', 'TG'),
    ('Tokelau', 'TK'),
    ('Tonga', 'TO'),
    ('Trinidad And Tobago', 'TT'),
    ('Tunisia', 'TN'),
    ('Turkey', 'TR'),
    ('Turkmenistan', 'TM'),
    ('Turks And Caicos Islands', 'TC'),
    ('Tuvalu', 'TV'),
    ('Uganda', 'UG'),
    ('Ukraine', 'UA'),
    ('United Arab Emirates', 'AE'),
    ('United Kingdom', 'GB'),
    ('United States', 'US'),
    ('United States Minor Outlying Islands', 'UM'),
    ('Uruguay', 'UY'),
    ('Uzbekistan', 'UZ'),
    ('Vanuatu', 'VU'),
    ('Vatican City State (Holy See)', 'VA'),
    ('Venezuela', 'VE'),
    ('Vietnam', 'VN'),
    ('Virgin Islands (British)', 'VG'),
    ('Virgin Islands (US)', 'VI'),
    ('Wallis And Futuna Islands', 'WF'),
    ('Western Sahara', 'EH'),
    ('Yemen', 'YE'),
    ('Zambia', 'ZM'),
    ('Zimbabwe', 'ZW'),
    ('Kosovo', 'XK'),
    ('Curaçao', 'CW'),
    ('Sint Maarten (Dutch part)', 'SX')
ON CONFLICT (name) DO UPDATE SET iso2 = EXCLUDED.iso2;

CREATE INDEX IF NOT EXISTS idx_admin_countries_lower_name
    ON admin_countries (lower(name));
CREATE INDEX IF NOT EXISTS idx_admin_countries_iso2
    ON admin_countries (lower(iso2));

-- Spellings the reference list does not carry. Thai first: most of this
-- userbase types their own country in Thai, and dropping those would
-- understate the one country we have most of.
CREATE TABLE IF NOT EXISTS admin_country_aliases (
    alias text PRIMARY KEY,
    name  text NOT NULL
);

INSERT INTO admin_country_aliases (alias, name) VALUES
    ('ไทย', 'Thailand'),
    ('ประเทศไทย', 'Thailand'),
    ('เมืองไทย', 'Thailand'),
    ('siam', 'Thailand'),
    ('usa', 'United States'),
    ('u.s.a.', 'United States'),
    ('us', 'United States'),
    ('united states of america', 'United States'),
    ('uk', 'United Kingdom'),
    ('u.k.', 'United Kingdom'),
    ('great britain', 'United Kingdom'),
    ('england', 'United Kingdom'),
    ('scotland', 'United Kingdom'),
    ('wales', 'United Kingdom'),
    ('uae', 'United Arab Emirates')
ON CONFLICT (alias) DO UPDATE SET name = EXCLUDED.name;

/**
 * Canonical country name for a free-text place, or NULL if it isn't one.
 * Matches a full country name, an ISO2 code, or a known alias.
 */
CREATE OR REPLACE FUNCTION admin_resolve_country(p_text text)
RETURNS text
LANGUAGE sql STABLE SET search_path = public AS $$
    WITH needle AS (SELECT lower(btrim(COALESCE(p_text, ''))) AS v)
    SELECT COALESCE(
        (SELECT c.name FROM admin_countries c, needle n
          WHERE lower(c.name) = n.v LIMIT 1),
        -- Joined back to admin_countries so an alias can only ever resolve to
        -- a name that really is in the reference list.
        (SELECT c.name FROM admin_country_aliases a
           JOIN admin_countries c ON c.name = a.name, needle n
          WHERE a.alias = n.v LIMIT 1),
        -- ISO2 last: two letters are a plausible abbreviation, but by this
        -- point nothing else has matched.
        (SELECT c.name FROM admin_countries c, needle n
          WHERE length(n.v) = 2 AND lower(c.iso2) = n.v LIMIT 1)
    )
    WHERE (SELECT v FROM needle) <> ''
$$;

/**
 * Country out of a free-text place string, whichever position it sits in.
 *
 * birth_place has two writers with opposite conventions: the age-gate consent
 * modal saves "Country, Province" (star-consent.tsx) while the birth-chart and
 * astrology forms save "Province, Country". Picking a position would silently
 * mislabel every row the other one wrote — which is exactly how provinces ended
 * up in this report. So try each part and keep the one that IS a country.
 */
CREATE OR REPLACE FUNCTION admin_place_country(p_place text)
RETURNS text
LANGUAGE sql STABLE SET search_path = public AS $$
    SELECT COALESCE(
        -- Whole string first: a few country names contain a comma themselves
        -- ("Bonaire, Sint Eustatius and Saba"), and splitting would lose them.
        admin_resolve_country(p_place),
        (SELECT c FROM (
            SELECT admin_resolve_country(part) AS c
              FROM unnest(string_to_array(COALESCE(p_place, ''), ',')) AS part
         ) x
         WHERE c IS NOT NULL
         LIMIT 1)
    )
$$;

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
            admin_resolve_country(b.country) AS country
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
            admin_place_country(p.birth_place) AS country
        FROM profiles p
    ),
    -- Actors we know anything at all about. Profile values win for birth date
    -- (the person maintains it), but NOT for country: birth_charts.country
    -- comes from a country picker, while birth_place is a free-text box that
    -- most often holds a city. The structured value is the better one.
    actors AS (
        SELECT
            COALESCE(pr.actor_key, ch.actor_key)      AS actor_key,
            COALESCE(pr.birth_date, ch.birth_date)    AS birth_date,
            COALESCE(ch.country, pr.country)          AS country,
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
GRANT EXECUTE ON FUNCTION admin_resolve_country(text)                TO service_role;
GRANT EXECUTE ON FUNCTION admin_place_country(text)                  TO service_role;
GRANT EXECUTE ON FUNCTION admin_analytics_demographics(text[])       TO service_role;
