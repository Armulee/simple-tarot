import { streamObject } from "ai"
import { z } from "zod"
import { buildChartData } from "@/lib/astrology/build-chart-data"
import {
    getDefaultAstrologySystem,
    resolveBirthTime,
} from "@/lib/astrology/intake"
import { horoscopeInterpretationSchema } from "@/lib/astrology/schema"
import { getHoroscopeInterpretationPrompt } from "@/lib/prompts"
import {
    hydrateQuestionTimeRange,
    questionTimeRangePayloadSchema,
    resolveQuestionTimeRangeAsync,
} from "@/lib/astrology/question-time-range"
import { getCodexTransitWindow } from "@/lib/astrology/ephemeris-codex"
import {
    isBirthChartSuitabilityQuestion,
    classifyQuestionTopic,
    isNatalChartReferenceQuestion,
    detectCalendarRecommendationIntent,
    hydrateRelevantPlanets,
    questionClassificationSchema,
    type QuestionClassification,
} from "@/lib/astrology/question-intent"
import type { PersonalizedTransitAspectsResult } from "@/lib/astrology/transit-aspects"
import { normalizeConversationContext } from "@/lib/astrology/question-context"
import {
    buildNatalLongitudes,
    buildPersonalizedTransitAspects,
    buildTransitLongitudesFromSwissPlanets,
} from "@/lib/astrology/transit-aspects"
import { queryCalendarDates } from "@/lib/calendar/query"
import type { CalendarPlanTier } from "@/lib/calendar/access-window"
import { isSingleDayQuestionRange } from "@/lib/astrology/single-day"
import {
    buildMyCalendarDaySnapshotForHoroscope,
    resolveSessionPrimaryChartSystem,
} from "@/lib/calendar/my-calendar-day-snapshot"

// Chart data (with aspects) is now served separately via /api/horoscope/chart-data.
// This route only streams the AI interpretation.

const MODEL = "deepseek/deepseek-v4-pro"
const DAY_MS = 24 * 60 * 60 * 1000
const ASPECT_PADDING_DAYS = 90
const MIN_FILTERED_EVENTS = 3

function detectQuestionLanguage(text: string): string {
    if (/[\u0E80-\u0EFF]/.test(text)) return "Lao"
    if (/[\u0E00-\u0E7F]/.test(text)) return "Thai"
    if (/[\u3040-\u30FF\u4E00-\u9FFF]/.test(text)) return "Japanese"
    if (/[\uAC00-\uD7AF]/.test(text)) return "Korean"
    if (/[\u0400-\u04FF]/.test(text)) return "Russian"
    return "English"
}

function addUtcDays(date: Date, days: number) {
    return new Date(date.getTime() + days * DAY_MS)
}

function toIsoDate(date: Date) {
    return date.toISOString().slice(0, 10)
}

function filterAspectsByRelevantPlanets(
    aspects: PersonalizedTransitAspectsResult,
    relevantPlanets: readonly string[],
): PersonalizedTransitAspectsResult {
    const planetSet = new Set(relevantPlanets)

    const filteredExact = aspects.exact
        ? {
              ...aspects.exact,
              events: aspects.exact.events.filter((e) =>
                  planetSet.has(e.transitPlanet),
              ),
          }
        : null
    const filteredRange = aspects.range
        ? {
              ...aspects.range,
              events: aspects.range.events.filter((e) =>
                  planetSet.has(e.transitPlanet),
              ),
          }
        : null

    const exactTooFew =
        filteredExact &&
        filteredExact.events.length < MIN_FILTERED_EVENTS &&
        (aspects.exact?.events.length ?? 0) >= MIN_FILTERED_EVENTS
    const rangeTooFew =
        filteredRange &&
        filteredRange.events.length < MIN_FILTERED_EVENTS &&
        (aspects.range?.events.length ?? 0) >= MIN_FILTERED_EVENTS

    return {
        ...aspects,
        exact: exactTooFew ? aspects.exact : filteredExact,
        range: rangeTooFew ? aspects.range : filteredRange,
    }
}

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
    /**
     * The signed-in user's previously computed natal chart, if any.
     * When provided AND the question is a natal-chart reference (e.g. "what
     * does my Saturn mean?"), the prompt loosens its "no astrology jargon"
     * rule so the answer can cite real placements.
     */
    storedBirthChart: z
        .object({
            houses: z.record(z.string(), z.unknown()).nullable().optional(),
            planets: z.record(z.string(), z.unknown()).nullable().optional(),
        })
        .nullable()
        .optional(),
    planTier: z.enum(["free", "basic", "pro"]).optional(),
    classification: questionClassificationSchema.optional(),
    questionRange: questionTimeRangePayloadSchema.optional(),
})

function startOfLocalDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function maxDate(left: Date, right: Date) {
    return left > right ? left : right
}

