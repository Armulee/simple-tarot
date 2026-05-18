import { generateObject } from "ai"
import { z } from "zod"
import { buildChartData } from "@/lib/astrology/build-chart-data"
import { dailyVerdictSchema } from "@/lib/astrology/schema"
import {
    getDailyVerdictPrompt,
    getNatalVerdictPrompt,
    getTimingVerdictPrompt,
    type NatalPlacementForPrompt,
} from "@/lib/prompts"
import { resolveQuestionTimeRangeAsync } from "@/lib/astrology/question-time-range"
import {
    isNatalQuestionRange,
    isSingleDayQuestionRange,
    looksLikeTimingQuestion,
} from "@/lib/astrology/single-day"
import { getCodexTransitWindow } from "@/lib/astrology/ephemeris-codex"
import { classifyQuestionTopic } from "@/lib/astrology/question-intent"
import type { PersonalizedTransitAspectsResult } from "@/lib/astrology/transit-aspects"
import {
    buildNatalLongitudes,
    buildPersonalizedTransitAspects,
    buildTransitLongitudesFromSwissPlanets,
} from "@/lib/astrology/transit-aspects"
import type { AstrologyPoint, SwissEphChart } from "@/lib/astrology/types"

// Dedicated verdict route. Runs in parallel with /api/horoscope/question and
// /api/horoscope/chart-data so the VerdictHero can mount well before the
// long-form interpretation finishes streaming.

const MODEL = "deepseek/deepseek-v3.2"
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
        })
        .optional(),
})

type VerdictRequestBody = z.infer<typeof requestSchema>

// Planets we expose to the natal verdict prompt. Outer planets share signs
// across whole generations, so they tell us very little about an individual
// answer; we ship the personally-meaningful set instead.
const NATAL_VERDICT_PLANETS: ReadonlyArray<string> = [
    "Sun",
    "Moon",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Rahu",
    "Ketu",
    "Uranus",
    "Neptune",
    "Pluto",
]

function buildNatalPlacementsForPrompt(
    chart: SwissEphChart | undefined,
): NatalPlacementForPrompt[] {
    if (!chart) return []
    const placements: NatalPlacementForPrompt[] = []
    const houseIndex = buildHouseIndex(chart)
    for (const planet of NATAL_VERDICT_PLANETS) {
        const point = chart.planets[planet] as AstrologyPoint | undefined
        if (!point) continue
        if (!Number.isFinite(point.longitude)) continue
        placements.push({
            planet,
            sign: point.sign,
            degree: point.degree,
            house: houseIndex.find(point.longitude),
            retrograde: !!point.retrograde,
        })
    }
    return placements
}

type HouseIndex = {
    find: (longitude: number) => number | null
}

function buildHouseIndex(chart: SwissEphChart): HouseIndex {
    // Houses come keyed by string house numbers "1".."12" with a cusp
    // longitude each. We just iterate in order and bucket by [cusp_i, cusp_i+1)
    // walking through 360°.
    const cusps: Array<{ num: number; lng: number }> = []
    for (let i = 1; i <= 12; i++) {
        const h = chart.houses[String(i)]
        if (h && Number.isFinite(h.longitude)) {
            cusps.push({ num: i, lng: ((h.longitude % 360) + 360) % 360 })
        }
    }
    if (cusps.length !== 12) {
        return { find: () => null }
    }
    return {
        find: (longitude: number) => {
            const norm = ((longitude % 360) + 360) % 360
            for (let i = 0; i < 12; i++) {
                const start = cusps[i].lng
                const end = cusps[(i + 1) % 12].lng
                if (start === end) continue
                if (start < end) {
                    if (norm >= start && norm < end) return cusps[i].num
                } else if (norm >= start || norm < end) {
                    return cusps[i].num
                }
            }
            return null
        },
    }
}

const TIMING_SEARCH_DAYS = 365

