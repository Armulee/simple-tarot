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
    "Rahu", // Added Rahu
    "Ketu", // Added Ketu
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
    [key: string]: unknown
}

// Simple mapping of signs to element/quality which boost certain stats
const SIGN_MODIFIERS: Record<string, Partial<Record<RPGStatType, number>>> = {
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

const PLANET_WEIGHTS: Record<string, Partial<Record<RPGStatType, number>>> = {
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
    Ascendant: { vitality: 8, leadership: 5, charm: 5 },
    Rahu: { creativity: 8, charm: 6, intellect: 5 },
    Ketu: { spirituality: 10, intellect: 4 },
}

// Map stats to their primary ruling planets (for determining exalted/debilitated status of the stat)
const STAT_RULERS: Record<RPGStatType, string[]> = {
    leadership: ["Sun", "Mars", "Saturn"],
    charm: ["Venus", "Moon"],
    intellect: ["Mercury", "Uranus", "Rahu"],
    vitality: ["Sun", "Mars"],
    spirituality: ["Jupiter", "Neptune", "Ketu"],
    creativity: ["Venus", "Sun", "Neptune", "Rahu"],
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

    // Track which stats have exalted/debilitated contributors
    const statModifiers: Record<RPGStatType, { exalted: boolean, debilitated: boolean }> = {
        leadership: { exalted: false, debilitated: false },
        charm: { exalted: false, debilitated: false },
        intellect: { exalted: false, debilitated: false },
        vitality: { exalted: false, debilitated: false },
        spirituality: { exalted: false, debilitated: false },
        creativity: { exalted: false, debilitated: false },
    }

    let planetCount = 0

    Object.entries(planets).forEach(([planet, position]) => {
        let sign = ""
        let degree = 15 // Default middle
        let explicitExalted = false
        let explicitDebilitated = false

        if (typeof position === "string") {
            sign = position
        } else if (
            typeof position === "object" &&
            position !== null &&
            "sign" in position
        ) {
            const p = position as AstroPoint
            sign = p.sign
            if ("degree" in p) {
                degree = Number(p.degree) || 15
            }
            if (p.isExalted) explicitExalted = true
            if (p.isDebilitated) explicitDebilitated = true
        }

        // Normalize sign name (handle Sanskrit)
        let normalizedSign = ZODIAC_SIGNS.find(
            (s) => s.toLowerCase() === sign.toLowerCase()
        )
        
        if (!normalizedSign) {
            // Try matching Sanskrit name
            const englishSign = SANSKRIT_SIGNS[sign] || Object.keys(SANSKRIT_SIGNS).find(k => k.toLowerCase() === sign.toLowerCase()) && SANSKRIT_SIGNS[Object.keys(SANSKRIT_SIGNS).find(k => k.toLowerCase() === sign.toLowerCase()) || ""]
            if (englishSign) {
                normalizedSign = englishSign
            }
        }

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

            // Calculate Degree Modifier (0 to 5 points based on degree)
            const degreeMod = (degree / 30) * 4 

            // Add stats
            Object.keys(rawStats).forEach((key) => {
                const k = key as RPGStatType
                let val = (signMod[k] || 0) + (planetMod[k] || 0)
                
                // Add degree variation to every non-zero stat contribution
                if (val > 0) val += degreeMod

                // Dignity bonuses to value
                if (explicitExalted) val += 5
                if (explicitDebilitated) val -= 2

                rawStats[k] += val

                // Update status flags if this planet rules this stat
                if (STAT_RULERS[k].includes(normalizedPlanet)) {
                    if (explicitExalted) statModifiers[k].exalted = true
                    if (explicitDebilitated) statModifiers[k].debilitated = true
                }
            })
        }
    })

    const result: Partial<RPGStats> = {}

    // Normalize and build result
    Object.keys(rawStats).forEach((key) => {
        const k = key as RPGStatType
        let val = rawStats[k] * 4 // Boost raw score
        if (planetCount > 0) val = val / (planetCount * 0.15) // Normalize
        
        // Clamp 0-100
        val = Math.min(100, Math.max(10, val))
        
        const finalVal = Math.round(val)

        // Determine final status
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
        // Try matching Sanskrit name
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
