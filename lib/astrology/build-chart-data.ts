import { calculateSwissEphChart } from "@/lib/astrology/swisseph"
import {
    getDefaultAstrologySystem,
    resolveBirthTime,
} from "@/lib/astrology/intake"
import type { AstrologySystem, SwissEphChart } from "@/lib/astrology/types"
import type { QuestionTimeRange } from "@/lib/astrology/question-time-range"
import type { CodexTransitSummary } from "@/lib/astrology/ephemeris-codex"

export type HoroscopeChartRequestBody = {
    birth: {
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
    system?: "western_tropical" | "vedic_sidereal" | "both"
    transit?: {
        day?: number | null
        month?: number | null
        year?: number | null
        hour?: number | null
        minute?: number | null
        timezone?: number | null
        lat?: number | null
        lng?: number | null
        country?: string | null
        state?: string | null
    } | null
    questionRange?: QuestionTimeRange
    transitDataSource?: "codex" | "swisseph_fallback"
    codexTransitSummary?: CodexTransitSummary | null
}

export type ChartDataResult = {
    birth: {
        date: { day: number; month: number; year: number }
        time: {
            hour: number
            minute: number
            approximate: boolean
            approximationReason: string | null
        }
        location: {
            country: string | null
            state: string | null
            lat: number
            lng: number
            timezone: number
        }
    }
    charts: SwissEphChart[]
    transit: {
        date: {
            day: number | null
            month: number | null
            year: number | null
            hour: number | null
            minute: number | null
        }
        location: {
            country: string | null
            state: string | null
            lat: number | null
            lng: number | null
            timezone: number | null
        }
        charts: SwissEphChart[]
    } | null
    questionRange?: {
        startDateIso: string
        endDateIso: string
        durationDays: number
        source: QuestionTimeRange["source"]
    } | null
    transitDataSource?: "codex" | "swisseph_fallback" | null
    codexTransitSummary?: CodexTransitSummary | null
}

export async function buildChartData(
    body: HoroscopeChartRequestBody,
    locale = "en"
): Promise<ChartDataResult> {
    const system =
        body.system || getDefaultAstrologySystem(locale) || "vedic_sidereal"

    const resolvedTime = resolveBirthTime({
        hour: body.birth.hour ?? null,
        minute: body.birth.minute ?? null,
        timeHint: body.birth.timeHint ?? "unknown",
    })

    const chartInput = {
        year: body.birth.year,
        month: body.birth.month,
        day: body.birth.day,
        hour: resolvedTime.hour,
        minute: resolvedTime.minute,
        timezone: body.birth.timezone,
        lat: body.birth.lat,
        lng: body.birth.lng,
    }

    const defaultForLocale = getDefaultAstrologySystem(
        locale,
        body.birth?.country ?? undefined,
    )
    const systemsToRun: AstrologySystem[] =
        system === "both"
            ? defaultForLocale === "vedic_sidereal"
                ? ["vedic_sidereal", "western_tropical"]
                : ["western_tropical", "vedic_sidereal"]
            : [system as AstrologySystem]

    const charts = await Promise.all(
        systemsToRun.map((systemMode) =>
            calculateSwissEphChart(chartInput, systemMode)
        )
    )

    const transitFromRange = body.questionRange
        ? {
              day: body.questionRange.startDate.getUTCDate(),
              month: body.questionRange.startDate.getUTCMonth() + 1,
              year: body.questionRange.startDate.getUTCFullYear(),
              hour: 12,
              minute: 0,
              timezone: body.birth.timezone,
              lat: body.birth.lat,
              lng: body.birth.lng,
              country: body.birth.country ?? null,
              state: body.birth.state ?? null,
          }
        : null
    const selectedTransit = body.transit ?? transitFromRange
    const shouldComputeTransitCharts = body.transitDataSource !== "codex"

    const hasTransit =
        shouldComputeTransitCharts &&
        selectedTransit?.day &&
        selectedTransit?.month &&
        selectedTransit?.year &&
        selectedTransit?.timezone != null &&
        selectedTransit?.lat != null &&
        selectedTransit?.lng != null

    const transitCharts = hasTransit
        ? await Promise.all(
              systemsToRun.map((systemMode) =>
                  calculateSwissEphChart(
                      {
                          year: selectedTransit!.year as number,
                          month: selectedTransit!.month as number,
                          day: selectedTransit!.day as number,
                          hour: selectedTransit!.hour ?? 12,
                          minute: selectedTransit!.minute ?? 0,
                          timezone: selectedTransit!.timezone as number,
                          lat: selectedTransit!.lat as number,
                          lng: selectedTransit!.lng as number,
                      },
                      systemMode
                  )
              )
          )
        : null

    return {
        birth: {
            date: {
                day: body.birth.day,
                month: body.birth.month,
                year: body.birth.year,
            },
            time: {
                hour: resolvedTime.hour,
                minute: resolvedTime.minute,
                approximate: resolvedTime.isApproximate,
                approximationReason: resolvedTime.approximationReason,
            },
            location: {
                country: body.birth.country ?? null,
                state: body.birth.state ?? null,
                lat: body.birth.lat,
                lng: body.birth.lng,
                timezone: body.birth.timezone,
            },
        },
        charts,
        transit: hasTransit && transitCharts
            ? {
                  date: {
                      day: selectedTransit?.day ?? null,
                      month: selectedTransit?.month ?? null,
                      year: selectedTransit?.year ?? null,
                      hour: selectedTransit?.hour ?? null,
                      minute: selectedTransit?.minute ?? null,
                  },
                  location: {
                      country: selectedTransit?.country ?? null,
                      state: selectedTransit?.state ?? null,
                      lat: selectedTransit?.lat ?? null,
                      lng: selectedTransit?.lng ?? null,
                      timezone: selectedTransit?.timezone ?? null,
                  },
                  charts: transitCharts,
              }
            : null,
        questionRange: body.questionRange
            ? {
                  startDateIso: body.questionRange.startDateIso,
                  endDateIso: body.questionRange.endDateIso,
                  durationDays: body.questionRange.durationDays,
                  source: body.questionRange.source,
              }
            : null,
        transitDataSource: body.transitDataSource ?? null,
        codexTransitSummary: body.codexTransitSummary ?? null,
    }
}
