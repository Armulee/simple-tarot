import { generateObject } from "ai"
import { z } from "zod"
import { buildChartData } from "@/lib/astrology/build-chart-data"
import { getDefaultAstrologySystem, resolveBirthTime } from "@/lib/astrology/intake"
import { horoscopeInterpretationSchema } from "@/lib/astrology/schema"
import { getHoroscopeInterpretationPrompt } from "@/lib/prompts"

const MODEL = "google/gemini-2.0-flash"

const requestSchema = z.object({
    question: z.string().trim().min(1),
    locale: z.string().optional(),
    birth: z.object({
        day: z.number().int().min(1).max(31),
        month: z.number().int().min(1).max(12),
        year: z.number().int().min(1900).max(2100),
        hour: z.number().int().min(0).max(23).nullable().optional(),
        minute: z.number().int().min(0).max(59).nullable().optional(),
        timeHint: z.enum(["day", "night", "unknown"]).optional(),
        timezone: z.number(),
        lat: z.number(),
        lng: z.number(),
        country: z.string().nullable().optional(),
        state: z.string().nullable().optional(),
        usedLocationFallback: z.boolean().optional(),
    }),
    system: z.enum(["western_tropical", "vedic_sidereal", "both"]).optional(),
    transit: z
        .object({
            day: z.number().int().min(1).max(31).nullable().optional(),
            month: z.number().int().min(1).max(12).nullable().optional(),
            year: z.number().int().min(1900).max(2100).nullable().optional(),
            hour: z.number().int().min(0).max(23).nullable().optional(),
            minute: z.number().int().min(0).max(59).nullable().optional(),
            timezone: z.number().nullable().optional(),
            lat: z.number().nullable().optional(),
            lng: z.number().nullable().optional(),
            country: z.string().nullable().optional(),
            state: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
})

export async function POST(req: Request) {
    try {
        const body = requestSchema.parse(await req.json())
        const locale = body.locale || "en"
        const system =
            body.system ||
            getDefaultAstrologySystem(locale) ||
            ("vedic_sidereal" as const)

        const chartDataResult = await buildChartData(
            {
                birth: body.birth,
                system: body.system,
                transit: body.transit ?? undefined,
            },
            locale
        )

        const resolvedTime = resolveBirthTime({
            hour: body.birth.hour ?? null,
            minute: body.birth.minute ?? null,
            timeHint: body.birth.timeHint ?? "unknown",
        })

        const chartData = JSON.stringify(chartDataResult, null, 2)

        const now = new Date()
        const currentDateTime = now.toLocaleString("en-CA", {
            dateStyle: "full",
            timeStyle: "long",
            timeZone: "UTC",
        })

        const prompt = getHoroscopeInterpretationPrompt({
            question: body.question,
            locale,
            systemMode: system,
            chartData,
            isApproximateTime: resolvedTime.isApproximate,
            usedLocationFallback: Boolean(body.birth.usedLocationFallback),
            currentDateTime,
        })

        const result = await generateObject({
            model: MODEL,
            schema: horoscopeInterpretationSchema,
            system: `You are an expert astrologer who writes for a general audience.
Be clear, kind, and practical. Never claim fixed destiny.
Write in plain, everyday language. Do NOT use planet names, zodiac signs, houses, or any astrology jargon. Focus on what will happen and how the user might feel—answer their question directly.`,
            prompt,
            temperature: 0.4,
        })

        const payload = {
            interpretation: result.object.interpretation,
            planetMeanings: {},
            houseMeanings: {},
        }

        const chartDataB64 = Buffer.from(
            JSON.stringify(chartDataResult)
        ).toString("base64")

        return new Response(JSON.stringify(payload), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "X-AskingFate-Chart-Data": chartDataB64,
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "HOROSCOPE_FAILED"
        return new Response(message, { status: 400 })
    }
}
