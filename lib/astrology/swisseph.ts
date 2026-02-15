import type {
    AstrologyAspect,
    AstrologyPoint,
    AstrologySystem,
    SwissEphChart,
    SwissEphInput,
} from "@/lib/astrology/types"

// swisseph is a native CJS module without typed exports.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const swisseph = require("swisseph")

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

const PLANETS = [
    { key: "Sun", id: 0 },
    { key: "Moon", id: 1 },
    { key: "Mercury", id: 2 },
    { key: "Venus", id: 3 },
    { key: "Mars", id: 4 },
    { key: "Jupiter", id: 5 },
    { key: "Saturn", id: 6 },
] as const

type SweCalcResult = {
    longitude: number
    latitude: number
    distance: number
    longitudeSpeed: number
    latitudeSpeed: number
    distanceSpeed: number
    error?: string
}

type SweHousesResult = {
    house: number[]
    ascendant: number
    mc: number
    error?: string
}

function normalizeLongitude(value: number) {
    const normalized = value % 360
    return normalized < 0 ? normalized + 360 : normalized
}

function longitudeToSign(longitude: number) {
    const normalized = normalizeLongitude(longitude)
    const signIndex = Math.floor(normalized / 30)
    return {
        sign: ZODIAC_SIGNS[signIndex] ?? "Aries",
        degree: Number((normalized % 30).toFixed(4)),
        longitude: Number(normalized.toFixed(6)),
    }
}

function toPoint(longitude: number, speed: number): AstrologyPoint {
    const { sign, degree, longitude: normLongitude } = longitudeToSign(longitude)
    return {
        sign,
        degree,
        longitude: normLongitude,
        speed: Number(speed.toFixed(6)),
        retrograde: speed < 0,
    }
}

function sweJuldayUtc(input: SwissEphInput): Promise<number> {
    const utcHour = input.hour + input.minute / 60 - input.timezone
    return new Promise((resolve) => {
        swisseph.swe_julday(
            input.year,
            input.month,
            input.day,
            utcHour,
            swisseph.SE_GREG_CAL,
            (value: number) => resolve(value)
        )
    })
}

function sweCalcUt(
    julianDayUt: number,
    planetId: number,
    iflag: number
): Promise<SweCalcResult> {
    return new Promise((resolve, reject) => {
        swisseph.swe_calc_ut(
            julianDayUt,
            planetId,
            iflag,
            (result: SweCalcResult) => {
                if (result?.error) {
                    reject(new Error(result.error))
                    return
                }
                resolve(result)
            }
        )
    })
}

function sweHousesEx(
    julianDayUt: number,
    iflag: number,
    lat: number,
    lng: number,
    houseSystem: string
): Promise<SweHousesResult> {
    return new Promise((resolve, reject) => {
        swisseph.swe_houses_ex(
            julianDayUt,
            iflag,
            lat,
            lng,
            houseSystem,
            (result: SweHousesResult) => {
                if (result?.error) {
                    reject(new Error(result.error))
                    return
                }
                resolve(result)
            }
        )
    })
}

function sweGetAyanamsaUt(julianDayUt: number): Promise<number> {
    return new Promise((resolve) => {
        swisseph.swe_get_ayanamsa_ut(julianDayUt, (value: number) => resolve(value))
    })
}

function getAspects(planets: Record<string, AstrologyPoint>): AstrologyAspect[] {
    const major = [
        { type: "conjunction" as const, angle: 0, orb: 7 },
        { type: "sextile" as const, angle: 60, orb: 4 },
        { type: "square" as const, angle: 90, orb: 6 },
        { type: "trine" as const, angle: 120, orb: 6 },
        { type: "opposition" as const, angle: 180, orb: 7 },
    ]
    const keys = Object.keys(planets)
    const aspects: AstrologyAspect[] = []

    for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) {
            const a = planets[keys[i]]
            const b = planets[keys[j]]
            if (!a || !b) continue

            const rawDiff = Math.abs(a.longitude - b.longitude)
            const diff = rawDiff > 180 ? 360 - rawDiff : rawDiff

            for (const aspect of major) {
                const orb = Math.abs(diff - aspect.angle)
                if (orb <= aspect.orb) {
                    aspects.push({
                        from: keys[i],
                        to: keys[j],
                        type: aspect.type,
                        orb: Number(orb.toFixed(3)),
                    })
                    break
                }
            }
        }
    }

    return aspects
}

export async function calculateSwissEphChart(
    input: SwissEphInput,
    system: AstrologySystem
): Promise<SwissEphChart> {
    const houseSystem = input.houseSystem || "P"
    const julianDayUt = await sweJuldayUtc(input)
    const isVedic = system === "vedic_sidereal"

    if (isVedic) {
        swisseph.swe_set_sid_mode(swisseph.SE_SIDM_LAHIRI, 0, 0)
    }

    const baseFlag = swisseph.SEFLG_SPEED | swisseph.SEFLG_SWIEPH
    const iflag = isVedic ? baseFlag | swisseph.SEFLG_SIDEREAL : baseFlag
    const houseIflag = isVedic ? swisseph.SEFLG_SIDEREAL : 0

    const [housesResult, nodeResult, ...planetResults] = await Promise.all([
        sweHousesEx(julianDayUt, houseIflag, input.lat, input.lng, houseSystem),
        sweCalcUt(julianDayUt, swisseph.SE_TRUE_NODE, iflag),
        ...PLANETS.map((planet) => sweCalcUt(julianDayUt, planet.id, iflag)),
    ])

    const planets: Record<string, AstrologyPoint> = {}
    PLANETS.forEach((planet, index) => {
        const result = planetResults[index]
        planets[planet.key] = toPoint(result.longitude, result.longitudeSpeed)
    })

    planets.Rahu = toPoint(nodeResult.longitude, nodeResult.longitudeSpeed)
    planets.Ketu = toPoint(
        normalizeLongitude(nodeResult.longitude + 180),
        -nodeResult.longitudeSpeed
    )
    planets.Ascendant = toPoint(housesResult.ascendant, 0)

    const houses: SwissEphChart["houses"] = {}
    const houseValues = Array.isArray(housesResult.house) ? housesResult.house : []
    for (let i = 0; i < 12; i++) {
        const houseLongitude = houseValues[i] ?? 0
        const parsed = longitudeToSign(houseLongitude)
        houses[String(i + 1)] = {
            sign: parsed.sign,
            degree: parsed.degree,
            longitude: parsed.longitude,
        }
    }

    const ayanamsa = isVedic ? await sweGetAyanamsaUt(julianDayUt) : null

    return {
        system,
        ayanamsa: ayanamsa != null ? Number(ayanamsa.toFixed(6)) : null,
        ascendant: toPoint(housesResult.ascendant, 0),
        mc: toPoint(housesResult.mc, 0),
        planets,
        houses,
        aspects: getAspects(planets),
        raw: {
            julianDayUt: Number(julianDayUt.toFixed(6)),
            houseSystem,
        },
    }
}
