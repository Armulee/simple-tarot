import {
    houseOfLongitude,
    separation,
    signOfLongitude,
    withEphemeris,
    type PlanetPosition,
    type SiderealPlanet,
    type ZodiacSign,
} from "@/lib/astra/ephemeris"
import {
    ageInYears,
    birthDayStar,
    kalakiniStar,
    missingElement,
    nakshatraIndex,
    ruekOfNakshatra,
    rulingAgeStar,
    watchAtTime,
    weekdayOfStar,
    RUEK_SUITABILITY,
    type ChartElement,
    type RuekGroup,
    type ThaiStar,
    type Watch,
} from "@/lib/astra/thai-astrology"
import type { AstraTopic } from "@/lib/astra/intent"

/**
 * The four readings behind the four kinds of question.
 *
 * Every value returned here is computed, never authored: the model downstream
 * is only allowed to put these numbers into her voice. When a reading cannot
 * be computed — no birth time for an ascendant, no contact inside the search
 * window — it returns null for that field rather than a plausible-looking
 * number, and she says she cannot see it.
 */

/** Bangkok, used when the person never told us where they were born. */
export const DEFAULT_LAT = 13.7563
export const DEFAULT_LNG = 100.5018
export const DEFAULT_TZ = 7

export type BirthInput = {
    year: number
    month: number
    day: number
    hour: number | null
    minute: number | null
    timeKnown: boolean
    timezone: number | null
    lat: number | null
    lng: number | null
}

/** Classical rulerships: the seven visible planets, no outer planets. */
const SIGN_LORD: Record<ZodiacSign, SiderealPlanet> = {
    Aries: "Mars",
    Taurus: "Venus",
    Gemini: "Mercury",
    Cancer: "Moon",
    Leo: "Sun",
    Virgo: "Mercury",
    Libra: "Venus",
    Scorpio: "Mars",
    Sagittarius: "Jupiter",
    Capricorn: "Saturn",
    Aquarius: "Saturn",
    Pisces: "Jupiter",
}

/** The house a question of each kind falls in. */
const TOPIC_HOUSE: Record<AstraTopic, number> = {
    career: 10,
    love: 7,
    money: 2,
    health: 6,
    travel: 9,
    study: 5,
    family: 4,
    general: 1,
}

/** The planet that stands for each subject when the transits are searched. */
const TOPIC_SIGNIFICATOR: Record<AstraTopic, SiderealPlanet> = {
    career: "Sun",
    love: "Venus",
    money: "Jupiter",
    health: "Saturn",
    travel: "Jupiter",
    study: "Mercury",
    family: "Moon",
    general: "Moon",
}

/** What an almanac is being asked to find a day for. */
const TOPIC_PURPOSE: Record<AstraTopic, string> = {
    career: "opening",
    love: "wedding",
    money: "money",
    health: "rest",
    travel: "travel",
    study: "study",
    family: "moving",
    general: "meeting",
}

const MAJOR_ASPECTS = [
    { name: "conjunction", angle: 0 },
    { name: "sextile", angle: 60 },
    { name: "square", angle: 90 },
    { name: "trine", angle: 120 },
    { name: "opposition", angle: 180 },
] as const

export type AspectName = (typeof MAJOR_ASPECTS)[number]["name"]

const DAY_MS = 24 * 60 * 60 * 1000

function birthTimeOrNoon(birth: BirthInput) {
    return {
        hour: birth.timeKnown ? (birth.hour ?? 12) : 12,
        minute: birth.timeKnown ? (birth.minute ?? 0) : 0,
    }
}

function birthPlace(birth: BirthInput) {
    return {
        timezone: birth.timezone ?? DEFAULT_TZ,
        lat: birth.lat ?? DEFAULT_LAT,
        lng: birth.lng ?? DEFAULT_LNG,
    }
}

// ---------------------------------------------------------------------------
// IDENTITY — the birth chart
// ---------------------------------------------------------------------------

export type IdentityReading = {
    lagnaSign: ZodiacSign | null
    lagnaDegree: number | null
    sunSign: ZodiacSign
    moonSign: ZodiacSign
    dayStar: ThaiStar
    ageStar: ThaiStar
    ageFrom: number
    ageTo: number
    age: number
    missingElement: ChartElement | null
    ayanamsa: number
}