async function handleTimingVerdict(body: VerdictRequestBody) {
    const chartLocale =
        detectQuestionLanguage(body.question) === "Thai" ||
        detectQuestionLanguage(body.question) === "Lao"
            ? "th"
            : "en"

    const today = new Date()
    const searchStart = new Date(
        Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate(),
        ),
    )
    const searchEnd = addUtcDays(searchStart, TIMING_SEARCH_DAYS)
    const searchRange = {
        startDate: searchStart,
        endDate: searchEnd,
        startDateIso: toIsoDate(searchStart),
        endDateIso: toIsoDate(searchEnd),
        durationDays: TIMING_SEARCH_DAYS,
        source: "explicit" as const,
    }

    // Pull the codex window for the entire forward search. The natal chart
    // is also rebuilt without transit so we never compute "today" planets
    // for a question that should be looking months ahead instead.
    const codexPromise = getCodexTransitWindow(searchRange)
    const chartDataPromise = buildChartData(
        {
            birth: body.birth,
            system: body.system,
        },
        chartLocale,
    )

    const [codexResult, chartDataResult] = await Promise.all([
        codexPromise,
        chartDataPromise,
    ])

    const primaryBirthChart = chartDataResult.charts?.[0]
    const natalLongitudes = buildNatalLongitudes(
        primaryBirthChart?.planets ?? {},
    )
    const fallbackExactTransitLongitudes =
        buildTransitLongitudesFromSwissPlanets({})
    const rawTransitAspects = buildPersonalizedTransitAspects({
        questionRange: {
            source: "explicit",
            startDateIso: searchRange.startDateIso,
            endDateIso: searchRange.endDateIso,
        },
        natalLongitudes,
        codexRows: codexResult.rows,
        fallbackExactTransitLongitudes,
    })

    const questionTopic = classifyQuestionTopic(body.question)
    const filteredAspects =
        questionTopic.topic !== "general"
            ? filterAspectsByRelevantPlanets(
                  rawTransitAspects,
                  questionTopic.relevantPlanets,
              )
            : rawTransitAspects

    const natalPlacements = buildNatalPlacementsForPrompt(primaryBirthChart)
    if (
        !natalPlacements.length ||
        ((filteredAspects.exact?.events.length ?? 0) === 0 &&
            (filteredAspects.range?.events.length ?? 0) === 0)
    ) {
        // No usable transit data in the search window — fall back to a null
        // verdict and let the long-form interpretation carry the answer.
        return Response.json({ dailyVerdict: null }, { status: 200 })
    }

    const now = new Date()
    const currentDateTime = now.toLocaleString("en-CA", {
        dateStyle: "full",
        timeStyle: "long",
        timeZone: "UTC",
    })
    const questionLanguage = detectQuestionLanguage(body.question)

    const prompt = getTimingVerdictPrompt({
        question: body.question,
        currentDateTime,
        searchWindow: {
            startDateIso: searchRange.startDateIso,
            endDateIso: searchRange.endDateIso,
            durationDays: searchRange.durationDays,
        },
        personalizedTransitAspects: filteredAspects,
        natalPlacements,
        questionTopic,
        questionLanguage,
        userMainPoint: body.conversationContext?.userMainPoint ?? "",
    })

    console.log(
        `[horoscope/verdict] timing prompt size: ${(prompt.length / 1024).toFixed(1)}KB (~${Math.ceil(prompt.length / 4)} tokens)`,
    )

    const result = await generateObject({
        model: MODEL,
        schema: dailyVerdictSchema,
        system: `You are Astra, a female oracle. Produce ONLY the daily verdict JSON for a TIMING question, including timingWindow.startDateIso and timingWindow.endDateIso. Plain language, no astrology jargon, no planet names in user-facing strings. Output language: ${questionLanguage}.`,
        prompt,
        temperature: 0.45,
    })

    const verdict = result.object
    const safeWindow = sanitizeTimingWindow(verdict.timingWindow, {
        searchStartIso: searchRange.startDateIso,
        searchEndIso: searchRange.endDateIso,
    })
    if (!safeWindow) {
        return Response.json({ dailyVerdict: null }, { status: 200 })
    }
    const safeVerdict = {
        ...verdict,
        mode: "timing" as const,
        timingWindow: safeWindow,
        relevantPlanets: undefined,
    }
    return Response.json({ dailyVerdict: safeVerdict }, { status: 200 })
}

