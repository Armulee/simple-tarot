import { generateObject } from "ai"
import { z } from "zod"

import { lifeMonitorSchema } from "@/lib/chat/life-monitor-schema"
import { buildChartData } from "@/lib/astrology/build-chart-data"
import type { SwissEphChart } from "@/lib/astrology/types"

const MODEL = "deepseek/deepseek-v3.2"

const birthSchema = z.object({
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
    subject: z.enum(["self", "character"]),
    locale: z.string().optional(),
    birth: birthSchema,
})

const SELF_PROMPT = `You are AskingFate's "Life Monitor" — a personal cosmic-weather dashboard.

You receive the asker's natal placements and the CURRENT transiting planets. Read how today's transits touch their natal chart and produce an honest dashboard about how THIS period of life feels for them.

- Write to the user in the second person ("you"), warm and grounded.
- overallScore + mood: an honest read of the overall period (don't default to flattering).
- panels: pick 4-6 of these life areas and score each (mood, love, career, money, health, growth, social). Each gets a 1-2 sentence read tied to the actual transits, with a trend (rising/steady/dipping).
- summary: 2-4 sentences on the overall weather.
- supportTip: null (this is about the user themselves).

Write every prose field in the user's language (the locale). Be specific, not generic horoscope filler.`

const CHARACTER_PROMPT = `You are AskingFate's "Life Monitor", here reading the current cosmic weather for SOMEONE THE ASKER CARES ABOUT (a saved person), based on that person's natal placements and the CURRENT transiting planets.

IMPORTANT framing (privacy & care, not surveillance):
- Speak about this person's general energy and wellbeing in the third person, as a caring outlook.
- DO NOT speculate about their private romantic life or their relationships with specific other people. Keep "love"-type content out; focus on their mood/energy, health, personal growth, social warmth, and work rhythm.
- Always include a "supportTip": one gentle suggestion for how the asker can be there for this person right now.

- overallScore + mood: an honest read of this person's current period.
- panels: pick 3-5 areas from (mood, health, growth, social, career) and score each with a 1-2 sentence read tied to the transits + a trend (rising/steady/dipping). Do NOT use the "money" or "love" areas.
- summary: 2-4 sentences on their current weather, framed supportively.

Write every prose field in the user's language (the locale). Be specific and kind.`

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
        const { subject, locale = "en", birth } = parsed.data

        const now = new Date()
        const data = await buildChartData(
            {
                birth: {
                    day: birth.day,
                    month: birth.month,
                    year: birth.year,
                    hour: birth.hour ?? null,
                    minute: birth.minute ?? null,
                    timezone: birth.timezone ?? 0,
                    lat: birth.lat ?? 0,
                    lng: birth.lng ?? 0,
                    country: birth.country ?? null,
                    state: birth.state ?? null,
                },
                // Current planetary positions (UTC "now") for the transit read.
                transit: {
                    day: now.getUTCDate(),
                    month: now.getUTCMonth() + 1,
                    year: now.getUTCFullYear(),
                    hour: now.getUTCHours(),
                    minute: now.getUTCMinutes(),
                    timezone: 0,
                    lat: birth.lat ?? 0,
                    lng: birth.lng ?? 0,
                },
            },
            locale,
        )

        const natal = data.charts[0]
        const transit = data.transit?.charts?.[0]
        const approximate = Boolean(data.birth.time.approximate)

        const prompt = `Answer language (locale): ${locale}
Today (UTC): ${now.toISOString().slice(0, 10)}
${birth.name ? `Person: ${birth.name}` : "Person: the asker"}
Birth time known: ${approximate ? "no (treat as a broad outlook)" : "yes"}

${summarizeChart(natal, "Natal chart")}
${summarizeChart(transit, "Transiting planets right now")}`

        const { object: result } = await generateObject({
            model: MODEL,
            schema: lifeMonitorSchema,
            system: subject === "character" ? CHARACTER_PROMPT : SELF_PROMPT,
            prompt,
        })

        return Response.json({
            subject,
            name: birth.name ?? null,
            sunSign: natal?.planets?.Sun?.sign ?? null,
            approximate,
            result,
        })
    } catch (error) {
        console.error("[life-monitor] failed:", error)
        return new Response("Failed to build life monitor", { status: 500 })
    }
}
