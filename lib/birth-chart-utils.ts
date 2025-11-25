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

export type RPGStatType = 'leadership' | 'charm' | 'intellect' | 'vitality' | 'spirituality' | 'creativity'

export interface RPGStatValue {
    value: number
    status: 'exalted' | 'debilitated' | 'normal'
}

export type RPGStats = Record<RPGStatType, RPGStatValue>

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

// Map stats to their primary ruling planets
const STAT_RULERS: Record<RPGStatType, string[]> = {
    leadership: ["Sun", "Mars", "Saturn"],
    charm: ["Venus", "Moon"],
    intellect: ["Mercury", "Uranus", "Rahu"],
    vitality: ["Sun", "Mars", "Ascendant"],
    spirituality: ["Jupiter", "Neptune", "Ketu"],
    creativity: ["Venus", "Sun", "Neptune", "Rahu"],
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
}

export function calculateRPGStats(
    planets: Record<string, unknown>
): RPGStats {
    const rawStats: Record<RPGStatType, number> = {
        leadership: 0,
        charm: 0,
        intellect: 0,
        vitality: 0,
        spirituality: 0,
        creativity: 0,
    }

    const counts: Record<RPGStatType, number> = {
        leadership: 0,
        charm: 0,
        intellect: 0,
        vitality: 0,
        spirituality: 0,
        creativity: 0,
    }

    // Track status
    const statModifiers: Record<RPGStatType, { exalted: boolean, debilitated: boolean }> = {
        leadership: { exalted: false, debilitated: false },
        charm: { exalted: false, debilitated: false },
        intellect: { exalted: false, debilitated: false },
        vitality: { exalted: false, debilitated: false },
        spirituality: { exalted: false, debilitated: false },
        creativity: { exalted: false, debilitated: false },
    }

    Object.entries(planets).forEach(([planetName, position]) => {
        // Find matching normalized planet name
        const normalizedPlanet = PLANETS.find(
            (p) => p.toLowerCase() === planetName.toLowerCase()
        ) || planetName

        let degree = 15
        let explicitExalted = false
        let explicitDebilitated = false
        let strengthPercentage = 50 // Default average strength
        let sign = ""

        if (typeof position === "object" && position !== null) {
            const p = position as AstroPoint
            sign = p.sign
            if ("degree" in p) degree = Number(p.degree) || 15
            if (p.isExalted) explicitExalted = true
            if (p.isDebilitated) explicitDebilitated = true
            
            // Use shadbala percentage if available (Vedic strength)
            if (p.shadbala && typeof p.shadbala.percentage === "number") {
                strengthPercentage = p.shadbala.percentage
            }
        }

        // Handle Deep Exaltation Bonus
        // If planet is near its deep exaltation degree (+/- 5 deg), give massive boost
        // Normalize sign first
        let normalizedSign = ZODIAC_SIGNS.find(s => s.toLowerCase() === sign.toLowerCase())
        if (!normalizedSign) {
             const englishSign = SANSKRIT_SIGNS[sign] || Object.keys(SANSKRIT_SIGNS).find(k => k.toLowerCase() === sign.toLowerCase()) && SANSKRIT_SIGNS[Object.keys(SANSKRIT_SIGNS).find(k => k.toLowerCase() === sign.toLowerCase()) || ""]
             if (englishSign) normalizedSign = englishSign
        }

        let deepExaltationBonus = 0
        if (normalizedSign && DEEP_EXALTATION[normalizedPlanet]) {
            const exaltInfo = DEEP_EXALTATION[normalizedPlanet]
            if (exaltInfo.sign === normalizedSign) {
                const diff = Math.abs(degree - exaltInfo.degree)
                if (diff <= 5) {
                    // Very close to peak exaltation
                    deepExaltationBonus = (5 - diff) * 4 // up to 20 points
                    explicitExalted = true // Force exalted status if close
                } else {
                    explicitExalted = true
                }
            }
        }

        // Distribute strength to relevant stats
        Object.keys(rawStats).forEach((key) => {
            const k = key as RPGStatType
            
            if (STAT_RULERS[k].includes(normalizedPlanet)) {
                // This planet influences this stat
                let contribution = strengthPercentage
                
                // Apply bonuses
                contribution += deepExaltationBonus
                if (explicitExalted) contribution += 20
                if (explicitDebilitated) contribution -= 20

                // Add degree variance (small noise)
                contribution += (degree % 10) 

                rawStats[k] += contribution
                counts[k]++

                if (explicitExalted) statModifiers[k].exalted = true
                if (explicitDebilitated) statModifiers[k].debilitated = true
            }
        })
    })

    const result: Partial<RPGStats> = {}

    // Average out
    Object.keys(rawStats).forEach((key) => {
        const k = key as RPGStatType
        let val = counts[k] > 0 ? rawStats[k] / counts[k] : 50 // Default to 50 if no contributors
        
        // Clamp
        val = Math.min(100, Math.max(10, val))
        
        const finalVal = Math.round(val)

        let status: 'exalted' | 'debilitated' | 'normal' = 'normal'
        if (statModifiers[k].exalted) status = 'exalted'
        else if (statModifiers[k].debilitated) status = 'debilitated'

        result[k] = {
            value: finalVal,
            status
        }
    })

    return result as RPGStats
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
