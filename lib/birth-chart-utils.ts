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

// Planet Stat Types based on the 9 Grahas
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
    isOwnSign?: boolean
    isFriendlySign?: boolean
    isEnemySign?: boolean
    isNeutralSign?: boolean
    shadbala?: {
        percentage: number
        total?: number
    }
    longitude?: string | number
    nakshatraNumber?: number
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
    Rahu: { sign: "Taurus", degree: 20 },
    Ketu: { sign: "Scorpio", degree: 20 },
}

// Dignities (Exalted/Debilitated Signs)
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
    Rahu: ["Aquarius"], 
    Ketu: ["Scorpio"], 
}

export function calculatePlanetStats(
    planets: Record<string, unknown>
): PlanetStats {
    const stats: Partial<PlanetStats> = {}
    
    const targetPlanets: PlanetStatType[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu']

    targetPlanets.forEach(planetName => {
        const pKey = Object.keys(planets).find(k => k.toLowerCase() === planetName.toLowerCase())
        const position = pKey ? planets[pKey] : null

        let score = 50 // Base score
        let status: 'exalted' | 'debilitated' | 'normal' = 'normal'
        
        if (typeof position === "object" && position !== null) {
            const p = position as AstroPoint
            const sign = p.sign
            const degree = Number(p.degree) || 15
            const longitude = Number(p.longitude) || 0
            const nakshatra = p.nakshatraNumber || 0
            
            // 1. Determine Base Score
            // Use Shadbala percentage if available
            if (p.shadbala && typeof p.shadbala.percentage === "number") {
                score = p.shadbala.percentage
            }

            // 2. Apply Dignity Modifiers
            // Even if Shadbala is provided (often defaults to 50 in mock), add these to create spread
            if (p.isExalted) score += 30
            if (p.isDebilitated) score -= 30
            if (p.isOwnSign) score += 20
            if (p.isFriendlySign) score += 10
            if (p.isEnemySign) score -= 10
            
            // Fallback check if flags are missing but sign is known
            let normalizedSign = ZODIAC_SIGNS.find(s => s.toLowerCase() === sign.toLowerCase())
            if (!normalizedSign) {
                const englishSign = SANSKRIT_SIGNS[sign] || Object.keys(SANSKRIT_SIGNS).find(k => k.toLowerCase() === sign.toLowerCase()) && SANSKRIT_SIGNS[Object.keys(SANSKRIT_SIGNS).find(k => k.toLowerCase() === sign.toLowerCase()) || ""]
                if (englishSign) normalizedSign = englishSign
            }

            if (normalizedSign) {
                // Manual Dignity Check (if flags weren't set or to reinforce)
                // Note: Avoid double counting if flags were accurate, but adding 
                // explicit check ensures we catch edge cases.
                // Let's trust flags first, but if shadbala is exactly 50, assume flags might need help
                // or that shadbala is a placeholder.
                
                const isDefaultShadbala = score === 50 || (p.shadbala && p.shadbala.percentage === 50)
                
                if (isDefaultShadbala) {
                    if (EXALTED_SIGNS[planetName]?.includes(normalizedSign)) score += 25
                    else if (DEBILITATED_SIGNS[planetName]?.includes(normalizedSign)) score -= 25
                    else if (OWN_SIGNS[planetName]?.includes(normalizedSign)) score += 15
                }
            }

            // 3. Degree Variance (Bell Curve-ish)
            // Center of sign (15 deg) often stronger than edges (0 or 30)
            // (15 - |degree - 15|) gives 0 at edges, 15 at center.
            // Scale to e.g., -5 to +5 adjustment relative to average?
            // Or just add directly.
            const degreeScore = (15 - Math.abs(degree - 15))
            score += (degreeScore * 0.5) // Adds 0 to 7.5 points based on centrality

            // 4. Randomness / Variance (Deterministic)
            // Use longitude/nakshatra to add "noise" so values aren't round numbers
            // Longitude 0-360.
            const variance = (longitude % 13) - 6.5 // +/- 6.5
            score += variance

            // 5. Deep Exaltation Bonus
            if (normalizedSign && DEEP_EXALTATION[planetName]) {
                const exaltInfo = DEEP_EXALTATION[planetName]
                if (exaltInfo.sign === normalizedSign) {
                    const diff = Math.abs(degree - exaltInfo.degree)
                    if (diff <= 5) {
                        score += (6 - diff) * 3 // Significant boost near peak
                        status = 'exalted'
                    } else {
                        status = 'exalted'
                    }
                }
            }

            // 6. Determine Final Status
            if (p.isExalted || status === 'exalted') status = 'exalted'
            else if (p.isDebilitated || (normalizedSign && DEBILITATED_SIGNS[planetName]?.includes(normalizedSign))) status = 'debilitated'
            
            // Manual Status Boost/Penalty to Score
            if (status === 'exalted') score += 10
            if (status === 'debilitated') score -= 10
        }

        // Clamp final score
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
