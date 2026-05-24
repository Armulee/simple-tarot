import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { supabaseAdmin } from "@/lib/supabase"
import { readAndVerifyDid } from "@/lib/server/did"
import { calculateSwissEphChart } from "@/lib/astrology/swisseph"
import {
    profileToHoroscopeBirthData,
    hasHoroscopeBirthDate,
    applyEphemerisLocationTimeDefaults,
} from "@/lib/horoscope-profile-birth"
import type { ProfileBirthFields } from "@/lib/horoscope-profile-birth"
import { resolveLocationFromCountryState } from "@/lib/location"

type BirthChartRow = {
    id: string
    did: string | null
    owner_user_id: string | null
    day: number
    month: number
    year: number
    hour: number
    minute: number
    timezone: number
    lat: number
    lng: number
    country: string | null
    state_province: string | null
    houses: unknown
    planets: unknown
    created_at: string
    updated_at: string
}

function parseJsonField(value: unknown): unknown {
    if (typeof value !== "string") return value
    try {
        return JSON.parse(value)
    } catch {
        return value
    }
}

function normalizeChart(row: BirthChartRow) {
    return {
        ...row,
        houses: parseJsonField(row.houses),
        planets: parseJsonField(row.planets),
    }
}

const WHOLE_SIGN_TOLERANCE_DEG = 0.05

/**
 * Vedic charts are now computed with the WHOLE-SIGN house system, where
 * every house begins exactly on a sign boundary (0° / 30° / 60° / …).
 * Returns true when the stored cusps look like whole-sign (the cusp degree
 * is ~0 and consecutive cusps are 30° apart in longitude); false when the
 * stored data was saved by the old Placidus default and needs a refresh.
 *
 * We use this to transparently backfill stored `birth_charts` rows on read
 * so existing users see the corrected 2nd / 10th-house labels without
 * having to manually re-save their chart.
 */
function looksLikeWholeSignHouses(houses: unknown): boolean {
    if (!houses || typeof houses !== "object") return false
    const record = houses as Record<string, unknown>
    for (let i = 1; i <= 12; i++) {
        const entry = record[String(i)]
        if (!entry || typeof entry !== "object") return false
        const point = entry as { degree?: unknown; longitude?: unknown }
        const degree = typeof point.degree === "number" ? point.degree : NaN
        if (
            !Number.isFinite(degree) ||
            Math.abs(degree) > WHOLE_SIGN_TOLERANCE_DEG
        ) {
            return false
        }
    }
    return true
}

async function recomputeChartForRow(
    row: BirthChartRow,
): Promise<BirthChartRow | null> {
    if (!supabaseAdmin) return null
    if (
        !Number.isFinite(row.day) ||
        !Number.isFinite(row.month) ||
        !Number.isFinite(row.year)
    ) {
        return null
    }
    const chart = await calculateSwissEphChart(
        {
            year: row.year,
            month: row.month,
            day: row.day,
            hour: Number.isFinite(row.hour) ? row.hour : 12,
            minute: Number.isFinite(row.minute) ? row.minute : 0,
            timezone: Number.isFinite(row.timezone) ? row.timezone : 0,
            lat: Number.isFinite(row.lat) ? row.lat : 0,
            lng: Number.isFinite(row.lng) ? row.lng : 0,
        },
        "vedic_sidereal",
    )
    const { data: updated, error } = await supabaseAdmin
        .from("birth_charts")
        .update({
            houses: chart.houses,
            planets: chart.planets,
            updated_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .select("*")
        .single()
    if (error || !updated) {
        // If the update failed (e.g. RLS or transient), fall back to
        // returning the freshly-computed shape in-memory so the page still
        // renders correctly for this request.
        return {
            ...row,
            houses: chart.houses as unknown,
            planets: chart.planets as unknown,
        }
    }
    return normalizeChart(updated as BirthChartRow) as unknown as BirthChartRow
}

async function getAuthedUser(req: NextRequest) {
    if (!supabaseAdmin) return null
    const authHeader =
        req.headers.get("authorization") ?? req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) return null
    const token = authHeader.slice(7).trim()
    if (!token) return null
    const {
        data: { user },
        error,
    } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) return null
    return user
}

async function loadProfileBirthFields(
    userId: string,
): Promise<ProfileBirthFields | null> {
    if (!supabaseAdmin) return null
    const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("birth_date, birth_time, birth_place")
        .eq("id", userId)
        .single()
    if (error || !data) return null
    return data as ProfileBirthFields
}

/**
 * GET — returns the signed-in user's most recent birth_charts row, parsed.
 * Returns `{ chart: null }` when no row exists yet (so the page can decide
 * whether to auto-compute from profile or prompt for birth info).
 */
