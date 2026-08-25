import SwissEph from "swisseph-wasm"

/**
 * A single Swiss Ephemeris session.
 *
 * `calculateSwissEphChart` spins up (and tears down) the wasm module per call,
 * which is fine for one chart and hopeless for a forward search that samples a
 * planet's position every day for six months. This opens the module once and
 * hands out the few operations the readings need.
 *
 * Everything here is SIDEREAL with the Lahiri ayanamsa — the same frame the
 * rest of the Thai readings use — and houses are whole-sign, counted from the
 * ascendant's sign.
 */

export const SIDEREAL_PLANETS = {
    Sun: 0,
    Moon: 1,
    Mercury: 2,
    Venus: 3,
    Mars: 4,
    Jupiter: 5,
    Saturn: 6,
} as const

export type SiderealPlanet = keyof typeof SIDEREAL_PLANETS

export const ZODIAC_SIGNS = [
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

export type ZodiacSign = (typeof ZODIAC_SIGNS)[number]

export type PlanetPosition = {
    longitude: number
    sign: ZodiacSign
    degree: number
    speed: number
    retrograde: boolean
}

export type EphemerisSession = {
    /** Julian day (UT) for a local wall-clock moment at a UTC offset. */
    julday: (input: {
        year: number
        month: number
        day: number
        hour: number
        minute: number
        timezone: number
    }) => number
    planet: (jd: number, planet: SiderealPlanet) => PlanetPosition
    /** True node; Ketu is always opposite it. */
    rahu: (jd: number) => PlanetPosition
    ascendant: (jd: number, lat: number, lng: number) => PlanetPosition
    ayanamsa: (jd: number) => number
}

function normalizeLongitude(value: number): number {
    const normalized = value % 360
    return normalized < 0 ? normalized + 360 : normalized
}

export function signOfLongitude(longitude: number): ZodiacSign {
    return ZODIAC_SIGNS[Math.floor(normalizeLongitude(longitude) / 30)] ?? "Aries"
}

function toPosition(longitude: number, speed: number): PlanetPosition {
    const normalized = normalizeLongitude(longitude)
    return {
        longitude: Number(normalized.toFixed(6)),
        sign: signOfLongitude(normalized),
        degree: Number((normalized % 30).toFixed(4)),
        speed: Number(speed.toFixed(6)),
        retrograde: speed < 0,
    }
}

/** Whole-sign house of a longitude, counted from the ascendant's sign. */
export function houseOfLongitude(
    longitude: number,
    ascendantLongitude: number,
): number {
    const signIndex = Math.floor(normalizeLongitude(longitude) / 30)
    const ascIndex = Math.floor(normalizeLongitude(ascendantLongitude) / 30)
    return ((signIndex - ascIndex + 12) % 12) + 1
}

/** The angular separation between two longitudes, 0–180. */
export function separation(a: number, b: number): number {
    const diff = Math.abs(normalizeLongitude(a) - normalizeLongitude(b))
    return diff > 180 ? 360 - diff : diff
}

/**
 * Opens the ephemeris, runs the callback, and always closes it again.
 */
export async function withEphemeris<T>(
    run: (session: EphemerisSession) => Promise<T> | T,
): Promise<T> {
    const swe = new SwissEph()
    await swe.initSwissEph()

    try {
        swe.set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0)
        const flags = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED | swe.SEFLG_SIDEREAL

        const session: EphemerisSession = {
            julday: ({ year, month, day, hour, minute, timezone }) =>
                swe.julday(year, month, day, hour + minute / 60 - timezone),
            planet: (jd, planet) => {
                const result = swe.calc_ut(
                    jd,
                    SIDEREAL_PLANETS[planet],
                    flags,
                ) as Float64Array
                return toPosition(result[0], result[3])
            },
            rahu: (jd) => {
                const result = swe.calc_ut(
                    jd,
                    swe.SE_TRUE_NODE,
                    flags,
                ) as Float64Array
                return toPosition(result[0], result[3])
            },
            ascendant: (jd, lat, lng) => {
                const houses = (
                    swe as unknown as {
                        houses_ex: (
                            jd: number,
                            iflag: number,
                            lat: number,
                            lng: number,
                            hsys: string,
                        ) => { cusps: Float64Array; ascmc: Float64Array }
                    }
                ).houses_ex(jd, swe.SEFLG_SIDEREAL, lat, lng, "W")
                return toPosition(houses.ascmc[0], 0)
            },
            ayanamsa: (jd) => Number(swe.get_ayanamsa(jd).toFixed(6)),
        }

        return await run(session)
    } finally {
        swe.close()
    }
}
