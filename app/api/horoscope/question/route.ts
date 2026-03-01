import { streamObject } from "ai"
import { z } from "zod"
import { buildChartData } from "@/lib/astrology/build-chart-data"
import {
    getDefaultAstrologySystem,
    resolveBirthTime,
} from "@/lib/astrology/intake"
import { horoscopeInterpretationSchema } from "@/lib/astrology/schema"
import { getHoroscopeInterpretationPrompt } from "@/lib/prompts"
import { resolveQuestionTimeRange } from "@/lib/astrology/question-time-range"
import { getCodexTransitWindow } from "@/lib/astrology/ephemeris-codex"
import { isBirthChartSuitabilityQuestion } from "@/lib/astrology/question-intent"
import { normalizeConversationContext } from "@/lib/astrology/question-context"
import {
    buildNatalLongitudes,
    buildPersonalizedTransitAspects,
    buildTransitLongitudesFromSwissPlanets,
} from "@/lib/astrology/transit-aspects"

const MODEL = "openai/gpt-4o-mini"

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
    conversationContext: z
        .object({
            userMainPoint: z.string().optional(),
            userMessageTimeline: z.array(z.string()).optional(),
            assistantSummaryTimeline: z.array(z.string()).optional(),
            contextText: z.string().optional(),
            totalMessages: z.number().optional(),
        })
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
        const questionRange = resolveQuestionTimeRange(body.question, {
            hintedTransitDate: body.transit
                ? {
                      day: body.transit.day ?? null,
                      month: body.transit.month ?? null,
                      year: body.transit.year ?? null,
                  }
                : null,
        })
        const codexTransit = await getCodexTransitWindow(questionRange)
        const suitabilityQuestion = isBirthChartSuitabilityQuestion(
            body.question,
        )
        const conversationContext = normalizeConversationContext(
            body.conversationContext,
        )
        const conversationContextText = conversationContext?.contextText ?? ""

        const chartDataResult = await buildChartData(
            {
                birth: body.birth,
                system: body.system,
                transit: body.transit ?? undefined,
                questionRange,
                transitDataSource: codexTransit.source,
                codexTransitSummary: codexTransit.summary,
            },
            locale,
        )
        const primaryBirthChart = chartDataResult.charts?.[0]
        const primaryTransitChart = chartDataResult.transit?.charts?.[0]
        const natalLongitudes = buildNatalLongitudes(
            primaryBirthChart?.planets ?? {},
        )
        const fallbackExactTransitLongitudes =
            buildTransitLongitudesFromSwissPlanets(
                primaryTransitChart?.planets ?? {},
            )
        const personalizedTransitAspects = buildPersonalizedTransitAspects({
            questionRange: {
                source: questionRange.source,
                startDateIso: questionRange.startDateIso,
                endDateIso: questionRange.endDateIso,
            },
            natalLongitudes,
            codexRows: codexTransit.rows,
            fallbackExactTransitLongitudes,
        })
        const chartDataWithAspects = {
            ...chartDataResult,
            personalizedTransitAspects,
        }

        const resolvedTime = resolveBirthTime({
            hour: body.birth.hour ?? null,
            minute: body.birth.minute ?? null,
            timeHint: body.birth.timeHint ?? "unknown",
        })

        const chartData = JSON.stringify(chartDataWithAspects, null, 2)

        const now = new Date()
        const currentDateTime = now.toLocaleString("en-CA", {
            dateStyle: "full",
            timeStyle: "long",
            timeZone: "UTC",
        })

        const prompt = getHoroscopeInterpretationPrompt({
            question: body.question,
            systemMode: system,
            chartData,
            isApproximateTime: resolvedTime.isApproximate,
            usedLocationFallback: Boolean(body.birth.usedLocationFallback),
            currentDateTime,
            questionRange: {
                startDateIso: questionRange.startDateIso,
                endDateIso: questionRange.endDateIso,
                durationDays: questionRange.durationDays,
                source: questionRange.source,
            },
            transitDataSource: codexTransit.source,
            codexTransitSummary: codexTransit.summary,
            codexCoverage: codexTransit.coverage,
            personalizedTransitAspects,
            isBirthChartSuitabilityQuestion: suitabilityQuestion,
            conversationContextText,
            userMainPoint: conversationContext?.userMainPoint ?? "",
        })

        const result = await streamObject({
            model: MODEL,
            schema: horoscopeInterpretationSchema,
            system: `You are an expert astrologer who writes for a general audience.
You respond as a female. Astra is a female oracle. Use feminine voice and perspective in all responses.
Be clear, kind, and practical. Never claim fixed destiny.
Write in plain, everyday language. Reference key planetary positions as evidence for your answer, but explain them simply for a general audience. Focus on what will happen and how the user might feel—answer their question directly.

CRITICAL: Write your interpretation in the EXACT SAME language as the user's question. If the question is in Thai, respond entirely in Thai. If in English, respond in English. Match whatever language the user used—never default to English when the question is in another language.

CRITICAL: When citing time periods, use dates in the SAME language as your output. Thai output = Thai month names (กุมภาพันธ์, มีนาคม, etc.). English output = English month names (February, March, etc.). Example: Thai "22 กุมภาพันธ์ 2026 ถึง 22 กุมภาพันธ์ 2028"; English "February 22, 2026 to February 22, 2028". Do NOT use ISO format (YYYY-MM-DD). Never mix languages (e.g. Thai text with "February").

Output structure: Provide interpretation (main reading), conclusion (short calming wrap-up), and suggestions (3-5 follow-up questions the user could ask next, written as user questions).`,
            prompt,
            temperature: 0.8,
        })

        result.object
            .then((obj) => {
                console.log(
                    "[horoscope/question] AI object:",
                    JSON.stringify(obj, null, 2),
                )
            })
            .catch((err) => {
                console.error("[horoscope/question] AI object error:", err)
            })

        const streamRes = result.toTextStreamResponse()
        const chartDataB64 = Buffer.from(
            JSON.stringify(chartDataWithAspects),
        ).toString("base64")

        return new Response(streamRes.body, {
            status: streamRes.status,
            headers: new Headers({
                ...Object.fromEntries(streamRes.headers),
                "X-AskingFate-Chart-Data": chartDataB64,
            }),
        })
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "HOROSCOPE_FAILED"
        return new Response(message, { status: 400 })
    }
}
