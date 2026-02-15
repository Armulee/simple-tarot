import { calculateSwissEphChart } from "@/lib/astrology/swisseph"
import {
    getDefaultAstrologySystem,
    resolveBirthTime,
} from "@/lib/astrology/intake"
import type { AstrologySystem, SwissEphChart } from "@/lib/astrology/types"

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

    const hasTransit =
        body.transit?.day &&
        body.transit?.month &&
        body.transit?.year &&
        body.transit?.timezone != null &&
        body.transit?.lat != null &&
        body.transit?.lng != null

    const transitCharts = hasTransit
        ? await Promise.all(
              systemsToRun.map((systemMode) =>
                  calculateSwissEphChart(
                      {
                          year: body.transit!.year as number,
                          month: body.transit!.month as number,
                          day: body.transit!.day as number,
                          hour: body.transit!.hour ?? 12,
                          minute: body.transit!.minute ?? 0,
                          timezone: body.transit!.timezone as number,
                          lat: body.transit!.lat as number,
                          lng: body.transit!.lng as number,
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
                      day: body.transit?.day ?? null,
                      month: body.transit?.month ?? null,
                      year: body.transit?.year ?? null,
                      hour: body.transit?.hour ?? null,
                      minute: body.transit?.minute ?? null,
                  },
                  location: {
                      country: body.transit?.country ?? null,
                      state: body.transit?.state ?? null,
                      lat: body.transit?.lat ?? null,
                      lng: body.transit?.lng ?? null,
                      timezone: body.transit?.timezone ?? null,
                  },
                  charts: transitCharts,
              }
            : null,
    }
}
