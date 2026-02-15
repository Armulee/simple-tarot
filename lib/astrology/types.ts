export type AstrologySystem = "western_tropical" | "vedic_sidereal"

export type SwissEphInput = {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    timezone: number
    lat: number
    lng: number
    houseSystem?: string
}

export type AstrologyPoint = {
    sign: string
    degree: number
    longitude: number
    speed: number
    retrograde: boolean
}

export type AstrologyHouse = {
    sign: string
    degree: number
    longitude: number
}

export type AstrologyAspect = {
    from: string
    to: string
    type: "conjunction" | "sextile" | "square" | "trine" | "opposition"
    orb: number
}

export type SwissEphChart = {
    system: AstrologySystem
    ayanamsa: number | null
    ascendant: AstrologyPoint
    mc: AstrologyPoint
    planets: Record<string, AstrologyPoint>
    houses: Record<string, AstrologyHouse>
    aspects: AstrologyAspect[]
    raw: {
        julianDayUt: number
        houseSystem: string
    }
}
