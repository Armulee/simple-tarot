/**
 * Thai astrology primitives used by the opening cold read.
 *
 * Everything here is arithmetic on the birth date — no ephemeris — so it works
 * even when the visitor does not know their birth time.
 *
 *   ดาวประจำวันเกิด  the star that rules the weekday of birth (Wednesday
 *                    splits: born after dusk belongs to Rahu)
 *   ดาวเสวยอายุ      the star currently "consuming" the person's age. The
 *                    stars take turns in the ทักษา order, starting from the
 *                    birth-day star, each ruling for its กำลังพระเคราะห์
 *                    (planetary strength) in years. The eight strengths sum to
 *                    108, after which the cycle repeats.
 */

export const THAI_STARS = [
    "sun",
    "moon",
    "mars",
    "mercury",
    "saturn",
    "jupiter",
    "rahu",
    "venus",
] as const

export type ThaiStar = (typeof THAI_STARS)[number]

/** ทักษา order — the cycle every reckoning walks, starting at the birth-day star. */
export const THAKSA_ORDER: readonly ThaiStar[] = THAI_STARS

/** กำลังพระเคราะห์: years each star rules while it consumes the age. Sums to 108. */
export const THAKSA_STAR_YEARS: Record<ThaiStar, number> = {
    sun: 6,
    moon: 15,
    mars: 8,
    mercury: 17,
    saturn: 10,
    jupiter: 19,
    rahu: 12,
    venus: 21,
}

export const THAKSA_CYCLE_YEARS = Object.values(THAKSA_STAR_YEARS).reduce(
    (total, years) => total + years,
    0,
)

/** Weekday index (0 = Sunday) → ruling star. Wednesday is resolved separately. */
const WEEKDAY_STARS: readonly ThaiStar[] = [
    "sun",
    "moon",
    "mars",
    "mercury",
    "jupiter",
    "venus",
    "saturn",
]

export type BirthDate = { year: number; month: number; day: number }

/** Day-of-week for a calendar date, computed in UTC so no timezone can shift it. */
export function weekdayIndex({ year, month, day }: BirthDate): number {
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

/**
 * ดาวประจำวันเกิด. A Wednesday birth after dusk (18:00–05:59) belongs to Rahu
 * — "พุธกลางคืน" — which only applies when the birth time is known.
 */
export function birthDayStar(
    birth: BirthDate,
    options: { hour?: number | null } = {},
): ThaiStar {
    const index = weekdayIndex(birth)
    const star = WEEKDAY_STARS[index] ?? "sun"
    if (star !== "mercury") return star
    const hour = options.hour
    if (hour == null) return star
    return hour >= 18 || hour < 6 ? "rahu" : "mercury"
}

/** Whole years elapsed between the birth date and `on` (default: today). */
export function ageInYears(birth: BirthDate, on: Date = new Date()): number {
    let age = on.getUTCFullYear() - birth.year
    const monthDiff = on.getUTCMonth() + 1 - birth.month
    const dayDiff = on.getUTCDate() - birth.day
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1
    return Math.max(0, age)
}

export type RulingAgeStar = {
    star: ThaiStar
    /** Age at which this star took over. */
    fromAge: number
    /** Age at which it hands over to the next star. */
    toAge: number
    /** Which pass through the 108-year cycle the person is on (0-based). */
    cycle: number
}

/**
 * ดาวเสวยอายุ: which star is consuming the person's age right now, and the age
 * window it covers.
 */
export function rulingAgeStar(
    dayStar: ThaiStar,
    age: number,
): RulingAgeStar {
    const cycle = Math.floor(age / THAKSA_CYCLE_YEARS)
    let remaining = age % THAKSA_CYCLE_YEARS
    const startIndex = THAKSA_ORDER.indexOf(dayStar)
    let consumed = 0

    for (let step = 0; step < THAKSA_ORDER.length; step += 1) {
        const star = THAKSA_ORDER[(startIndex + step) % THAKSA_ORDER.length]
        const years = THAKSA_STAR_YEARS[star]
        if (remaining < years) {
            const base = cycle * THAKSA_CYCLE_YEARS + consumed
            return { star, fromAge: base, toAge: base + years, cycle }
        }
        remaining -= years
        consumed += years
    }

    // Unreachable: the loop covers all 108 years of the cycle.
    return {
        star: dayStar,
        fromAge: cycle * THAKSA_CYCLE_YEARS,
        toAge: cycle * THAKSA_CYCLE_YEARS + THAKSA_STAR_YEARS[dayStar],
        cycle,
    }
}

export const CHART_ELEMENTS = ["fire", "earth", "air", "water"] as const
export type ChartElement = (typeof CHART_ELEMENTS)[number]

/** Zodiac sign (canonical English, as produced by the swisseph layer) → element. */
export const SIGN_ELEMENT: Record<string, ChartElement> = {
    Aries: "fire",
    Leo: "fire",
    Sagittarius: "fire",
    Taurus: "earth",
    Virgo: "earth",
    Capricorn: "earth",
    Gemini: "air",
    Libra: "air",
    Aquarius: "air",
    Cancer: "water",
    Scorpio: "water",
    Pisces: "water",
}

/**
 * ธาตุที่พร่อง — the element the chart is thinnest in. Ties resolve by the
 * fixed element order so the same chart always yields the same answer.
 * Returns null when the placements are evenly spread.
 */
export function missingElement(signs: readonly string[]): ChartElement | null {
    if (signs.length === 0) return null
    const counts: Record<ChartElement, number> = {
        fire: 0,
        earth: 0,
        air: 0,
        water: 0,
    }
    for (const sign of signs) {
        const element = SIGN_ELEMENT[sign]
        if (element) counts[element] += 1
    }
    const lowest = Math.min(...CHART_ELEMENTS.map((e) => counts[e]))
    const highest = Math.max(...CHART_ELEMENTS.map((e) => counts[e]))
    if (lowest === highest) return null
    return CHART_ELEMENTS.find((e) => counts[e] === lowest) ?? null
}
