import { NextResponse } from "next/server"
import { streamText } from "ai"
import { BirthChartGenerator } from "vedic-astrology-api/lib/utils/birthchart"
import {
    calculatePlanetaryPositions,
    calculateAscendant,
    createDate,
} from "vedic-astrology-api/lib/utils/common"
import { formatBirthChartForPrompt } from "@/lib/birth-chart-utils"

const MODEL = "openai/gpt-4.1-mini"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        // Handle both direct parameters and prompt-based format
        let params: {
            birthDay?: string
            birthMonth?: string
            birthYear?: string
            birthHour?: string
            birthMinute?: string
            transitDay?: string
            transitMonth?: string
            transitYear?: string
            transitHour?: string
            transitMinute?: string
            timezone?: string
            lat?: string
            lng?: string
            question?: string
            birthDateStr?: string
            birthTimeStr?: string
            transitDateStr?: string
            transitTimeStr?: string
            locationStr?: string
        } = body

        // If prompt is provided (from useCompletion), parse it
        if (body.prompt && typeof body.prompt === 'string') {
            try {
                params = JSON.parse(body.prompt)
            } catch {
                // If parsing fails, use the prompt as-is (fallback)
                return NextResponse.json(
                    { error: "Invalid prompt format" },
                    { status: 400 }
                )
            }
        }

        const {
            birthDay,
            birthMonth,
            birthYear,
            birthHour,
            birthMinute,
            transitDay,
            transitMonth,
            transitYear,
            transitHour,
            transitMinute,
            timezone,
            lat,
            lng,
            question,
            birthDateStr,
            birthTimeStr,
            transitDateStr,
            transitTimeStr,
            locationStr,
        } = params

        if (
            !birthDay ||
            !birthMonth ||
            !birthYear ||
            !birthHour ||
            !birthMinute ||
            !transitDay ||
            !transitMonth ||
            !transitYear ||
            !transitHour ||
            !transitMinute ||
            timezone == null ||
            !lat ||
            !lng ||
            !question
        ) {
            return NextResponse.json(
                { error: "Missing required parameters" },
                { status: 400 }
            )
        }

        // Create birth chart generator instance
        const birthChartGenerator = new BirthChartGenerator()

        // Calculate birth chart
        const birthDate = createDate(
            parseInt(birthYear),
            parseInt(birthMonth),
            parseInt(birthDay),
            parseInt(birthHour),
            parseInt(birthMinute),
            parseFloat(timezone)
        )

        const { positions: birthPositions } = calculatePlanetaryPositions(
            birthDate,
            Number(lat),
            Number(lng)
        )
        const birthAscendant = calculateAscendant(birthDate, Number(lat), Number(lng))

        const birthChart = birthChartGenerator.generateBirthChart(
            birthPositions,
            birthAscendant
        )

        // Calculate transit chart
        const transitDate = createDate(
            parseInt(transitYear),
            parseInt(transitMonth),
            parseInt(transitDay),
            parseInt(transitHour),
            parseInt(transitMinute),
            parseFloat(timezone)
        )

        const { positions: transitPositions } = calculatePlanetaryPositions(
            transitDate,
            Number(lat),
            Number(lng)
        )
        const transitAscendant = calculateAscendant(transitDate, Number(lat), Number(lng))

        const transitChart = birthChartGenerator.generateBirthChart(
            transitPositions,
            transitAscendant
        )

        // Format birth chart data for prompt
        const systemPrompt = formatBirthChartForPrompt(
            birthChart.planets,
            birthDateStr || `${birthDay} ${getMonthName(parseInt(birthMonth))} ${birthYear}`,
            birthTimeStr || `${birthHour.padStart(2, "0")}:${birthMinute.padStart(2, "0")}${parseInt(birthHour) >= 12 ? "PM" : "AM"}`,
            locationStr || "Unknown Location",
            transitDateStr || `${transitDay} ${getMonthName(parseInt(transitMonth))} ${transitYear}`,
            transitTimeStr || `${transitHour.padStart(2, "0")}:${transitMinute.padStart(2, "0")}${parseInt(transitHour) >= 12 ? "PM" : "AM"}`
        )

        // Add transit positions to the prompt if needed
        let transitInfo = ""
        const targetPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Neptune']
        const transitPositionsList: string[] = []
        
        targetPlanets.forEach(planetName => {
            const pKey = Object.keys(transitChart.planets).find(k => k.toLowerCase() === planetName.toLowerCase())
            const position = pKey ? transitChart.planets[pKey] : null
            
            if (typeof position === "object" && position !== null) {
                const p = position as { sign: string; [key: string]: unknown }
                const sign = normalizeSign(p.sign)
                transitPositionsList.push(`- ${planetName} in ${sign.toLowerCase()}`)
            }
        })

        if (transitPositionsList.length > 0) {
            transitInfo = `\n\nTransit chart positions (for ${transitDateStr || `${transitDay} ${getMonthName(parseInt(transitMonth))} ${transitYear}`}):\n${transitPositionsList.join('\n')}`
        }

        // Create user prompt with question
        const userPrompt = `${systemPrompt}${transitInfo}\n\nUser's question: "${question}"\n\nPlease provide a detailed horoscope reading based on the birth chart and transit positions, answering the user's question. Respond in the same language as the question.`

        const result = streamText({
            model: MODEL,
            system: `You are an expert Thai horoscopic fortune teller based on real star positions, making predictions without user bias. You provide detailed, personalized horoscope readings based on Vedic astrology principles and the Lagna system.`,
            prompt: userPrompt,
        })

        return result.toUIMessageStreamResponse()
    } catch (error) {
        console.error("Error generating horoscope:", error)
        return NextResponse.json(
            { error: "Failed to generate horoscope" },
            { status: 500 }
        )
    }
}

function getMonthName(month: number): string {
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]
    return months[month - 1] || ""
}

function normalizeSign(sign: string): string {
    const ZODIAC_SIGNS = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ]
    
    const SANSKRIT_SIGNS: Record<string, string> = {
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
    
    const normalized = ZODIAC_SIGNS.find(
        (s) => s.toLowerCase() === sign.toLowerCase()
    )
    if (normalized) return normalized
    
    const englishSign = SANSKRIT_SIGNS[sign]
    if (englishSign) return englishSign
    
    const key = Object.keys(SANSKRIT_SIGNS).find(
        (k) => k.toLowerCase() === sign.toLowerCase()
    )
    if (key) return SANSKRIT_SIGNS[key]
    
    return sign.charAt(0).toUpperCase() + sign.slice(1).toLowerCase()
}
