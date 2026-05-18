import SwissEph from "swisseph-wasm"
import type {
    AstrologyAspect,
    AstrologyPoint,
    AstrologySystem,
    SwissEphChart,
    SwissEphInput,
} from "@/lib/astrology/types"

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
    const isVedic = system === "vedic_sidereal"
    // Vedic astrology reads houses with the WHOLE-SIGN system by default:
    // house 1 spans the entire ascendant sign, house 2 the next sign, and
    // so on. Defaulting to Placidus on a sidereal chart causes the 2nd /
    // 10th / etc. cusps to land in adjacent signs and produces the wrong
    // zodiac label per house. Tropical / Western continues to default to
    // Placidus, which is its conventional house system.
    const houseSystem = input.houseSystem || (isVedic ? "W" : "P")
    const swe = new SwissEph()
    await swe.initSwissEph()

    try {
        const utcHour = input.hour + input.minute / 60 - input.timezone
        const julianDayUt = swe.julday(
            input.year,
            input.month,
            input.day,
            utcHour
        )

        if (isVedic) {
            swe.set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0)
        }

        const baseFlag = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED
        const iflag = isVedic ? baseFlag | swe.SEFLG_SIDEREAL : baseFlag
        const houseIflag = isVedic ? swe.SEFLG_SIDEREAL : swe.SEFLG_SWIEPH

        // houses_ex exists in swisseph-wasm but types are incomplete
        const housesResult = (
            swe as unknown as {
                houses_ex: (
                    jd: number,
                    iflag: number,
                    lat: number,
                    lng: number,
                    hsys: string
                ) => { cusps: Float64Array; ascmc: Float64Array }
            }
        ).houses_ex(
            julianDayUt,
            houseIflag,
            input.lat,
            input.lng,
            houseSystem
        )

        const nodeResult = swe.calc_ut(
            julianDayUt,
            swe.SE_TRUE_NODE,
            iflag
        ) as Float64Array

        const planetResults = PLANETS.map((planet) =>
            swe.calc_ut(julianDayUt, planet.id, iflag) as Float64Array
        )

        const planets: Record<string, AstrologyPoint> = {}
        PLANETS.forEach((planet, index) => {
            const result = planetResults[index]
            planets[planet.key] = toPoint(result[0], result[3])
        })

        planets.Rahu = toPoint(nodeResult[0], nodeResult[3])
        planets.Ketu = toPoint(
            normalizeLongitude(nodeResult[0] + 180),
            -nodeResult[3]
        )
        planets.Ascendant = toPoint(housesResult.ascmc[0], 0)

        const houses: SwissEphChart["houses"] = {}
        const cusps = housesResult.cusps
        for (let i = 0; i < 12; i++) {
            const houseLongitude = cusps[i + 1] ?? 0
            const parsed = longitudeToSign(houseLongitude)
            houses[String(i + 1)] = {
                sign: parsed.sign,
                degree: parsed.degree,
                longitude: parsed.longitude,
            }
        }

        const ayanamsa = isVedic ? swe.get_ayanamsa(julianDayUt) : null

        return {
            system,
            ayanamsa: ayanamsa != null ? Number(ayanamsa.toFixed(6)) : null,
            ascendant: toPoint(housesResult.ascmc[0], 0),
            mc: toPoint(housesResult.ascmc[1], 0),
            planets,
            houses,
            aspects: getAspects(planets),
            raw: {
                julianDayUt: Number(julianDayUt.toFixed(6)),
                houseSystem,
            },
        }
    } finally {
        swe.close()
    }
}
