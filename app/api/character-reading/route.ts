import { generateText } from "ai"
import { z } from "zod"

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

const requestSchema = z.object({
    question: z.string().trim().min(1),
    locale: z.string().optional(),
    person: personBirthSchema,
})

const SYSTEM_PROMPT = `You are AskingFate's astrologer, answering the asker's question ABOUT ANOTHER specific person — someone they saved as a "character" — using that person's astrology.

You receive the person's key natal placements (Ascendant, Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn) and the CURRENT transiting planets, plus the asker's question.

- Answer the asker's question directly, grounded in this person's chart. Refer to the person in the third person and use their name when one is given.
- Use natal placements for who they are: Sun = core self, Moon = emotions, Mercury = mind/communication, Venus = love/values, Mars = drive, Ascendant = outward style, Jupiter = growth, Saturn = discipline/limits. Bring in the CURRENT transits only when the question is about how they are doing lately / what is going on for them right now.
- Be specific and grounded — describe the person, never just name the signs. Write 3-6 sentences.
- Be warm and respectful. Offer astrological insight, not gossip: do not invent private facts about their relationships or personal life beyond what the chart supports.

CRITICAL: Write your entire answer in the user's language (given by the locale). Be specific, never wishy-washy.`

function summarizeChart(chart: SwissEphChart | undefined, label: string): string {
    if (!chart) return `${label}: (chart unavailable)`
    const sign = (key: string) => chart.planets[key]?.sign ?? "unknown"
    return `${label}: Ascendant ${chart.ascendant.sign}, Sun ${sign(
        "Sun",
    )}, Moon ${sign("Moon")}, Mercury ${sign("Mercury")}, Venus ${sign(
        "Venus",
    )}, Mars ${sign("Mars")}, Jupiter ${sign("Jupiter")}, Saturn ${sign(
        "Saturn",
    )}`
}

export async function POST(req: Request) {
    try {
        const parsed = requestSchema.safeParse(await req.json())
        if (!parsed.success) {
            return new Response("Invalid request", { status: 400 })
        }
        const { question, locale = "en", person } = parsed.data

        const now = new Date()
        const data = await buildChartData(
            {
                birth: {
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
                },
                // Current planetary positions (UTC "now") for "how are they
                // doing lately" style questions.
                transit: {
                    day: now.getUTCDate(),
                    month: now.getUTCMonth() + 1,
                    year: now.getUTCFullYear(),
                    hour: now.getUTCHours(),
                    minute: now.getUTCMinutes(),
                    timezone: 0,
                    lat: person.lat ?? 0,
                    lng: person.lng ?? 0,
                },
            },
            locale,
        )

        const natal = data.charts[0]
        const transit = data.transit?.charts?.[0]
        const approximate = Boolean(data.birth.time.approximate)

        const prompt = `Answer language (locale): ${locale}
Today (UTC): ${now.toISOString().slice(0, 10)}
${person.name ? `Person: ${person.name}` : "Person: (unnamed)"}
Birth time known: ${approximate ? "no (treat the rising sign / houses as approximate)" : "yes"}

${summarizeChart(natal, "Natal chart")}
${summarizeChart(transit, "Transiting planets right now")}

The asker's question about this person:
${question}

IMPORTANT: Respond in the asker's language (the locale above), ignoring the English template text.`

        const { text } = await generateText({
            model: MODEL,
            system: SYSTEM_PROMPT,
            prompt,
        })

        return Response.json({
            name: person.name ?? null,
            sunSign: natal?.planets?.Sun?.sign ?? null,
            approximate,
            text,
        })
    } catch (error) {
        console.error("[character-reading] failed:", error)
        return new Response("Failed to build character reading", { status: 500 })
    }
}
