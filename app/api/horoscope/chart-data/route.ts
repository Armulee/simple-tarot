import { z } from "zod"
import { buildChartData } from "@/lib/astrology/build-chart-data"
import {
    hydrateQuestionTimeRange,
    questionTimeRangePayloadSchema,
    resolveQuestionTimeRangeAsync,
} from "@/lib/astrology/question-time-range"
import { getCodexTransitWindow } from "@/lib/astrology/ephemeris-codex"
import { isNatalQuestionRange } from "@/lib/astrology/single-day"
import { questionClassificationSchema } from "@/lib/astrology/question-intent"
import {
    buildNatalLongitudes,
    buildPersonalizedTransitAspects,
    buildTransitLongitudesFromSwissPlanets,
} from "@/lib/astrology/transit-aspects"

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
    classification: questionClassificationSchema.optional(),
    questionRange: questionTimeRangePayloadSchema.optional(),
})

const DAY_MS = 24 * 60 * 60 * 1000
const ASPECT_PADDING_DAYS = 90

function addUtcDays(date: Date, days: number) {
    return new Date(date.getTime() + days * DAY_MS)
}

function toIsoDate(date: Date) {
    return date.toISOString().slice(0, 10)
}

export async function POST(req: Request) {
    try {
        const body = requestSchema.parse(await req.json())
        const locale = body.locale || "en"

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

        // Natal questions ("Which career fits me?") are not bound to a date
        // or date-range, so today's transit calculation has nothing useful
        // to contribute. Short-circuit straight to the natal chart and skip
        // both codex queries + transit ephemeris compute entirely.
        //
        // Classification is the source of truth — only when extract didn't
        // ship one do we fall back to the legacy isNatalQuestionRange
        // heuristic. Otherwise timeline ranges (which arrive as
        // `ai_inferred` + multi-day) would false-positive that check and
        // skip the transit chart even though the user clearly wants one.
        const replyStrategy = body.classification?.replyStrategy
        const isNatalStrategy = replyStrategy
            ? replyStrategy === "natal"
            : isNatalQuestionRange({
                  durationDays: questionRange.durationDays,
                  source: questionRange.source,
              })
        if (isNatalStrategy && !body.transit) {
            const chartDataResult = await buildChartData(
                {
                    birth: body.birth,
                    system: body.system,
                },
                locale,
            )
            return Response.json(
                {
                    ...chartDataResult,
                    personalizedTransitAspects: null,
                },
                { status: 200 },
            )
        }

        // Natal questions ("Which career fits me?") are not bound to a date
        // or date-range, so today's transit calculation has nothing useful
        // to contribute. Short-circuit straight to the natal chart and skip
        // both codex queries + transit ephemeris compute entirely.
        if (
            isNatalQuestionRange({
                durationDays: questionRange.durationDays,
                source: questionRange.source,
            }) &&
            !body.transit
        ) {
            const chartDataResult = await buildChartData(
                {
                    birth: body.birth,
                    system: body.system,
                },
                locale,
            )
            return Response.json(
                {
                    ...chartDataResult,
                    personalizedTransitAspects: null,
                },
                { status: 200 },
            )
        }

        // Derive aspectRange synchronously so we can fire both codex queries
        // in parallel and overlap buildChartData with the slower of the two.
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

        // Kick off BOTH codex queries simultaneously. `buildChartData` only
        // needs `codexTransit`, so we await that one first and start the
        // Swiss-ephemeris compute while the aspect codex query is still
        // resolving on the side — its round-trip hides behind ephemeris work.
        const codexTransitPromise = getCodexTransitWindow(questionRange)
        const aspectCodexTransitPromise = getCodexTransitWindow(aspectRange)

        const codexTransit = await codexTransitPromise

        const chartDataPromise = buildChartData(
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
        const personalizedTransitAspects = buildPersonalizedTransitAspects({
            questionRange: {
                source: questionRange.source,
                startDateIso: questionRange.startDateIso,
                endDateIso: questionRange.endDateIso,
            },
            natalLongitudes,
            codexRows: aspectCodexTransit.rows,
            fallbackExactTransitLongitudes,
        })

        return Response.json(
            { ...chartDataResult, personalizedTransitAspects },
            { status: 200 },
        )
    } catch (error) {
        console.error("[horoscope/chart-data] request failed:", error)
        const message =
            error instanceof Error ? error.message : "CHART_DATA_FAILED"
        return Response.json({ error: message }, { status: 400 })
    }
}
