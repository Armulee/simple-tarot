/**
 * Shared data for the astrology (daily-verdict) share poster. The painted
 * solar-system backgrounds carry a row of planets along the bottom; this
 * module maps each painted body to a canvas anchor so we can stamp the
 * transit zodiac position (sign + degree) for the day the user is viewing
 * directly under it — the same data the orbit planetary visual renders.
 */

export type ShareAstroAspect = "story" | "post" | "square" | "landscape"

/** A single transit planet position, sourced from chartData.transit. */
export type TransitPlanetInput = {
    name: string
    sign?: string | null
    degree?: number | null
    retrograde?: boolean | null
}

/** A positioned label ready to stamp onto the poster (fractions of canvas). */
export type AstroPlanetLabel = {
    name: string
    /** Horizontal center, 0..1 of canvas width. */
    leftPct: number
    /** Vertical baseline, 0..1 of canvas height. */
    topPct: number
    /** e.g. "Leo 12°". */
    text: string
    retrograde: boolean
}

const ZODIAC_CANONICAL: ReadonlyArray<string> = [
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
]

const ZODIAC_ALIAS: Record<string, string> = {
    เมษ: "Aries",
    พฤษภ: "Taurus",
    มิถุน: "Gemini",
    กรกฎ: "Cancer",
    สิงห์: "Leo",
    กันย์: "Virgo",
    ตุลย์: "Libra",
    พิจิก: "Scorpio",
    ธนู: "Sagittarius",
    มกร: "Capricorn",
    กุมภ์: "Aquarius",
    มีน: "Pisces",
    Mesha: "Aries",
    Vrishabha: "Taurus",
    Mithuna: "Gemini",
    Karka: "Cancer",
    Simha: "Leo",
    Kanya: "Virgo",
    Tula: "Libra",
    Vrischika: "Scorpio",
    Dhanu: "Sagittarius",
    Makara: "Capricorn",
    Kumbha: "Aquarius",
    Meena: "Pisces",
}

/** 3-letter sign labels — locale-independent and compact for the poster. */
const SIGN_ABBR: Record<string, string> = {
    Aries: "Ari",
    Taurus: "Tau",
    Gemini: "Gem",
    Cancer: "Can",
    Leo: "Leo",
    Virgo: "Vir",
    Libra: "Lib",
    Scorpio: "Sco",
    Sagittarius: "Sag",
    Capricorn: "Cap",
    Aquarius: "Aqu",
    Pisces: "Pis",
}

function canonicalSign(sign: string): string {
    if (ZODIAC_CANONICAL.includes(sign)) return sign
    return ZODIAC_ALIAS[sign] ?? sign
}

/**
 * Painted-planet anchors (planet center as fractions of the canvas), measured
 * per background variant. `Earth` is intentionally omitted — the geocentric
 * transit chart has no Earth sign. The order is Sun → outward, matching the
 * left-to-right sweep painted in each sky.
 */
const PLANET_ANCHORS: Record<
    ShareAstroAspect,
    ReadonlyArray<{ name: string; x: number; y: number }>
> = {
    story: [
        { name: "Sun", x: 0.225, y: 0.85 },
        { name: "Mercury", x: 0.32, y: 0.835 },
        { name: "Venus", x: 0.378, y: 0.815 },
        { name: "Mars", x: 0.52, y: 0.78 },
        { name: "Jupiter", x: 0.61, y: 0.738 },
        { name: "Saturn", x: 0.72, y: 0.75 },
        { name: "Uranus", x: 0.8, y: 0.7 },
        { name: "Neptune", x: 0.862, y: 0.655 },
    ],
    post: [
        { name: "Sun", x: 0.215, y: 0.875 },
        { name: "Mercury", x: 0.31, y: 0.865 },
        { name: "Venus", x: 0.362, y: 0.855 },
        { name: "Mars", x: 0.52, y: 0.835 },
        { name: "Jupiter", x: 0.62, y: 0.808 },
        { name: "Saturn", x: 0.73, y: 0.815 },
        { name: "Uranus", x: 0.8, y: 0.785 },
        { name: "Neptune", x: 0.852, y: 0.762 },
    ],
    square: [
        { name: "Sun", x: 0.16, y: 0.888 },
        { name: "Mercury", x: 0.262, y: 0.878 },
        { name: "Venus", x: 0.312, y: 0.872 },
        { name: "Mars", x: 0.47, y: 0.855 },
        { name: "Jupiter", x: 0.58, y: 0.832 },
        { name: "Saturn", x: 0.68, y: 0.842 },
        { name: "Uranus", x: 0.752, y: 0.812 },
        { name: "Neptune", x: 0.8, y: 0.792 },
    ],
    landscape: [
        { name: "Sun", x: 0.42, y: 0.85 },
        { name: "Mercury", x: 0.49, y: 0.838 },
        { name: "Venus", x: 0.522, y: 0.828 },
        { name: "Mars", x: 0.6, y: 0.788 },
        { name: "Jupiter", x: 0.668, y: 0.748 },
        { name: "Saturn", x: 0.73, y: 0.762 },
        { name: "Uranus", x: 0.782, y: 0.708 },
        { name: "Neptune", x: 0.822, y: 0.675 },
    ],
}

