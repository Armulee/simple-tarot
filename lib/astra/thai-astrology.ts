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

/**
 * กาลกิณี — the star that sits eighth in the ทักษา round from the birth-day
 * star, counting the day star itself as first. Its weekday is the one to keep
 * away from when choosing an auspicious date.
 */
export function kalakiniStar(dayStar: ThaiStar): ThaiStar {
    const start = THAKSA_ORDER.indexOf(dayStar)
    return THAKSA_ORDER[(start + 7) % THAKSA_ORDER.length]
}

/** Weekday (0 = Sunday) ruled by each star; Rahu rules no weekday of its own. */
export function weekdayOfStar(star: ThaiStar): number | null {
    const index = WEEKDAY_STARS.indexOf(star)
    return index === -1 ? null : index
}

/** The 27 lunar mansions. A nakshatra spans 13°20' of the sidereal zodiac. */
export const NAKSHATRA_ARC = 360 / 27

export function nakshatraIndex(siderealLongitude: number): number {
    const normalized = ((siderealLongitude % 360) + 360) % 360
    return Math.floor(normalized / NAKSHATRA_ARC)
}

/**
 * The nine ฤกษ์ groups, in the order the mansions cycle through them. Each
 * mansion belongs to the group at `index % 9`, and the group is what a Thai
 * almanac reads when it calls a day fit — or unfit — for a particular kind of
 * undertaking.
 */
export const RUEK_GROUPS = [
    "thalitho",
    "mahattano",
    "choro",
    "phumipalo",
    "thesatri",
    "thewi",
    "phetchakhat",
    "racha",
    "samano",
] as const

export type RuekGroup = (typeof RUEK_GROUPS)[number]

export function ruekOfNakshatra(index: number): RuekGroup {
    return RUEK_GROUPS[((index % 9) + 9) % 9]
}

/** What each ฤกษ์ is traditionally read as good for. */
export const RUEK_SUITABILITY: Record<
    RuekGroup,
    { good: readonly string[]; avoid: readonly string[] }
> = {
    // ทลิทโท — the beggar's ฤกษ์: asking, and work that starts from nothing.
    thalitho: { good: ["asking", "study", "service"], avoid: ["wedding", "opening"] },
    // มหัทธโน — the wealthy: trade, opening, anything that should hold money.
    mahattano: { good: ["business", "opening", "money", "wedding"], avoid: [] },
    // โจโร — the thief: seizing and contending, never for what must last.
    choro: { good: ["negotiation", "competition"], avoid: ["wedding", "opening", "contract"] },
    // ภูมิปาโล — the land-keeper: building, settling, contracts.
    phumipalo: { good: ["building", "moving", "contract", "wedding"], avoid: [] },
    // เทศาตรี — the traveller: movement, travel, publishing.
    thesatri: { good: ["travel", "launch", "meeting"], avoid: ["wedding"] },
    // เทวี — the lady: beauty, courtship, anything asking to be liked.
    thewi: { good: ["wedding", "launch", "meeting", "money"], avoid: [] },
    // เพชฌฆาต — the executioner: for cutting things off, and nothing else.
    phetchakhat: { good: [], avoid: ["wedding", "opening", "contract", "travel", "launch"] },
    // ราชา — the king: authority, ceremony, facing power.
    racha: { good: ["opening", "ceremony", "authority", "contract"], avoid: [] },
    // สมโณ — the ascetic: quiet, merit, retreat.
    samano: { good: ["merit", "study", "rest"], avoid: ["opening", "business"] },
}

/**
 * ยามอัฐกาล — the eight watches.
 *
 * Daylight (06:00–18:00) and night (18:00–06:00) are each cut into eight
 * watches of ninety minutes, and each watch is ruled by a star in the ทักษา
 * order. The daytime round opens on the star of the weekday itself; the night
 * round opens six places on from it. A watch after midnight still belongs to
 * the night of the day before, the way the Thai day is reckoned.
 *
 * CONVENTION: the night offset below is the one place in the code where a
 * choice between almanac traditions is made. If a working astrologer says the
 * night round opens elsewhere, this constant is the only thing to change.
 */
const NIGHT_WATCH_OFFSET = 5

const WATCH_MINUTES = 90
const WATCHES_PER_HALF = 8

export type Watch = {
    /** 1–8 within its half of the day. */
    index: number
    star: ThaiStar
    isNight: boolean
    /** Star of the weekday this watch is reckoned under. */
    dayStar: ThaiStar
}

export function watchAtTime(at: {
    year: number
    month: number
    day: number
    hour: number
    minute: number
}): Watch {
    const isDaylight = at.hour >= 6 && at.hour < 18
    const minutesOfDay = at.hour * 60 + at.minute

    // Before dawn belongs to the night of the previous day.
    const reckoned =
        isDaylight || at.hour >= 18
            ? { year: at.year, month: at.month, day: at.day }
            : (() => {
                  const previous = new Date(
                      Date.UTC(at.year, at.month - 1, at.day - 1),
                  )
                  return {
                      year: previous.getUTCFullYear(),
                      month: previous.getUTCMonth() + 1,
                      day: previous.getUTCDate(),
                  }
              })()

    const dayStar = birthDayStar(reckoned)
    const startIndex = THAKSA_ORDER.indexOf(dayStar)

    const elapsed = isDaylight
        ? minutesOfDay - 6 * 60
        : at.hour >= 18
          ? minutesOfDay - 18 * 60
          : minutesOfDay + 6 * 60

    const offset = Math.min(
        WATCHES_PER_HALF - 1,
        Math.max(0, Math.floor(elapsed / WATCH_MINUTES)),
    )
    const roundStart = isDaylight ? startIndex : startIndex + NIGHT_WATCH_OFFSET

    return {
        index: offset + 1,
        star: THAKSA_ORDER[(roundStart + offset) % THAKSA_ORDER.length],
        isNight: !isDaylight,
        dayStar,
    }
}
