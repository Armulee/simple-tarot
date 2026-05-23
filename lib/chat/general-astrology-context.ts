import { buildChartData } from "@/lib/astrology/build-chart-data"
import { getCodexTransitWindow } from "@/lib/astrology/ephemeris-codex"
import {
    buildNatalLongitudes,
    buildPersonalizedTransitAspects,
    buildTransitLongitudesFromSwissPlanets,
} from "@/lib/astrology/transit-aspects"
import type { QuestionTimeRange } from "@/lib/astrology/question-time-range"
import type {
    AstrologyPoint,
    SwissEphChart,
} from "@/lib/astrology/types"
import type { PersonalizedTransitAspectsResult } from "@/lib/astrology/transit-aspects"

export type GeneralAstrologyBirth = {
    day: number
    month: number
    year: number
    hour?: number | null
    minute?: number | null
    timeHint?: "day" | "night" | "unknown"
    timezone: number
    lat: number
    lng: number
    country?: string | null
    state?: string | null
    usedLocationFallback?: boolean
}

type PlacementSummary = {
    planet: string
    sign: string
    retrograde: boolean
}

type ActivitySummary = {
    transitPlanet: string
    natalPlanet: string
    aspectType: string
    sentiment?: "good" | "bad" | "neutral"
    keyword?: string
}

export type GeneralAstrologyContext = {
    natal: PlacementSummary[]
    transit: PlacementSummary[]
    activities: ActivitySummary[]
    /** Pre-rendered block ready to drop into the prompt. */
    promptBlock: string
}

// Personally-meaningful set. Outer planets share signs across whole
// generations, so they tell us little about an individual's inner state —
// we surface the inner + social planets plus the lunar nodes.
const CORE_PLANETS: ReadonlyArray<string> = [
    "Sun",
    "Moon",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Rahu",
    "Ketu",
]

const DAY_MS = 24 * 60 * 60 * 1000
const ACTIVITY_WINDOW_DAYS = 30
const ASPECT_PADDING_DAYS = 90
const MAX_ACTIVITIES = 6

function toIsoDate(date: Date) {
    return date.toISOString().slice(0, 10)
}

function addUtcDays(date: Date, days: number) {
    return new Date(date.getTime() + days * DAY_MS)
}

function buildPlacementSummary(
    chart: SwissEphChart | undefined,
): PlacementSummary[] {
    if (!chart) return []
    const out: PlacementSummary[] = []
    for (const planet of CORE_PLANETS) {
        const point = chart.planets[planet] as AstrologyPoint | undefined
        if (!point || !Number.isFinite(point.longitude)) continue
        out.push({
            planet,
            sign: point.sign,
            retrograde: !!point.retrograde,
        })
    }
    return out
}