export async function readIdentity(
    birth: BirthInput,
    now: Date = new Date(),
): Promise<IdentityReading> {
    const { hour, minute } = birthTimeOrNoon(birth)
    const place = birthPlace(birth)

    return withEphemeris((swe) => {
        const jd = swe.julday({
            year: birth.year,
            month: birth.month,
            day: birth.day,
            hour,
            minute,
            timezone: place.timezone,
        })
        const planets = (
            ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"] as const
        ).map((planet) => swe.planet(jd, planet))
        const ascendant = birth.timeKnown
            ? swe.ascendant(jd, place.lat, place.lng)
            : null

        const age = ageInYears(birth, now)
        const dayStar = birthDayStar(birth, {
            hour: birth.timeKnown ? birth.hour : null,
        })
        const ruling = rulingAgeStar(dayStar, age)

        return {
            lagnaSign: ascendant?.sign ?? null,
            lagnaDegree: ascendant?.degree ?? null,
            sunSign: planets[0].sign,
            moonSign: planets[1].sign,
            dayStar,
            ageStar: ruling.star,
            ageFrom: ruling.fromAge,
            ageTo: ruling.toAge,
            age,
            missingElement: missingElement(planets.map((p) => p.sign)),
            ayanamsa: swe.ayanamsa(jd),
        }
    })
}

// ---------------------------------------------------------------------------
// OUTCOME — ยามถาม, the chart of the moment the question was asked
// ---------------------------------------------------------------------------

export type PrasnaReading = {
    askedAtIso: string
    watch: Watch
    lagnaSign: ZodiacSign
    lagnaDegree: number
    /** The house the question itself falls in. */
    house: number
    houseSign: ZodiacSign
    houseLord: SiderealPlanet
    lordSign: ZodiacSign
    lordHouse: number
    lordRetrograde: boolean
    /** Contacts to the house lord that are close enough to matter now. */
    contacts: {
        planet: SiderealPlanet
        aspect: AspectName
        orb: number
    }[]
    ayanamsa: number
}

export async function readPrasna(
    topic: AstraTopic,
    at: Date,
    timezone: number = DEFAULT_TZ,
    lat: number = DEFAULT_LAT,
    lng: number = DEFAULT_LNG,
): Promise<PrasnaReading> {
    const local = new Date(at.getTime() + timezone * 60 * 60 * 1000)
    const wall = {
        year: local.getUTCFullYear(),
        month: local.getUTCMonth() + 1,
        day: local.getUTCDate(),
        hour: local.getUTCHours(),
        minute: local.getUTCMinutes(),
    }

    return withEphemeris((swe) => {
        const jd = swe.julday({ ...wall, timezone })
        const ascendant = swe.ascendant(jd, lat, lng)
        const house = TOPIC_HOUSE[topic]
        const houseSign = signOfLongitude(
            ascendant.longitude + (house - 1) * 30,
        )
        const houseLord = SIGN_LORD[houseSign]
        const lord = swe.planet(jd, houseLord)

        const others: [SiderealPlanet, PlanetPosition][] = (
            ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"] as const
        )
            .filter((planet) => planet !== houseLord)
            .map((planet) => [planet, swe.planet(jd, planet)])

        const contacts = others
            .flatMap(([planet, position]) => {
                const gap = separation(position.longitude, lord.longitude)
                const aspect = MAJOR_ASPECTS.find(
                    (candidate) => Math.abs(gap - candidate.angle) <= 3,
                )
                return aspect
                    ? [
                          {
                              planet,
                              aspect: aspect.name,
                              orb: Number(
                                  Math.abs(gap - aspect.angle).toFixed(2),
                              ),
                          },
                      ]
                    : []
            })
            .sort((a, b) => a.orb - b.orb)
            .slice(0, 3)

        return {
            askedAtIso: at.toISOString(),
            watch: watchAtTime(wall),
            lagnaSign: ascendant.sign,
            lagnaDegree: ascendant.degree,
            house,
            houseSign,
            houseLord,
            lordSign: lord.sign,
            lordHouse: houseOfLongitude(lord.longitude, ascendant.longitude),
            lordRetrograde: lord.retrograde,
            contacts,
            ayanamsa: swe.ayanamsa(jd),
        }
    })
}

// ---------------------------------------------------------------------------
// TIMING — when the slow planets reach the subject's significator
// ---------------------------------------------------------------------------

export type TimingReading = {
    significator: SiderealPlanet
    natalSign: ZodiacSign
    /** Null when nothing comes within orb inside the search window. */
    window: {
        startIso: string
        peakIso: string
        endIso: string
        transitPlanet: SiderealPlanet
        aspect: AspectName
    } | null
    searchedDays: number
}

const TIMING_TRANSITS: SiderealPlanet[] = ["Jupiter", "Saturn"]
const TIMING_ORB = 1.5

