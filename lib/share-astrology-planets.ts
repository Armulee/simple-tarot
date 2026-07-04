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
 * Painted-planet anchors (planet center as fractions of the canvas), detected
 * from each background by locating the bright/colored bodies along the orbit
 * and mapping them left-to-right to the planets. Every label sits exactly on a
 * painted body; the names follow the painted sweep rather than heliocentric
 * truth (the decorative blue body reads as Venus, etc.).
 */
const PLANET_ANCHORS: Record<
    ShareAstroAspect,
    ReadonlyArray<{ name: string; x: number; y: number }>
> = {
    story: [
        { name: "Sun", x: 0.27, y: 0.82 },
        { name: "Mercury", x: 0.383, y: 0.812 },
        { name: "Venus", x: 0.467, y: 0.797 },
        { name: "Mars", x: 0.542, y: 0.778 },
        { name: "Jupiter", x: 0.623, y: 0.761 },
        { name: "Saturn", x: 0.756, y: 0.783 },
        { name: "Uranus", x: 0.768, y: 0.719 },
        { name: "Neptune", x: 0.882, y: 0.694 },
    ],
    post: [
        { name: "Sun", x: 0.275, y: 0.817 },
        { name: "Mercury", x: 0.401, y: 0.805 },
        { name: "Venus", x: 0.481, y: 0.783 },
        { name: "Mars", x: 0.557, y: 0.764 },
        { name: "Jupiter", x: 0.633, y: 0.743 },
        { name: "Saturn", x: 0.762, y: 0.77 },
        { name: "Uranus", x: 0.779, y: 0.696 },
        { name: "Neptune", x: 0.88, y: 0.668 },
    ],
    square: [
        { name: "Sun", x: 0.295, y: 0.847 },
        { name: "Mercury", x: 0.405, y: 0.832 },
        { name: "Venus", x: 0.485, y: 0.807 },
        { name: "Mars", x: 0.563, y: 0.783 },
        { name: "Jupiter", x: 0.648, y: 0.76 },
        { name: "Saturn", x: 0.773, y: 0.795 },
        { name: "Uranus", x: 0.794, y: 0.714 },
        { name: "Neptune", x: 0.896, y: 0.687 },
    ],
    landscape: [
        { name: "Sun", x: 0.401, y: 0.815 },
        { name: "Mercury", x: 0.486, y: 0.783 },
        { name: "Venus", x: 0.543, y: 0.755 },
        { name: "Mars", x: 0.601, y: 0.73 },
        { name: "Jupiter", x: 0.662, y: 0.7 },
        { name: "Saturn", x: 0.75, y: 0.742 },
        { name: "Uranus", x: 0.767, y: 0.643 },
        { name: "Neptune", x: 0.846, y: 0.618 },
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

/**
 * Reserved bottom band for the technical-reply poster, whose orbit-wheel
 * backgrounds carry a larger, more central solar system (Sun-centered
 * concentric orbits) than the daily "linear row" skies.
 */
export const ASTRO_TECHNICAL_BAND_FRACTION: Record<ShareAstroAspect, number> = {
    story: 0.33,
    post: 0.3,
    square: 0.46,
    landscape: 0.5,
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
        const drop = idx % 2 === 0 ? 0.048 : 0.023
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