export async function GET(req: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "SUPABASE_NOT_CONFIGURED" },
                { status: 500 },
            )
        }
        const user = await getAuthedUser(req)
        if (!user) {
            return NextResponse.json(
                { error: "UNAUTHORIZED" },
                { status: 401 },
            )
        }

        const { data, error } = await supabaseAdmin
            .from("birth_charts")
            .select("*")
            .eq("owner_user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        if (!data) {
            return NextResponse.json({ chart: null })
        }

        const normalized = normalizeChart(data as BirthChartRow)

        // Backfill: older rows were saved when the Vedic chart calculator
        // defaulted to Placidus houses, which mislabels the 2nd / 10th
        // (and other) house signs vs. the conventional Vedic whole-sign
        // reading. Recompute once, persist, and serve the corrected chart.
        if (normalized.planets && !looksLikeWholeSignHouses(normalized.houses)) {
            try {
                const refreshed = await recomputeChartForRow(
                    normalized as BirthChartRow,
                )
                if (refreshed) {
                    return NextResponse.json({ chart: refreshed })
                }
            } catch (recomputeError) {
                console.error(
                    "[birth-chart/me] house-system backfill failed:",
                    recomputeError,
                )
            }
        }

        return NextResponse.json({ chart: normalized })
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "INTERNAL_ERROR"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

/**
 * POST — auto-compute and save a fresh birth_charts row for the signed-in
 * user. Reads `profiles` birth fields and merges any overrides from the
 * request body. Returns `{ id, chart }` on success, or
 * `{ error: "INCOMPLETE_PROFILE_BIRTH" }` when neither the body nor the
 * profile carry a usable birth date.
 */
export async function POST(req: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "SUPABASE_NOT_CONFIGURED" },
                { status: 500 },
            )
        }
        const user = await getAuthedUser(req)
        if (!user) {
            return NextResponse.json(
                { error: "UNAUTHORIZED" },
                { status: 401 },
            )
        }

        const did = (await readAndVerifyDid()) ?? user.id

        const body = await req.json().catch(() => ({}))
        const overrideProfile: ProfileBirthFields = {
            birth_date:
                typeof body?.birthDate === "string" ? body.birthDate : null,
            birth_time:
                typeof body?.birthTime === "string" ? body.birthTime : null,
            birth_place:
                typeof body?.birthPlace === "string" ? body.birthPlace : null,
        }

        const profile = await loadProfileBirthFields(user.id)

        const mergedProfile: ProfileBirthFields = {
            birth_date:
                overrideProfile.birth_date ?? profile?.birth_date ?? null,
            birth_time:
                overrideProfile.birth_time ?? profile?.birth_time ?? null,
            birth_place:
                overrideProfile.birth_place ?? profile?.birth_place ?? null,
        }

        const natalSeed = profileToHoroscopeBirthData(mergedProfile)
        if (!hasHoroscopeBirthDate(natalSeed)) {
            return NextResponse.json(
                { error: "INCOMPLETE_PROFILE_BIRTH" },
                { status: 400 },
            )
        }

        const natal = applyEphemerisLocationTimeDefaults(natalSeed!)

        const chart = await calculateSwissEphChart(
            {
                year: natal.year!,
                month: natal.month!,
                day: natal.day!,
                hour: natal.hour!,
                minute: natal.minute!,
                timezone: natal.timezone!,
                lat: natal.lat!,
                lng: natal.lng!,
            },
            "vedic_sidereal",
        )

        // Reuse the country/state text for storage even when the profile only
        // provided a country string; keep both columns to make the existing
        // BirthChartInfoCard's edit flow round-trip cleanly.
        const placeParts = (mergedProfile.birth_place ?? "")
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
        let country: string | null = natal.country ?? null
        let state: string | null = natal.state ?? null
        if (!country && placeParts.length > 0) {
            country = placeParts[placeParts.length - 1] ?? null
            state =
                placeParts.length > 1
                    ? placeParts[placeParts.length - 2] ?? null
                    : null
        }
        if (country && (natal.lat === 0 || natal.lng === 0)) {
            // Best-effort coords backfill so the saved row isn't lat/lng 0
            // when we have a country name.
            const resolved = resolveLocationFromCountryState(
                country,
                state ?? undefined,
            )
            if (resolved) {
                natal.lat = resolved.latitude
                natal.lng = resolved.longitude
                natal.timezone = resolved.timezone
            }
        }

        let finalId = nanoid(12)
        for (let attempts = 0; attempts < 5; attempts++) {
            const { data: existing } = await supabaseAdmin
                .from("birth_charts")
                .select("id")
                .eq("id", finalId)
                .maybeSingle()
            if (!existing) break
            finalId = nanoid(12)
        }

        const nowIso = new Date().toISOString()
        const insertPayload = {
            id: finalId,
            did,
            owner_user_id: user.id,
            day: natal.day!,
            month: natal.month!,
            year: natal.year!,
            hour: natal.hour!,
            minute: natal.minute!,
            timezone: natal.timezone!,
            lat: natal.lat!,
            lng: natal.lng!,
            country: country || null,
            state_province: state || null,
            houses: chart.houses,
            planets: chart.planets,
            created_at: nowIso,
            updated_at: nowIso,
        }

        const { data: inserted, error } = await supabaseAdmin
            .from("birth_charts")
            .insert(insertPayload)
            .select("*")
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({
            id: finalId,
            chart: normalizeChart(inserted as BirthChartRow),
        })
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "INTERNAL_ERROR"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