export async function POST(req: Request) {
    try {
        const body = requestSchema.parse(await req.json())
        const locale = body.locale || "en"
        const system =
            body.system ||
            getDefaultAstrologySystem(locale) ||
            ("vedic_sidereal" as const)
        const questionRange = body.questionRange
            ? hydrateQuestionTimeRange(body.questionRange)
            : await resolveQuestionTimeRangeAsync(body.question, {
                  hintedTransitDate: body.transit
                      ? {
                            day: body.transit.day ?? null,
                            month: body.transit.month ?? null,
                            year: body.transit.year ?? null,
                        }
                      : null,
              })

        const classification: QuestionClassification = body.classification
            ? hydrateRelevantPlanets(body.classification)
            : {
                  replyStrategy: "general",
                  questionTopic: (() => {
                      const t = classifyQuestionTopic(body.question)
                      return {
                          topic: t.topic,
                          relevantPlanets: [...t.relevantPlanets],
                      }
                  })(),
                  predictiveIntent: false,
                  naturalNatalReference: isNatalChartReferenceQuestion(
                      body.question,
                  ),
                  birthChartSuitability: isBirthChartSuitabilityQuestion(
                      body.question,
                  ),
                  calendarRecommendationIntent:
                      detectCalendarRecommendationIntent(body.question),
              }
        const aspectRange = {
            ...questionRange,
            startDate: addUtcDays(
                questionRange.startDate,
                -ASPECT_PADDING_DAYS,
            ),
            endDate: addUtcDays(questionRange.endDate, ASPECT_PADDING_DAYS),
            startDateIso: toIsoDate(
                addUtcDays(questionRange.startDate, -ASPECT_PADDING_DAYS),
            ),
            endDateIso: toIsoDate(
                addUtcDays(questionRange.endDate, ASPECT_PADDING_DAYS),
            ),
            durationDays: questionRange.durationDays + ASPECT_PADDING_DAYS * 2,
        }
        const [codexTransit, aspectCodexTransit] = await Promise.all([
            getCodexTransitWindow(questionRange),
            getCodexTransitWindow(aspectRange),
        ])
        const suitabilityQuestion = classification.birthChartSuitability
        const naturalNatalReference = classification.naturalNatalReference
        const questionTopic = {
            topic: classification.questionTopic.topic,
            relevantPlanets:
                classification.questionTopic.relevantPlanets ?? [],
        }
        const calendarRecommendationIntent =
            classification.calendarRecommendationIntent
        const conversationContext = normalizeConversationContext(
            body.conversationContext,
        )
        const conversationContextText = conversationContext?.contextText ?? ""

        const questionLang = detectQuestionLanguage(body.question)
        const chartLocale =
            questionLang === "Thai" || questionLang === "Lao" ? "th" : "en"

        const chartDataResult = await buildChartData(
            {
                birth: body.birth,
                system: body.system,
                transit: body.transit ?? undefined,
                questionRange,
                transitDataSource: codexTransit.source,
                codexTransitSummary: codexTransit.summary,
            },
            chartLocale,
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
        const rawTransitAspects = buildPersonalizedTransitAspects({
            questionRange: {
                source: questionRange.source,
                startDateIso: questionRange.startDateIso,
                endDateIso: questionRange.endDateIso,
            },
            natalLongitudes,
            codexRows: aspectCodexTransit.rows,
            fallbackExactTransitLongitudes,
        })
        const personalizedTransitAspects =
            questionTopic.topic !== "general"
                ? filterAspectsByRelevantPlanets(
                      rawTransitAspects,
                      questionTopic.relevantPlanets,
                  )
                : rawTransitAspects

        const sessionPrimarySystem = resolveSessionPrimaryChartSystem(
            locale,
            body.birth.country,
            body.system,
        )
        const myCalendarDay =
            isSingleDayQuestionRange({
                durationDays: questionRange.durationDays,
                source: questionRange.source,
            }) && primaryBirthChart?.planets
                ? await buildMyCalendarDaySnapshotForHoroscope({
                      birth: body.birth,
                      isoDate: questionRange.startDateIso,
                      codexRows: codexTransit.rows,
                      textLocale: locale,
                      sessionChartSystem: sessionPrimarySystem,
                      sessionNatalPlanets:
                          primaryBirthChart.planets as Record<string, unknown>,
                  })
                : null

        const resolvedTime = resolveBirthTime({
            hour: body.birth.hour ?? null,
            minute: body.birth.minute ?? null,
            timeHint: body.birth.timeHint ?? "unknown",
        })

        const chartDataForPrompt = {
            ...chartDataResult,
            personalizedTransitAspects: undefined,
        }
        const chartData = JSON.stringify(chartDataForPrompt)

        const now = new Date()
        const currentDateTime = now.toLocaleString("en-CA", {
            dateStyle: "full",
            timeStyle: "long",
            timeZone: "UTC",
        })
        const today = startOfLocalDay(now)
        const calendarRecommendation = calendarRecommendationIntent
            ? await queryCalendarDates({
                  intent: calendarRecommendationIntent.intent,
                  locale,
                  birth: body.birth,
                  planTier: (body.planTier ?? "free") as CalendarPlanTier,
                  today,
                  startDate:
                      questionRange.source === "default_30d"
                          ? undefined
                          : maxDate(today, questionRange.startDate),
                  endDate:
                      questionRange.source === "default_30d"
                          ? undefined
                          : questionRange.endDate,
              })
            : null

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
            questionTopic,
            questionLanguage: questionLang,
            storedBirthChart: body.storedBirthChart ?? null,
            isNatalChartReferenceQuestion: naturalNatalReference,
            calendarRecommendation,
            myCalendarDay,
        })

        console.log(
            `[horoscope/question] prompt size: ${(prompt.length / 1024).toFixed(1)}KB (~${Math.ceil(prompt.length / 4)} tokens)`,
        )

        const allowNatalReferences = Boolean(
            naturalNatalReference &&
                body.storedBirthChart &&
                (body.storedBirthChart.houses || body.storedBirthChart.planets),
        )
        const terminologySystemRule = allowNatalReferences
            ? `Because the user is asking about a feature of their OWN saved natal chart (see <saved_birth_chart> in the prompt), you MAY name specific planets (Sun, Moon, Mars, Venus, Saturn, etc.), zodiac signs (Aries, Pisces, ราศีเมษ, ราศีมีน, etc.), and houses when it directly answers the natal-chart question — keep it in plain conversational language. Avoid heavy jargon (conjunction, opposition, square, trine, sextile, orb, transit, เล็ง, ตรีโกณ, จตุโกณ, ร่วม). For unrelated transit / timing / life-advice content, keep translating astrology into plain life impact.`
            : `ABSOLUTELY FORBIDDEN in interpretation text: planet names (Saturn, Jupiter, Mars, Venus, Rahu, ดาวเสาร์, ดาวพฤหัส, ดาวอังคาร, ดาวศุกร์, ราหู, จันทร์, etc.), zodiac sign names (Aries, Pisces, ราศีเมษ, ราศีมีน, etc.), and astrology terms (conjunction, opposition, square, trine, sextile, orb, transit, เล็ง, ตรีโกณ, จตุโกณ, ร่วม, etc.). Translate all astrological meaning into life impact — emotions, energy, timing, advice.`

        const result = streamObject({
            model: MODEL,
            // Force JSON streaming mode so partial fields stream to the client
            // token-by-token. The default 'auto' often resolves to tool-call
            // mode on DeepSeek, which buffers the whole JSON payload until the
            // tool call completes (the response then "pops in" all at once).
            mode: "json",
            schema: horoscopeInterpretationSchema,
            system: `You are an expert astrologer who writes for a general audience with ZERO astrology knowledge.
You respond as a female. Astra is a female oracle. Use feminine voice and perspective in all responses.
Be clear, kind, and practical. Never claim fixed destiny.
Write like a caring friend giving life advice — warm, conversational, and in plain everyday language. Write the way a native speaker would text a close friend. NEVER sound like an astrology textbook.

${terminologySystemRule}

LANGUAGE DETECTION RESULT: The user's question is in ${questionLang}.
CRITICAL: You MUST write your ENTIRE response (interpretation, conclusion, suggestions, aspectInsights) in ${questionLang}. Do NOT use any other language. If the question is in English, every single word of your output must be in English. If in Thai, every word in Thai. Ignore the language of any chart data or internal context — ONLY the user's question language matters.

CRITICAL: When citing time periods, use dates in the SAME language as your output. Thai output = Thai month names (กุมภาพันธ์, มีนาคม, etc.). English output = English month names (February, March, etc.). Example: Thai "22 กุมภาพันธ์ 2026 ถึง 22 กุมภาพันธ์ 2028"; English "February 22, 2026 to February 22, 2028". Do NOT use ISO format (YYYY-MM-DD). Never mix languages (e.g. Thai text with "February").

If the prompt includes a <calendar_recommendation> block, that block is the source of truth for any recommended single day. Follow its topCandidate date exactly and use the transit data only to explain why that day stands out.

Output structure: Provide interpretation (main reading), conclusion (short calming wrap-up), and suggestions (EXACTLY 3–4 very short, casual follow-up prompts the user could ask next — single line each, like quick texts, not long formal questions).`,
            prompt,
            temperature: 0.6,
        })

        result.object
            .then((obj) => {
                console.log(obj)
            })
            .catch((err) => {
                console.log(err)
            })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("[horoscope/question] request failed:", error)
        const message =
            error instanceof Error ? error.message : "HOROSCOPE_FAILED"
        return new Response(message, { status: 400 })
    }
}