export async function readTiming(
    birth: BirthInput,
    topic: AstraTopic,
    from: Date = new Date(),
    searchedDays = 240,
): Promise<TimingReading> {
    const { hour, minute } = birthTimeOrNoon(birth)
    const place = birthPlace(birth)
    const significator = TOPIC_SIGNIFICATOR[topic]

    return withEphemeris((swe) => {
        const natalJd = swe.julday({
            year: birth.year,
            month: birth.month,
            day: birth.day,
            hour,
            minute,
            timezone: place.timezone,
        })
        const natal = swe.planet(natalJd, significator)

        // Sample once a day and keep the closest approach inside orb.
        let best: {
            dayIndex: number
            orb: number
            transitPlanet: SiderealPlanet
            aspect: AspectName
        } | null = null
        const inOrb: Record<string, number[]> = {}

        for (let dayIndex = 0; dayIndex <= searchedDays; dayIndex += 1) {
            const sample = new Date(from.getTime() + dayIndex * DAY_MS)
            const jd = swe.julday({
                year: sample.getUTCFullYear(),
                month: sample.getUTCMonth() + 1,
                day: sample.getUTCDate(),
                hour: 12,
                minute: 0,
                timezone: 0,
            })
            for (const planet of TIMING_TRANSITS) {
                const position = swe.planet(jd, planet)
                const gap = separation(position.longitude, natal.longitude)
                for (const aspect of MAJOR_ASPECTS) {
                    const orb = Math.abs(gap - aspect.angle)
                    if (orb > TIMING_ORB) continue
                    const key = `${planet}:${aspect.name}`
                    inOrb[key] = inOrb[key] ?? []
                    inOrb[key].push(dayIndex)
                    if (!best || orb < best.orb) {
                        best = {
                            dayIndex,
                            orb,
                            transitPlanet: planet,
                            aspect: aspect.name,
                        }
                    }
                }
            }
        }

        if (!best) {
            return {
                significator,
                natalSign: natal.sign,
                window: null,
                searchedDays,
            }
        }

        // A slow planet can square a point, retrograde, and square it again
        // months later. Keep only the pass the peak belongs to, so the window
        // is a window and not a season.
        const days = inOrb[`${best.transitPlanet}:${best.aspect}`] ?? [
            best.dayIndex,
        ]
        let startIndex = best.dayIndex
        let endIndex = best.dayIndex
        const inWindow = new Set(days)
        while (inWindow.has(startIndex - 1)) startIndex -= 1
        while (inWindow.has(endIndex + 1)) endIndex += 1
        const at = (index: number) =>
            new Date(from.getTime() + index * DAY_MS).toISOString()

        return {
            significator,
            natalSign: natal.sign,
            window: {
                startIso: at(startIndex),
                peakIso: at(best.dayIndex),
                endIso: at(endIndex),
                transitPlanet: best.transitPlanet,
                aspect: best.aspect,
            },
            searchedDays,
        }
    })
}

// ---------------------------------------------------------------------------
// AUSPICIOUS_DATE — ฤกษ์ from the Moon's mansion, minus the person's กาลกิณี day
// ---------------------------------------------------------------------------

export type AuspiciousDay = {
    dateIso: string
    nakshatra: number
    ruek: RuekGroup
    weekdayStar: ThaiStar
    isKalakiniDay: boolean
    score: number
}

export type AuspiciousReading = {
    purpose: string
    kalakini: ThaiStar
    days: AuspiciousDay[]
    searchedDays: number
}

export async function readAuspicious(
    birth: BirthInput,
    topic: AstraTopic,
    from: Date = new Date(),
    searchedDays = 45,
): Promise<AuspiciousReading> {
    const purpose = TOPIC_PURPOSE[topic]
    const dayStar = birthDayStar(birth, {
        hour: birth.timeKnown ? birth.hour : null,
    })
    const kalakini = kalakiniStar(dayStar)
    const kalakiniWeekday = weekdayOfStar(kalakini)

    return withEphemeris((swe) => {
        const days: AuspiciousDay[] = []

        for (let dayIndex = 1; dayIndex <= searchedDays; dayIndex += 1) {
            const date = new Date(from.getTime() + dayIndex * DAY_MS)
            const jd = swe.julday({
                year: date.getUTCFullYear(),
                month: date.getUTCMonth() + 1,
                day: date.getUTCDate(),
                hour: 9,
                minute: 0,
                timezone: DEFAULT_TZ,
            })
            const moon = swe.planet(jd, "Moon")
            const nakshatra = nakshatraIndex(moon.longitude)
            const ruek = ruekOfNakshatra(nakshatra)
            const suitability = RUEK_SUITABILITY[ruek]
            const weekday = date.getUTCDay()
            const isKalakiniDay = kalakiniWeekday === weekday

            let score = 0
            if (suitability.good.includes(purpose)) score += 3
            if (suitability.avoid.includes(purpose)) score -= 4
            if (suitability.good.length === 0) score -= 2
            if (isKalakiniDay) score -= 3

            days.push({
                dateIso: date.toISOString().slice(0, 10),
                nakshatra,
                ruek,
                weekdayStar: birthDayStar({
                    year: date.getUTCFullYear(),
                    month: date.getUTCMonth() + 1,
                    day: date.getUTCDate(),
                }),
                isKalakiniDay,
                score,
            })
        }

        return {
            purpose,
            kalakini,
            days: days
                .filter((day) => day.score > 0)
                .sort((a, b) => b.score - a.score || a.dateIso.localeCompare(b.dateIso))
                .slice(0, 3),
            searchedDays,
        }
    })
}
