import { generateObject } from "ai"
import { z } from "zod"
import { buildChartData } from "@/lib/astrology/build-chart-data"
import { predictionTimelineSchema } from "@/lib/astrology/schema"
import {
    getPredictionTimelinePrompt,
    type PredictionTimelineSlotScaffold,
} from "@/lib/prompts"
import { resolveQuestionTimeRangeAsync } from "@/lib/astrology/question-time-range"
import { getCodexTransitWindow } from "@/lib/astrology/ephemeris-codex"
import type { EphemerisCodexRow } from "@/lib/astrology/ephemeris-codex"
import {
    classifyQuestionTopic,
    detectPredictiveIntent,
} from "@/lib/astrology/question-intent"
import {
    buildHourlyTransitSlots,
    DEFAULT_HOURLY_SLOT_HOURS,
    hourBucketKey,
} from "@/lib/astrology/hourly-transits"
import {
    buildNatalLongitudes,
    buildTransitLongitudesFromSwissPlanets,
    computeExactTransitAspects,
    type PersonalizedTransitAspectsResult,
} from "@/lib/astrology/transit-aspects"
import { getDefaultAstrologySystem } from "@/lib/astrology/intake"

const MODEL = "deepseek/deepseek-v3.2"
const DAY_MS = 24 * 60 * 60 * 1000
const MAX_DAILY_SLOTS = 21

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

function startOfUtcDay(date: Date) {
    return new Date(
        Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate(),
        ),
    )
}

const WEEKDAY_KEYS = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
] as const

function weekdayKey(date: Date): string {
    return WEEKDAY_KEYS[date.getUTCDay()] ?? ""
}

function scoreEvents(aspects: PersonalizedTransitAspectsResult | null): number {
    if (!aspects) return 0
    const exact = aspects.exact?.events ?? []
    // Lower priorityScore = more important in transit-aspects.ts, so invert.
    let best = Number.POSITIVE_INFINITY
    for (const e of exact) {
        if (e.priorityScore < best) best = e.priorityScore
    }
    return Number.isFinite(best) ? -best : 0
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
        })
        .optional(),
})

function buildHourlySlots({
    targetDateIso,
    slots,
}: {
    targetDateIso: string
    slots: Array<{
        hour: number
        datetimeIso: string
        aspects: PersonalizedTransitAspectsResult
    }>
}): PredictionTimelineSlotScaffold[] {
    return slots.map((slot) => ({
        slotKey: `hour-${slot.hour.toString().padStart(2, "0")}`,
        datetimeIso: slot.datetimeIso,
        hour: slot.hour,
        hourBucket: hourBucketKey(slot.hour),
        dateLabel: targetDateIso,
        aspects: slot.aspects,
    }))
}

function buildDailySlots({
    startDate,
    endDate,
    rowsByDate,
    natalLongitudes,
    fallbackExactTransitLongitudes,
}: {
    startDate: Date
    endDate: Date
    rowsByDate: Map<string, EphemerisCodexRow>
    natalLongitudes: Partial<Record<string, number>>
    fallbackExactTransitLongitudes: Partial<Record<string, number>>
}): PredictionTimelineSlotScaffold[] {
    const days: Array<{
        date: Date
        iso: string
        aspects: PersonalizedTransitAspectsResult | null
    }> = []
    for (
        let cursor = startOfUtcDay(startDate);
        cursor.getTime() <= endDate.getTime();
        cursor = addUtcDays(cursor, 1)
    ) {
        const iso = toIsoDate(cursor)
        const row = rowsByDate.get(iso) ?? null
        const exact = computeExactTransitAspects({
            dateIso: iso,
            natalLongitudes,
            codexRow: row,
            fallbackTransitLongitudes: fallbackExactTransitLongitudes,
        })
        const aspects: PersonalizedTransitAspectsResult | null = exact
            ? {
                  orbDegrees: 5,
                  aspects: [],
                  exact,
                  range: null,
              }
            : null
        days.push({ date: cursor, iso, aspects })
    }

    if (days.length === 0) return []

    if (days.length <= MAX_DAILY_SLOTS) {
        return days.map((day) => ({
            slotKey: `day-${day.iso}`,
            datetimeIso: day.iso,
            dateLabel: `${weekdayKey(day.date)} ${day.iso}`,
            aspects: day.aspects,
        }))
    }

    // Bucket into MAX_DAILY_SLOTS chunks and pick the peak day per bucket.
    const bucketSize = Math.ceil(days.length / MAX_DAILY_SLOTS)
    const buckets: PredictionTimelineSlotScaffold[] = []
    for (let i = 0; i < days.length; i += bucketSize) {
        const chunk = days.slice(i, i + bucketSize)
        let peak = chunk[0]
        let peakScore = scoreEvents(peak.aspects)
        for (const candidate of chunk.slice(1)) {
            const score = scoreEvents(candidate.aspects)
            if (score > peakScore) {
                peak = candidate
                peakScore = score
            }
        }
        buckets.push({
            slotKey: `day-${peak.iso}`,
            datetimeIso: peak.iso,
            dateLabel: `${weekdayKey(peak.date)} ${peak.iso}`,
            aspects: peak.aspects,
            serverHint: `peak of ${chunk[0].iso}…${chunk[chunk.length - 1].iso}`,
        })
    }
    return buckets
}