function sanitizeTimingWindow(
    raw: { startDateIso?: string; endDateIso?: string } | null | undefined,
    bounds: { searchStartIso: string; searchEndIso: string },
): { startDateIso: string; endDateIso: string } | null {
    if (!raw) return null
    const start = typeof raw.startDateIso === "string" ? raw.startDateIso : ""
    const end = typeof raw.endDateIso === "string" ? raw.endDateIso : start
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return null
    if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) return null
    if (start < bounds.searchStartIso || start > bounds.searchEndIso) {
        return null
    }
    if (end < bounds.searchStartIso || end > bounds.searchEndIso) {
        return null
    }
    if (end < start) return { startDateIso: start, endDateIso: start }
    return { startDateIso: start, endDateIso: end }
}

async function handleNatalVerdict(body: VerdictRequestBody) {
    const chartLocale =
        detectQuestionLanguage(body.question) === "Thai" ||
        detectQuestionLanguage(body.question) === "Lao"
            ? "th"
            : "en"

    // Natal verdict only needs the birth chart. We deliberately do NOT pass
    // `transit` or `questionRange` to buildChartData — without them
    // `buildChartData` short-circuits the transit ephemeris compute, so the
    // natal path never runs today's planet calculation.
    const chartDataResult = await buildChartData(
        {
            birth: body.birth,
            system: body.system,
        },
        chartLocale,
    )

    const primaryBirthChart = chartDataResult.charts?.[0]
    const natalPlacements = buildNatalPlacementsForPrompt(primaryBirthChart)
    if (!natalPlacements.length) {
        return Response.json({ dailyVerdict: null }, { status: 200 })
    }

    const now = new Date()
    const currentDateTime = now.toLocaleString("en-CA", {
        dateStyle: "full",
        timeStyle: "long",
        timeZone: "UTC",
    })
    const questionLanguage = detectQuestionLanguage(body.question)

    const prompt = getNatalVerdictPrompt({
        question: body.question,
        currentDateTime,
        natalPlacements,
        questionLanguage,
        userMainPoint: body.conversationContext?.userMainPoint ?? "",
    })

    console.log(
        `[horoscope/verdict] natal prompt size: ${(prompt.length / 1024).toFixed(1)}KB (~${Math.ceil(prompt.length / 4)} tokens)`,
    )

    const result = await generateObject({
        model: MODEL,
        schema: dailyVerdictSchema,
        system: `You are Astra, a female oracle. Produce ONLY the daily verdict JSON for a NATAL question. Plain language, no astrology jargon, no planet names in user-facing strings. Output language: ${questionLanguage}.`,
        prompt,
        temperature: 0.55,
    })

    const verdict = result.object
    // Force-tag the mode so the client UI can branch confidently even if the
    // model omits the field. relevantPlanets is also pruned to only the keys
    // the UI can actually render against the supplied chart.
    const knownPlanets = new Set(natalPlacements.map((p) => p.planet))
    const safeVerdict = {
        ...verdict,
        mode: "natal" as const,
        relevantPlanets:
            verdict.relevantPlanets
                ?.filter((rp) => knownPlanets.has(rp.planet))
                .slice(0, 4) ?? [],
    }

    return Response.json({ dailyVerdict: safeVerdict }, { status: 200 })
}