function collectActivities(
    aspects: PersonalizedTransitAspectsResult | null,
): ActivitySummary[] {
    if (!aspects) return []
    const events = [
        ...(aspects.exact?.events ?? []),
        ...(aspects.range?.events ?? []),
    ]
    const seen = new Set<string>()
    const out: ActivitySummary[] = []
    for (const event of events) {
        const key = `${event.transitPlanet}-${event.natalPlanet}-${event.aspectType}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push({
            transitPlanet: event.transitPlanet,
            natalPlanet: event.natalPlanet,
            aspectType: event.aspectType,
            sentiment: event.sentiment,
            keyword: event.keyword,
        })
        if (out.length >= MAX_ACTIVITIES) break
    }
    return out
}

function buildPromptBlock(
    natal: PlacementSummary[],
    transit: PlacementSummary[],
    activities: ActivitySummary[],
): string {
    if (!natal.length && !transit.length && !activities.length) return ""
    return [
        "<astrology_context>",
        "The reflection MUST be grounded in this real astrology data for the person who is asking. Read it as the energetic backdrop of their inner state — never quote it literally, never name planets/signs/aspects in your output.",
        `birth_chart (natal placements): ${JSON.stringify(natal)}`,
        `transit_chart (current sky placements): ${JSON.stringify(transit)}`,
        `astrology_activities (current transits touching their natal chart — the live inner pressures): ${JSON.stringify(activities)}`,
        "Interpretation guidance: natal placements describe who they are at the core; transit placements describe the present sky; activities describe what is actively pressing on or stirring their natal chart right now. Let the activities (especially their sentiment) shape the inner-energy shape, hero title, and currents.",
        "</astrology_context>",
    ].join("\n")
}

/**
 * Builds a compact, prompt-ready astrology context for the general reply
 * strategy: the person's birth chart placements, the current transit (sky)
 * placements, and the live transit-to-natal "activities" stirring their chart
 * right now. Returns null when the birth data is missing/invalid or the
 * ephemeris build fails, so the caller can fall back to a pure-intuition
 * reflection.
 */
export async function buildGeneralAstrologyContext({
    birth,
    system,
    locale = "en",
}: {
    birth: GeneralAstrologyBirth
    system?: "western_tropical" | "vedic_sidereal" | "both"
    locale?: string
}): Promise<GeneralAstrologyContext | null> {
    try {
        const today = new Date()
        const todayUtc = new Date(
            Date.UTC(
                today.getUTCFullYear(),
                today.getUTCMonth(),
                today.getUTCDate(),
            ),
        )
        const endUtc = addUtcDays(todayUtc, ACTIVITY_WINDOW_DAYS)
        const questionRange: QuestionTimeRange = {
            startDate: todayUtc,
            endDate: endUtc,
            startDateIso: toIsoDate(todayUtc),
            endDateIso: toIsoDate(endUtc),
            durationDays: ACTIVITY_WINDOW_DAYS,
            source: "default_30d",
            granularity: "daily",
        }
        const aspectRange: QuestionTimeRange = {
            ...questionRange,
            startDate: addUtcDays(todayUtc, -ASPECT_PADDING_DAYS),
            endDate: addUtcDays(endUtc, ASPECT_PADDING_DAYS),
            startDateIso: toIsoDate(addUtcDays(todayUtc, -ASPECT_PADDING_DAYS)),
            endDateIso: toIsoDate(addUtcDays(endUtc, ASPECT_PADDING_DAYS)),
            durationDays:
                ACTIVITY_WINDOW_DAYS + ASPECT_PADDING_DAYS * 2,
        }

        const codexTransitPromise = getCodexTransitWindow(questionRange)
        const aspectCodexTransitPromise = getCodexTransitWindow(aspectRange)
        const codexTransit = await codexTransitPromise

        const chartDataResult = await buildChartData(
            {
                birth,
                system,
                // Anchor the transit chart on today's sky so the reflection
                // reflects the present moment, not the birth moment.
                transit: {
                    day: todayUtc.getUTCDate(),
                    month: todayUtc.getUTCMonth() + 1,
                    year: todayUtc.getUTCFullYear(),
                    hour: 12,
                    minute: 0,
                    timezone: birth.timezone,
                    lat: birth.lat,
                    lng: birth.lng,
                    country: birth.country ?? null,
                    state: birth.state ?? null,
                },
                transitDataSource: codexTransit.source,
                codexTransitSummary: codexTransit.summary,
            },
            locale,
        )

        const aspectCodexTransit = await aspectCodexTransitPromise

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

        const natal = buildPlacementSummary(primaryBirthChart)
        const transit = buildPlacementSummary(primaryTransitChart)
        const activities = collectActivities(personalizedTransitAspects)

        if (!natal.length && !transit.length && !activities.length) {
            return null
        }

        return {
            natal,
            transit,
            activities,
            promptBlock: buildPromptBlock(natal, transit, activities),
        }
    } catch (error) {
        console.error(
            "[general-astrology-context] failed to build context:",
            error,
        )
        return null
    }
}
