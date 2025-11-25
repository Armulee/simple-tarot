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
    "Rahu",
    "Ketu",
]

export const SANSKRIT_SIGNS: Record<string, string> = {
    "Mesha": "Aries",
    "Vrishabha": "Taurus",
    "Mithuna": "Gemini",
    "Karka": "Cancer",
    "Simha": "Leo",
    "Kanya": "Virgo",
    "Tula": "Libra",
    "Vrishchika": "Scorpio",
    "Dhanu": "Sagittarius",
    "Makara": "Capricorn",
    "Kumbha": "Aquarius",
    "Meena": "Pisces"
}

// Planet Stat Types based on the 9 Grahas (plus extras if needed, but user asked for 9)
// We will map the 9 planets directly as stats.
export type PlanetStatType = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn' | 'Rahu' | 'Ketu'

export interface PlanetStatValue {
    value: number
    status: 'exalted' | 'debilitated' | 'normal'
}

export type PlanetStats = Record<PlanetStatType, PlanetStatValue>

// Interface for what we expect in planets/houses values
export interface AstroPoint {
    sign: string
    degree?: number | string
    isExalted?: boolean
    isDebilitated?: boolean
    shadbala?: {
        percentage: number
        total?: number
    }
    [key: string]: unknown
}

// Deep exaltation degrees (approximate peaks)
const DEEP_EXALTATION: Record<string, { sign: string, degree: number }> = {
    Sun: { sign: "Aries", degree: 10 },
    Moon: { sign: "Taurus", degree: 3 },
    Mars: { sign: "Capricorn", degree: 28 },
    Mercury: { sign: "Virgo", degree: 15 },
    Jupiter: { sign: "Cancer", degree: 5 },
    Venus: { sign: "Pisces", degree: 27 },
    Saturn: { sign: "Libra", degree: 20 },
    Rahu: { sign: "Taurus", degree: 20 }, // Rahu exalted in Taurus/Gemini
    Ketu: { sign: "Scorpio", degree: 20 }, // Ketu exalted in Scorpio/Sagittarius
}

// Dignities (Exalted/Debilitated Signs) for fallback if API doesn't provide flags
const EXALTED_SIGNS: Record<string, string[]> = {
    Sun: ["Aries"],
    Moon: ["Taurus"],
    Mars: ["Capricorn"],
    Mercury: ["Virgo"],
    Jupiter: ["Cancer"],
    Venus: ["Pisces"],
    Saturn: ["Libra"],
    Rahu: ["Taurus", "Gemini"],
    Ketu: ["Scorpio", "Sagittarius"],
}

const DEBILITATED_SIGNS: Record<string, string[]> = {
    Sun: ["Libra"],
    Moon: ["Scorpio"],
    Mars: ["Cancer"],
    Mercury: ["Pisces"],
    Jupiter: ["Capricorn"],
    Venus: ["Virgo"],
    Saturn: ["Aries"],
    Rahu: ["Scorpio", "Sagittarius"],
    Ketu: ["Taurus", "Gemini"],
}

const OWN_SIGNS: Record<string, string[]> = {
    Sun: ["Leo"],
    Moon: ["Cancer"],
    Mars: ["Aries", "Scorpio"],
    Mercury: ["Gemini", "Virgo"],
    Jupiter: ["Sagittarius", "Pisces"],
    Venus: ["Taurus", "Libra"],
    Saturn: ["Capricorn", "Aquarius"],
    Rahu: ["Aquarius"], // Co-ruler
    Ketu: ["Scorpio"], // Co-ruler
}