export async function POST(req: Request) {
    try {
        const body = requestSchema.parse(await req.json())

        // Predictive intent gate: short-circuit immediately when the question
        // is not a "what will happen" style ask. This keeps the route cheap
        // for every other horoscope question.
        const predictive = detectPredictiveIntent(body.question)
        console.log(
            `[horoscope/timeline] enter — predictive=${predictive} qLen=${body.question.length}`,
        )
        if (!predictive) {
            return Response.json({ timeline: null }, { status: 200 })
        }

        const locale = body.locale || "en"
        const system =
            body.system ||
            getDefaultAstrologySystem(locale) ||
            ("vedic_sidereal" as const)

        const questionRange = await resolveQuestionTimeRangeAsync(
            body.question,
            {
                hintedTransitDate: body.transit
                    ? {
                          day: body.transit.day ?? null,
                          month: body.transit.month ?? null,
                          year: body.transit.year ?? null,
                      }
                    : null,
            },
        )
        console.log(
            `[horoscope/timeline] range source=${questionRange.source} duration=${questionRange.durationDays} granularity=${questionRange.granularity}`,
        )

        // Skip when the range is the "default 30 days" fallback — that means
        // we don't have a confident enough range to build a meaningful
        // timeline.
        if (questionRange.source === "default_30d") {
            return Response.json({ timeline: null }, { status: 200 })
        }

        const codexTransit = await getCodexTransitWindow(questionRange)

        const chartLocale =
            detectQuestionLanguage(body.question) === "Thai" ||
            detectQuestionLanguage(body.question) === "Lao"
                ? "th"
                : "en"

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

        let scaffold: PredictionTimelineSlotScaffold[] = []
        const granularity = questionRange.granularity

        if (granularity === "hourly") {
            const targetDateUtc = startOfUtcDay(questionRange.startDate)
            // For hourly slots we want the user's CURRENT-LOCATION clock so
            // "06:00" actually means dawn where the user is. Fall back to
            // birth location only if the client didn't send a transit block.
            const slotTimezone =
                body.transit?.timezone ?? body.birth.timezone
            const slotLat = body.transit?.lat ?? body.birth.lat
            const slotLng = body.transit?.lng ?? body.birth.lng
            const hourlySlots = await buildHourlyTransitSlots({
                targetDateUtc,
                timezone: slotTimezone,
                lat: slotLat,
                lng: slotLng,
                system: system === "both" ? "western_tropical" : system,
                natalLongitudes,
                slotHours: DEFAULT_HOURLY_SLOT_HOURS,
            })
            scaffold = buildHourlySlots({
                targetDateIso: toIsoDate(targetDateUtc),
                slots: hourlySlots.map((s) => ({
                    hour: s.hour,
                    datetimeIso: s.datetimeIso,
                    aspects: s.aspects,
                })),
            })
        } else {
            const rowsByDate = new Map<string, EphemerisCodexRow>()
            for (const row of codexTransit.rows) {
                rowsByDate.set(row.date, row)
            }
            scaffold = buildDailySlots({
                startDate: questionRange.startDate,
                endDate: questionRange.endDate,
                rowsByDate,
                natalLongitudes,
                fallbackExactTransitLongitudes,
            })
        }

        if (scaffold.length === 0) {
            return Response.json({ timeline: null }, { status: 200 })
        }

        const now = new Date()
        const currentDateTime = now.toLocaleString("en-CA", {
            dateStyle: "full",
            timeStyle: "long",
            timeZone: "UTC",
        })
        const questionLanguage = detectQuestionLanguage(body.question)
        const questionTopic = classifyQuestionTopic(body.question)

        const prompt = getPredictionTimelinePrompt({
            question: body.question,
            currentDateTime,
            granularity,
            questionRange: {
                startDateIso: questionRange.startDateIso,
                endDateIso: questionRange.endDateIso,
                durationDays: questionRange.durationDays,
                source: questionRange.source,
            },
            slots: scaffold,
            questionLanguage,
            userMainPoint: body.conversationContext?.userMainPoint ?? "",
            questionTopic,
        })

        console.log(
            `[horoscope/timeline] granularity=${granularity} slots=${scaffold.length} prompt size: ${(prompt.length / 1024).toFixed(1)}KB`,
        )

        const result = await generateObject({
            model: MODEL,
            schema: predictionTimelineSchema,
            system: `You are Astra, a female oracle. Produce ONLY the predictionTimeline JSON. Plain language, no astrology jargon, no planet names. Output language: ${questionLanguage}.`,
            prompt,
            temperature: 0.6,
        })

        return Response.json({ timeline: result.object }, { status: 200 })
    } catch (error) {
        console.error("[horoscope/timeline] request failed:", error)
        const message =
            error instanceof Error ? error.message : "TIMELINE_FAILED"
        return Response.json({ error: message }, { status: 400 })
    }
}