export async function POST(req: Request) {
    try {
        const body = requestSchema.parse(await req.json())

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

        // This route now serves three distinct verdict flavors:
        //   1. "daily"   → single, confidently dated questions (today, a
        //                   specific calendar date). Driven by transit aspects.
        //   2. "natal"   → questions with NO date or date-range, like
        //                   "Which career fits me?" or "Am I lucky in love?".
        //                   Driven by birth-chart placements only.
        //   3. "timing"  → "when will X happen?" questions. We don't trust
        //                   the resolver's default 30-day window here — the
        //                   user is asking for a future date — so we run a
        //                   forward-looking transit search instead.
        // Anything else (an explicit multi-day window like "next month") is
        // not a great fit for the verdict hero, so we still short-circuit
        // with null and let the long-form interpretation carry the answer.
        const timingMode = looksLikeTimingQuestion(body.question)
        if (timingMode) {
            return await handleTimingVerdict(body)
        }

        const singleDay = isSingleDayQuestionRange({
            durationDays: questionRange.durationDays,
            source: questionRange.source,
        })
        const natalMode = isNatalQuestionRange({
            durationDays: questionRange.durationDays,
            source: questionRange.source,
        })
        if (!singleDay && !natalMode) {
            return Response.json({ dailyVerdict: null }, { status: 200 })
        }

        if (natalMode) {
            return await handleNatalVerdict(body)
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

        // Fire BOTH codex queries in parallel; buildChartData only needs the
        // question-range one so we start it as soon as that resolves and let
        // the aspect codex round-trip hide behind ephemeris compute.
        const codexTransitPromise = getCodexTransitWindow(questionRange)
        const aspectCodexTransitPromise = getCodexTransitWindow(aspectRange)

        const codexTransit = await codexTransitPromise

        const chartLocale =
            detectQuestionLanguage(body.question) === "Thai" ||
            detectQuestionLanguage(body.question) === "Lao"
                ? "th"
                : "en"

        const chartDataPromise = buildChartData(
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

        const [chartDataResult, aspectCodexTransit] = await Promise.all([
            chartDataPromise,
            aspectCodexTransitPromise,
        ])

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

        const questionTopic = classifyQuestionTopic(body.question)
        const personalizedTransitAspects =
            questionTopic.topic !== "general"
                ? filterAspectsByRelevantPlanets(
                      rawTransitAspects,
                      questionTopic.relevantPlanets,
                  )
                : rawTransitAspects

        const now = new Date()
        const currentDateTime = now.toLocaleString("en-CA", {
            dateStyle: "full",
            timeStyle: "long",
            timeZone: "UTC",
        })
        const questionLanguage = detectQuestionLanguage(body.question)

        const prompt = getDailyVerdictPrompt({
            question: body.question,
            currentDateTime,
            questionRange: {
                startDateIso: questionRange.startDateIso,
                endDateIso: questionRange.endDateIso,
                durationDays: questionRange.durationDays,
                source: questionRange.source,
            },
            personalizedTransitAspects,
            questionLanguage,
            userMainPoint: body.conversationContext?.userMainPoint ?? "",
        })

        console.log(
            `[horoscope/verdict] prompt size: ${(prompt.length / 1024).toFixed(1)}KB (~${Math.ceil(prompt.length / 4)} tokens)`,
        )

        const result = await generateObject({
            model: MODEL,
            schema: dailyVerdictSchema,
            system: `You are Astra, a female oracle. Produce ONLY the daily verdict JSON. Plain language, no astrology jargon, no planet names. Output language: ${questionLanguage}.`,
            prompt,
            temperature: 0.55,
        })

        const dailyVerdict = {
            ...result.object,
            mode: "daily" as const,
            relevantPlanets: undefined,
        }
        return Response.json({ dailyVerdict }, { status: 200 })
    } catch (error) {
        console.error("[horoscope/verdict] request failed:", error)
        const message =
            error instanceof Error ? error.message : "VERDICT_FAILED"
        return Response.json({ error: message }, { status: 400 })
    }
}