export function calculatePlanetStats(
    planets: Record<string, unknown>
): PlanetStats {
    const stats: Partial<PlanetStats> = {}
    
    const targetPlanets: PlanetStatType[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu']

    targetPlanets.forEach(planetName => {
        // Find data for this planet
        // Handle case sensitivity and potential variations
        const pKey = Object.keys(planets).find(k => k.toLowerCase() === planetName.toLowerCase())
        const position = pKey ? planets[pKey] : null

        let score = 50 // Base score
        let status: 'exalted' | 'debilitated' | 'normal' = 'normal'
        
        if (typeof position === "object" && position !== null) {
            const p = position as AstroPoint
            const sign = p.sign
            const degree = Number(p.degree) || 15
            
            // 1. Use Shadbala if available (direct strength)
            if (p.shadbala && typeof p.shadbala.percentage === "number") {
                score = p.shadbala.percentage
            } else {
                // Fallback calculation if shadbala missing
                // Normalize sign
                let normalizedSign = ZODIAC_SIGNS.find(s => s.toLowerCase() === sign.toLowerCase())
                if (!normalizedSign) {
                    const englishSign = SANSKRIT_SIGNS[sign] || Object.keys(SANSKRIT_SIGNS).find(k => k.toLowerCase() === sign.toLowerCase()) && SANSKRIT_SIGNS[Object.keys(SANSKRIT_SIGNS).find(k => k.toLowerCase() === sign.toLowerCase()) || ""]
                    if (englishSign) normalizedSign = englishSign
                }

                if (normalizedSign) {
                    // Check Dignities
                    if (EXALTED_SIGNS[planetName]?.includes(normalizedSign)) {
                        score += 30
                    } else if (OWN_SIGNS[planetName]?.includes(normalizedSign)) {
                        score += 20
                    } else if (DEBILITATED_SIGNS[planetName]?.includes(normalizedSign)) {
                        score -= 20
                    } else {
                        // Friendly/Neutral/Enemy logic omitted for brevity, keep minimal variation
                        score += (degree % 10) - 5 // small noise
                    }
                }
            }

            // 2. Status Determination
            if (p.isExalted) status = 'exalted'
            else if (p.isDebilitated) status = 'debilitated'
            else {
                // Fallback check
                let normalizedSign = ZODIAC_SIGNS.find(s => s.toLowerCase() === sign.toLowerCase())
                if (!normalizedSign) {
                    const englishSign = SANSKRIT_SIGNS[sign] || Object.keys(SANSKRIT_SIGNS).find(k => k.toLowerCase() === sign.toLowerCase()) && SANSKRIT_SIGNS[Object.keys(SANSKRIT_SIGNS).find(k => k.toLowerCase() === sign.toLowerCase()) || ""]
                    if (englishSign) normalizedSign = englishSign
                }
                if (normalizedSign) {
                    if (EXALTED_SIGNS[planetName]?.includes(normalizedSign)) status = 'exalted'
                    else if (DEBILITATED_SIGNS[planetName]?.includes(normalizedSign)) status = 'debilitated'
                }
            }

            // 3. Deep Exaltation Bonus (Degree Specific)
            let normalizedSign = ZODIAC_SIGNS.find(s => s.toLowerCase() === sign.toLowerCase())
            if (!normalizedSign) {
                 const englishSign = SANSKRIT_SIGNS[sign] || Object.keys(SANSKRIT_SIGNS).find(k => k.toLowerCase() === sign.toLowerCase()) && SANSKRIT_SIGNS[Object.keys(SANSKRIT_SIGNS).find(k => k.toLowerCase() === sign.toLowerCase()) || ""]
                 if (englishSign) normalizedSign = englishSign
            }

            if (normalizedSign && DEEP_EXALTATION[planetName]) {
                const exaltInfo = DEEP_EXALTATION[planetName]
                if (exaltInfo.sign === normalizedSign) {
                    const diff = Math.abs(degree - exaltInfo.degree)
                    if (diff <= 5) {
                        const bonus = (5 - diff) * 4
                        score += bonus
                        status = 'exalted' // Force exalted status
                    } else {
                        status = 'exalted'
                    }
                }
            }
            
            // Manual adjustment for explicit flags
            if (status === 'exalted') score += 10
            if (status === 'debilitated') score -= 10
        }

        // Clamp
        score = Math.min(100, Math.max(10, score))
        
        stats[planetName as PlanetStatType] = {
            value: Math.round(score),
            status
        }
    })

    return stats as PlanetStats
}

export function getZodiacRotation(sign: string): number {
    let normalizedSign = ZODIAC_SIGNS.find(
        (s) => s.toLowerCase() === sign.toLowerCase()
    )
    
    if (!normalizedSign) {
        const englishSign = SANSKRIT_SIGNS[sign] || Object.keys(SANSKRIT_SIGNS).find(k => k.toLowerCase() === sign.toLowerCase()) && SANSKRIT_SIGNS[Object.keys(SANSKRIT_SIGNS).find(k => k.toLowerCase() === sign.toLowerCase()) || ""]
        if (englishSign) {
            normalizedSign = englishSign
        }
    }

    const index = ZODIAC_SIGNS.findIndex(
        (s) => s === normalizedSign
    )
    if (index === -1) return 0
    return index * 30
}
