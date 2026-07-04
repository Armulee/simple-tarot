import { generateObject } from "ai"
import { z } from "zod"

import { synastrySchema } from "@/lib/chat/synastry-schema"
import { buildChartData } from "@/lib/astrology/build-chart-data"
import type { SwissEphChart } from "@/lib/astrology/types"

const MODEL = "deepseek/deepseek-v3.2"

const personBirthSchema = z.object({
    name: z.string().trim().min(1).max(80).nullable().optional(),
    day: z.number().int().min(1).max(31),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(1).max(3000),
    hour: z.number().int().min(0).max(23).nullable().optional(),
    minute: z.number().int().min(0).max(59).nullable().optional(),
    country: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    lat: z.number().nullable().optional(),
    lng: z.number().nullable().optional(),
    timezone: z.number().nullable().optional(),
})

type PersonBirth = z.infer<typeof personBirthSchema>

const requestSchema = z.object({
    question: z.string().trim().min(1),
    locale: z.string().optional(),
    personA: personBirthSchema,
    personB: personBirthSchema,
})

const SYSTEM_PROMPT = `You are an astrology synastry (relationship compatibility) engine for AskingFate.

You receive two people's key placements (Ascendant, Sun, Moon, Mercury, Venus, Mars) and the asker's question. Person A is the asker; person B is the other person.

Produce a compatibility reading:
- personA / personB: a short "headline" vibe and a 2-3 sentence summary of how each person shows up in love and relationships, grounded in their placements (Sun = core self, Moon = emotional needs, Venus = love style, Mars = desire/drive, Ascendant = first impression). Do NOT just name the signs — describe the person.
- compatibilityScore: an honest 0-100 overall score. Use the real chemistry of the placements (elemental harmony, Venus-Mars interplay, Moon comfort, Sun-Moon links). Don't default to a flattering number.
- dimensions: 2-4 scored sub-areas relevant to the question (e.g. Love, Communication, Trust, Passion, Long-term).
- comparison: 3-5 sentences on the couple's dynamic — where they click and where they clash. Be specific and balanced, not generic.
- interpretation: directly answer the asker's question in 3-6 sentences, grounded in the comparison. Be warm but honest; give them something real to act on.

CRITICAL: Write every prose field in the user's language (given by the locale). Be specific, never wishy-washy.`

function summarizeChart(chart: SwissEphChart | undefined, label: string): string {
    if (!chart) return `${label}: (chart unavailable)`
    const sign = (key: string) => chart.planets[key]?.sign ?? "unknown"
    return `${label}: Ascendant ${chart.ascendant.sign}, Sun ${sign(
        "Sun",
    )}, Moon ${sign("Moon")}, Mercury ${sign("Mercury")}, Venus ${sign(
        "Venus",
    )}, Mars ${sign("Mars")} (system: ${chart.system})`
}

function toBirthInput(person: PersonBirth) {
    return {
        day: person.day,
        month: person.month,
        year: person.year,
        hour: person.hour ?? null,
        minute: person.minute ?? null,
        timezone: person.timezone ?? 0,
        lat: person.lat ?? 0,
        lng: person.lng ?? 0,
        country: person.country ?? null,
        state: person.state ?? null,
    }
}

export async function POST(req: Request) {
    try {
        const parsed = requestSchema.safeParse(await req.json())
        if (!parsed.success) {
            return new Response("Invalid request", { status: 400 })
        }
        const { question, locale = "en", personA, personB } = parsed.data

        const [aData, bData] = await Promise.all([
            buildChartData({ birth: toBirthInput(personA) }, locale),
            buildChartData({ birth: toBirthInput(personB) }, locale),
        ])
        const aChart = aData.charts[0]
        const bChart = bData.charts[0]

        const labelA = personA.name ? `Person A (${personA.name})` : "Person A (the asker)"
        const labelB = personB.name ? `Person B (${personB.name})` : "Person B"

        const prompt = `Answer language (locale): ${locale}

${summarizeChart(aChart, labelA)}
${summarizeChart(bChart, labelB)}

The asker's question:
${question}`

        const { object: result } = await generateObject({
            model: MODEL,
            schema: synastrySchema,
            system: SYSTEM_PROMPT,
            prompt,
        })

        return Response.json({
            personA: {
                name: personA.name ?? null,
                sunSign: aChart?.planets?.Sun?.sign ?? null,
                ascendant: aChart?.ascendant?.sign ?? null,
            },
            personB: {
                name: personB.name ?? null,
                sunSign: bChart?.planets?.Sun?.sign ?? null,
                ascendant: bChart?.ascendant?.sign ?? null,
            },
            result,
        })
    } catch (error) {
        console.error("[synastry] failed:", error)
        return new Response("Failed to compute synastry", { status: 500 })
    }
}
