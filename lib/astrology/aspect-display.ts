/**
 * Shared helpers for surfaces that render transit/natal aspects (the
 * RealtimePlanetaryPanel and the chat TransitFeed).
 *
 * The upstream aspect calc in `lib/astrology/transit-aspects.ts` snapshots
 * each aspect at its *peak* date (where the orb is minimized). When we
 * surface those events in a "what's happening right now" UI we need to:
 *
 *   1. resolve today's transit longitude from the chartData (not the
 *      event's peak-time snapshot), and
 *   2. recompute the orb against the aspect's target angle using today's
 *      positions, and
 *   3. filter out events whose orb today is wider than the standard
 *      in-orb window, since otherwise an event whose peak is months away
 *      shows up with a 20-30deg orb just because today falls inside its
 *      multi-month "window".
 */

const ZODIAC_SIGNS_EN = [
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

/**
 * Sign aliases the upstream calc / cached chartData may emit (Thai / Lao /
 * Sanskrit-style abbreviations). Mapped to the canonical English key so
 * downstream lookups (`getPlanetDignity`, sign-index math) resolve.
 */
const ZODIAC_SIGN_INDEX: Record<string, number> = {
    Aries: 0,
    Taurus: 1,
    Gemini: 2,
    Cancer: 3,
    Leo: 4,
    Virgo: 5,
    Libra: 6,
    Scorpio: 7,
    Sagittarius: 8,
    Capricorn: 9,
    Aquarius: 10,
    Pisces: 11,
    เมษ: 0,
    พฤษภ: 1,
    เมถุน: 2,
    มิถุน: 2,
    กรกฎ: 3,
    สิงห์: 4,
    กันย์: 5,
    ตุลย์: 6,
    พิจิก: 7,
    ธนู: 8,
    มกร: 9,
    มังกร: 9,
    กุมภ์: 10,
    มีน: 11,
}

/** Standard in-orb window applied to "what's active right now" surfaces. */
export const ACTIVE_ORB_DEGREES = 5

const OUTER_GENERATIONAL_PLANETS = new Set(["Uranus", "Neptune", "Pluto"])
const BIG_FAST_PLANETS = new Set(["Jupiter", "Saturn"])

/**
 * Display priority for the transit-aspect list. Lower numbers sort first.
 *   0 — Big planets except U/N/P (Jupiter, Saturn)
 *   1 — Everyone else (Sun, Moon, Mercury, Venus, Mars, Rahu, Ketu, Chiron)
 *   2 — Outer generational planets (Uranus, Neptune, Pluto)
 *
 * Apply as the *final* pass after any intensity-based ordering — Array.sort
 * is stable so within-group order is preserved.
 */
export function transitPlanetPriority(planet: string): number {
    if (BIG_FAST_PLANETS.has(planet)) return 0
    if (OUTER_GENERATIONAL_PLANETS.has(planet)) return 2
    return 1
}

export type ChartPlanetPoint = {
    sign?: unknown
    degree?: unknown
    longitude?: unknown
    retrograde?: unknown
}

export function readTransitPlanetPoint(
    chartData: Record<string, unknown> | null | undefined,
    planet: string,
): ChartPlanetPoint | null {
    if (!chartData) return null
    const transit = chartData.transit as
        | { charts?: Array<{ planets?: Record<string, ChartPlanetPoint> }> }
        | undefined
    const point = transit?.charts?.[0]?.planets?.[planet]
    return point && typeof point === "object" ? point : null
}

export function readNatalPlanetPoint(
    chartData: Record<string, unknown> | null | undefined,
    planet: string,
): ChartPlanetPoint | null {
    if (!chartData) return null
    const charts = chartData.charts as
        | Array<{ planets?: Record<string, ChartPlanetPoint> }>
        | undefined
    const point = charts?.[0]?.planets?.[planet]
    return point && typeof point === "object" ? point : null
}

function toFiniteNumber(value: unknown): number | undefined {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : undefined
    }
    if (typeof value === "string") {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : undefined
    }
    return undefined
}

/** Map common aliases (Thai/Lao/abbrev) back to canonical English. */
export function canonicalSignName(
    sign: string | null | undefined,
): string | null {
    if (!sign) return null
    if ((ZODIAC_SIGNS_EN as readonly string[]).includes(sign)) return sign
    const idx = ZODIAC_SIGN_INDEX[sign]
    if (typeof idx === "number") return ZODIAC_SIGNS_EN[idx] ?? sign
    return sign
}

/** Resolve a 0..360 longitude from a chart point, falling back to sign+degree. */
function longitudeFromPoint(point: ChartPlanetPoint | null): number | null {
    if (!point) return null
    const long = toFiniteNumber(point.longitude)
    if (typeof long === "number") return long
    const signRaw = typeof point.sign === "string" ? point.sign : null
    const sign = canonicalSignName(signRaw)
    const degree = toFiniteNumber(point.degree)
    if (!sign || typeof degree !== "number") return null
    const idx = ZODIAC_SIGN_INDEX[sign]
    if (typeof idx !== "number") return null
    return idx * 30 + degree
}

/** Today's transit longitude for `planet` from chartData, or null. */
export function getTodayTransitLongitude(
    chartData: Record<string, unknown> | null | undefined,
    planet: string,
): number | null {
    return longitudeFromPoint(readTransitPlanetPoint(chartData, planet))
}

/** Natal longitude for `planet`, preferring chartData over `fallback`. */
export function getNatalLongitude(
    chartData: Record<string, unknown> | null | undefined,
    planet: string,
    fallback: number | undefined,
): number | null {
    const fromChart = longitudeFromPoint(readNatalPlanetPoint(chartData, planet))
    if (fromChart !== null) return fromChart
    return typeof fallback === "number" && Number.isFinite(fallback)
        ? fallback
        : null
}

/** Smallest angular separation between two longitudes (0..180). */
export function angularSeparation(
    aLongitude: number | null | undefined,
    bLongitude: number | null | undefined,
): number | null {
    if (
        typeof aLongitude !== "number" ||
        typeof bLongitude !== "number" ||
        !Number.isFinite(aLongitude) ||
        !Number.isFinite(bLongitude)
    ) {
        return null
    }
    const raw = Math.abs(aLongitude - bLongitude) % 360
    return raw > 180 ? 360 - raw : raw
}

/**
 * Orb between the two longitudes relative to a target aspect angle (0 / 60
 * / 90 / 120 / 180). Uses the shorter arc so opposition stays in [0..180].
 */
export function computeOrbAgainstAngle(
    transitLongitude: number | null | undefined,
    natalLongitude: number | null | undefined,
    aspectAngle: number,
): number | null {
    const separation = angularSeparation(transitLongitude, natalLongitude)
    if (separation === null) return null
    return Math.abs(separation - aspectAngle)
}
