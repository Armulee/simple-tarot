import { supabaseAdmin } from "@/lib/supabase"

const ZODIAC_SIGNS = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
] as const

type ZodiacSign = (typeof ZODIAC_SIGNS)[number]

/**
 * Maps a canonical planet name to the ephemeris_codex column that stores
 * its TROPICAL longitude. Uses true_node_long for Rahu/Ketu.
 */
const PLANET_TO_LONG_KEY: Record<string, string> = {
    Sun: "sun_long",
    Moon: "moon_long",
    Mercury: "mercury_long",
    Venus: "venus_long",
    Mars: "mars_long",
    Jupiter: "jupiter_long",
    Saturn: "saturn_long",
    Uranus: "uranus_long",
    Neptune: "neptune_long",
    Pluto: "pluto_long",
    Rahu: "true_node_long",
    Ketu: "true_node_long",
}

/** Planets we'll never compute an ingress for — they move too slowly to be useful in a 3-year window. */
const OUTER_PLANETS = new Set(["Uranus", "Neptune", "Pluto"])

export type IngressInfo = {
    planet: string
    /** ISO date (YYYY-MM-DD) of the day the planet first appears in the new sign. */
    dateIso: string
    /** Sign the planet leaves. */
    fromSign: ZodiacSign
    /** Sign the planet enters. */
    toSign: ZodiacSign
    /** Whether the answer is in the SIDEREAL zodiac (Vedic) or tropical (Western). */
    system: "western_tropical" | "vedic_sidereal"
}

function normalizeLongitude(value: number) {
    const normalized = value % 360
    return normalized < 0 ? normalized + 360 : normalized
}

function signIndex(longitude: number): number {
    return Math.floor(normalizeLongitude(longitude) / 30)
}

function addDays(date: Date, days: number) {
    const ms = 24 * 60 * 60 * 1000
    return new Date(date.getTime() + days * ms)
}

function toIsoDate(date: Date) {
    return date.toISOString().slice(0, 10)
}

/**
 * Scans the ephemeris codex from `fromDate` forward looking for the FIRST
 * day each requested planet enters a different zodiac sign than it occupies
 * today. Returns one IngressInfo per planet that crossed a sign boundary
 * within the supplied window; planets that didn't change sign (or aren't
 * supported) are omitted.
 *
 * The codex stores TROPICAL longitudes; for sidereal lookups we subtract
 * the day's Lahiri ayanamsa before bucketing into a sign.
 */
export async function findNextSignIngresses(
    planets: readonly string[],
    fromDate: Date,
    system: "western_tropical" | "vedic_sidereal",
    maxLookaheadDays = 1100,
): Promise<IngressInfo[]> {
    if (!supabaseAdmin) return []
    const wantedPlanets = Array.from(
        new Set(
            planets.filter(
                (p) => PLANET_TO_LONG_KEY[p] && !OUTER_PLANETS.has(p),
            ),
        ),
    )
    if (wantedPlanets.length === 0) return []

    const longKeys = Array.from(
        new Set(wantedPlanets.map((p) => PLANET_TO_LONG_KEY[p])),
    )
    const isVedic = system === "vedic_sidereal"

    const startIso = toIsoDate(fromDate)
    const endIso = toIsoDate(addDays(fromDate, maxLookaheadDays))

    const { data, error } = await supabaseAdmin
        .from("ephemeris_codex")
        .select(
            `date, ayanamsa_lahiri, ${longKeys.join(", ")}`,
        )
        .gte("date", startIso)
        .lte("date", endIso)
        .order("date", { ascending: true })

    if (error || !data || data.length === 0) return []

    // Per planet: the sign index it currently occupies (set on first row) and
    // whether we already recorded its next ingress.
    const lastSign: Record<string, number> = {}
    const found: Record<string, IngressInfo> = {}

    for (const row of data as unknown as Array<Record<string, unknown>>) {
        const date = typeof row.date === "string" ? row.date : ""
        if (!date) continue
        const ayanamsa =
            isVedic && typeof row.ayanamsa_lahiri === "number"
                ? row.ayanamsa_lahiri
                : 0

        for (const planet of wantedPlanets) {
            if (found[planet]) continue
            const longKey = PLANET_TO_LONG_KEY[planet]
            const rawLong = row[longKey]
            if (typeof rawLong !== "number" || !Number.isFinite(rawLong)) {
                continue
            }
            // Ketu is the opposite node of Rahu — add 180° to the true-node
            // longitude before bucketing.
            const tropicalLong =
                planet === "Ketu" ? rawLong + 180 : rawLong
            const long = normalizeLongitude(
                isVedic ? tropicalLong - ayanamsa : tropicalLong,
            )
            const sign = signIndex(long)

            if (!(planet in lastSign)) {
                lastSign[planet] = sign
                continue
            }
            if (sign !== lastSign[planet]) {
                found[planet] = {
                    planet,
                    dateIso: date,
                    fromSign: ZODIAC_SIGNS[lastSign[planet]] ?? "Aries",
                    toSign: ZODIAC_SIGNS[sign] ?? "Aries",
                    system,
                }
                lastSign[planet] = sign
            }
        }

        if (Object.keys(found).length === wantedPlanets.length) break
    }

    // Preserve input order.
    return wantedPlanets
        .map((p) => found[p])
        .filter((info): info is IngressInfo => Boolean(info))
}
