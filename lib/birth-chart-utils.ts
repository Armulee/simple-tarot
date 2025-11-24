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
]

export const PLANETS = [
    "Sun",
    "Moon",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
    "Pluto",
    "Ascendant",
]

export interface RPGStats {
    leadership: number
    charm: number
    intellect: number
    vitality: number
    spirituality: number
    creativity: number
}

// Interface for what we expect in planets/houses values
export interface AstroPoint {
    sign: string
    degree?: number
    [key: string]: unknown
}

// Simple mapping of signs to element/quality which boost certain stats
const SIGN_MODIFIERS: Record<string, Partial<RPGStats>> = {
    Aries: { leadership: 8, vitality: 8, creativity: 4 },
    Taurus: { vitality: 6, charm: 5, creativity: 5 },
    Gemini: { intellect: 9, charm: 6 },
    Cancer: { spirituality: 7, charm: 5, creativity: 6 },
    Leo: { leadership: 10, charm: 8, creativity: 7 },
    Virgo: { intellect: 8, vitality: 5 },
    Libra: { charm: 10, intellect: 6, creativity: 7 },
    Scorpio: { vitality: 7, spirituality: 8, leadership: 6 },
    Sagittarius: { spirituality: 6, leadership: 6, intellect: 5 },
    Capricorn: { leadership: 7, vitality: 6, intellect: 5 },
    Aquarius: { intellect: 10, spirituality: 5, creativity: 6 },
    Pisces: { spirituality: 10, creativity: 9, charm: 6 },
}

const PLANET_WEIGHTS: Record<string, Partial<RPGStats>> = {
    Sun: { leadership: 10, vitality: 10, creativity: 5 },
    Moon: { charm: 5, spirituality: 8, creativity: 6 },
    Mercury: { intellect: 10, charm: 4 },
    Venus: { charm: 10, creativity: 8, spirituality: 3 },
    Mars: { leadership: 8, vitality: 9 },
    Jupiter: { spirituality: 7, leadership: 6, intellect: 6 },
    Saturn: { leadership: 6, intellect: 7 },
    Uranus: { intellect: 8, creativity: 7 },
    Neptune: { spirituality: 10, creativity: 9 },
    Pluto: { leadership: 7, vitality: 7, spirituality: 6 },
    Ascendant: { vitality: 8, leadership: 5, charm: 5 }, // Ascendant affects outward personality
}

export function calculateRPGStats(
    planets: Record<string, unknown>
): RPGStats {
    const stats: RPGStats = {
        leadership: 0,
        charm: 0,
        intellect: 0,
        vitality: 0,
        spirituality: 0,
        creativity: 0,
    }

    let planetCount = 0

    Object.entries(planets).forEach(([planet, position]) => {
        // Handle different position formats (string vs object)
        // Assuming position might be "Aries" or { sign: "Aries", ... }
        let sign = ""
        if (typeof position === "string") {
            sign = position
        } else if (
            typeof position === "object" &&
            position !== null &&
            "sign" in position
        ) {
            sign = (position as AstroPoint).sign
        }

        // Normalize sign name
        const normalizedSign = ZODIAC_SIGNS.find(
            (s) => s.toLowerCase() === sign.toLowerCase()
        )

        const normalizedPlanet = PLANETS.find(
            (p) => p.toLowerCase() === planet.toLowerCase()
        ) || planet

        if (normalizedSign) {
            planetCount++
            const signMod = SIGN_MODIFIERS[normalizedSign] || {}
            const planetMod = PLANET_WEIGHTS[normalizedPlanet] || {
                leadership: 2,
                charm: 2,
                intellect: 2,
                vitality: 2,
                spirituality: 2,
                creativity: 2,
            }

            // Add stats
            Object.keys(stats).forEach((key) => {
                const k = key as keyof RPGStats
                stats[k] += (signMod[k] || 0) + (planetMod[k] || 0)
            })
        }
    })

    // Normalize to 0-100 scale roughly
    // Assuming about 10-12 planets/points
    // Max theoretical per planet ~20 points.
    // 10 planets * 20 = 200 points max.
    // We want average around 50-70.
    
    // 15 is roughly average sum of planet+sign max points for a stat

    const finalStats = { ...stats }
    Object.keys(finalStats).forEach((key) => {
        const k = key as keyof RPGStats
        // Base value + random variance or just scaling
        // Let's do a sigmoid-like curve or simple clamp
        let val = finalStats[k] * 4 // Boost raw score
        if (planetCount > 0) val = val / (planetCount * 0.15) // Normalize somewhat
        
        // Clamp 0-100
        finalStats[k] = Math.min(100, Math.max(10, Math.round(val)))
    })

    return finalStats
}

export function getZodiacRotation(sign: string): number {
    const index = ZODIAC_SIGNS.findIndex(
        (s) => s.toLowerCase() === sign.toLowerCase()
    )
    if (index === -1) return 0
    // Aries starts at 0 (or 9 o'clock depending on render)
    // Each sign is 30 degrees
    return index * 30
}