/**
 * Reserved bottom band (fraction of canvas height) the text column must keep
 * clear so the painted planets — and their stamped positions — stay legible.
 */
export const ASTRO_BAND_FRACTION: Record<ShareAstroAspect, number> = {
    story: 0.3,
    post: 0.24,
    square: 0.19,
    landscape: 0.28,
}

function abbrFor(sign: string | null | undefined): string | null {
    if (!sign) return null
    return SIGN_ABBR[canonicalSign(sign)] ?? null
}

/**
 * Pulls the transit planet positions out of the loose chartData shape used by
 * the orbit visual (`chartData.transit.charts[0].planets`). Returns the bodies
 * we anchor on the poster, each with its sign / whole-degree / retrograde flag.
 */
export function extractTransitPlanets(
    chartData: Record<string, unknown> | null | undefined,
): TransitPlanetInput[] {
    const data = (chartData ?? null) as {
        transit?: {
            charts?: Array<{
                planets?: Record<
                    string,
                    {
                        sign?: string
                        degree?: number
                        retrograde?: boolean
                    }
                >
            }>
        } | null
    } | null
    const planets = data?.transit?.charts?.[0]?.planets
    if (!planets || typeof planets !== "object") return []
    const wanted = [
        "Sun",
        "Mercury",
        "Venus",
        "Mars",
        "Jupiter",
        "Saturn",
        "Uranus",
        "Neptune",
    ]
    const out: TransitPlanetInput[] = []
    for (const name of wanted) {
        const point = planets[name]
        if (!point || typeof point !== "object") continue
        out.push({
            name,
            sign: typeof point.sign === "string" ? point.sign : null,
            degree:
                typeof point.degree === "number" && Number.isFinite(point.degree)
                    ? point.degree
                    : null,
            retrograde: Boolean(point.retrograde),
        })
    }
    return out
}

/**
 * Resolves the transit positions to placed labels for a given aspect. Labels
 * are staggered slightly in height (alternating rows) so the clustered inner
 * planets don't collide. Bodies without a usable sign are skipped.
 */
export function buildAstroPlanetLabels(
    planets: TransitPlanetInput[] | null | undefined,
    aspect: ShareAstroAspect,
): AstroPlanetLabel[] {
    if (!planets || planets.length === 0) return []
    const byName = new Map(planets.map((p) => [p.name, p]))
    const anchors = PLANET_ANCHORS[aspect]
    const out: AstroPlanetLabel[] = []
    anchors.forEach((anchor, idx) => {
        const planet = byName.get(anchor.name)
        if (!planet) return
        const abbr = abbrFor(planet.sign)
        if (!abbr) return
        const degree =
            typeof planet.degree === "number" ? Math.round(planet.degree) : null
        const text = degree === null ? abbr : `${abbr} ${degree}°`
        // Alternate the drop below the planet so neighbouring labels stagger
        // — the inner planets (Sun/Mercury/Venus) sit close together.
        const drop = idx % 2 === 0 ? 0.058 : 0.022
        out.push({
            name: anchor.name,
            leftPct: anchor.x,
            topPct: Math.min(anchor.y + drop, 0.95),
            text,
            retrograde: Boolean(planet.retrograde),
        })
    })
    return out
}
