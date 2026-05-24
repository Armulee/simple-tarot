import { calculateSwissEphChart } from "@/lib/astrology/swisseph"
import {
    getDefaultAstrologySystem,
    resolveBirthTime,
} from "@/lib/astrology/intake"
import type { AstrologySystem } from "@/lib/astrology/types"
import type { EphemerisCodexRow } from "@/lib/astrology/ephemeris-codex"
import {
    buildNatalLongitudes,
    computeExactTransitAspects,
} from "@/lib/astrology/transit-aspects"
import { buildDayDataFromCodex } from "@/lib/calendar/day-from-aspects"
import type { DayQuality } from "@/lib/calendar-helper"

/** JSON-safe snapshot: same pipeline as `/api/calendar/month` for one ISO day. */
export type MyCalendarDaySnapshotJson = {
    isoDate: string
    overall: number
    quality: DayQuality
    vitality: Record<string, number>
    eventSignals: Record<string, number>
    highlights: { text: string; type: string; category: string }[]
    warnings: { text: string; severity: string }[]
    lucky: {
        colors: string[]
        numbers: number[]
        direction: string
        time: string
    }
}

export function mapMyCalendarQualityToVerdictMood(
    quality: DayQuality,
): "good" | "caution" | "rest" {
    if (quality === "excellent" || quality === "good") return "good"
    if (quality === "neutral") return "rest"
    return "caution"
}

type HoroscopeBirth = {
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
}

/**
 * Same primary chart system as the first chart in `buildChartData` when the
 * client sends `both` (locale+country choose order).
 */
export function resolveSessionPrimaryChartSystem(
    locale: string,
    country: string | null | undefined,
    system: "western_tropical" | "vedic_sidereal" | "both" | undefined,
): AstrologySystem {
    const defaultForLocale = getDefaultAstrologySystem(
        locale,
        country ?? undefined,
    )
    const mode = system ?? defaultForLocale
    if (mode === "both") {
        return defaultForLocale === "vedic_sidereal"
            ? "vedic_sidereal"
            : "western_tropical"
    }
    return mode
}

/**
 * Builds the same `DayData` scoring the My Calendar UI uses for `isoDate`,
 * so horoscope copy can stay consistent with the calendar grid.
 */
export async function buildMyCalendarDaySnapshotForHoroscope({
    birth,
    isoDate,
    codexRows,
    textLocale,
    sessionChartSystem,
    sessionNatalPlanets,
}: {
    birth: HoroscopeBirth
    isoDate: string
    codexRows: readonly EphemerisCodexRow[]
    textLocale?: string
    sessionChartSystem: AstrologySystem
    sessionNatalPlanets: Record<string, unknown>
}): Promise<MyCalendarDaySnapshotJson | null> {
    const row = codexRows.find((r) => r.date === isoDate)
    if (!row) return null

    const calendarSystem = getDefaultAstrologySystem(
        null,
        birth.country ?? null,
    )

    let natalLongitudes = buildNatalLongitudes(
        sessionNatalPlanets as Parameters<typeof buildNatalLongitudes>[0],
    )

    if (calendarSystem !== sessionChartSystem) {
        const resolvedTime = resolveBirthTime({
            hour: birth.hour ?? null,
            minute: birth.minute ?? null,
            timeHint: birth.timeHint ?? "unknown",
        })
        const natalChart = await calculateSwissEphChart(
            {
                day: birth.day,
                month: birth.month,
                year: birth.year,
                hour: resolvedTime.hour,
                minute: resolvedTime.minute,
                timezone: birth.timezone,
                lat: birth.lat,
                lng: birth.lng,
            },
            calendarSystem,
        )
        natalLongitudes = buildNatalLongitudes(natalChart.planets ?? {})
    }

    const exact = computeExactTransitAspects({
        dateIso: isoDate,
        natalLongitudes,
        codexRow: row,
    })

    const dateUtc = new Date(`${isoDate}T00:00:00.000Z`)
    const day = buildDayDataFromCodex(
        dateUtc,
        row,
        exact?.events ?? [],
        textLocale,
    )

    return {
        isoDate,
        overall: day.overall,
        quality: day.quality,
        vitality: day.vitality,
        eventSignals: day.eventSignals,
        highlights: day.highlights.map((h) => ({
            text: h.text,
            type: h.type,
            category: h.category,
        })),
        warnings: day.warnings.map((w) => ({
            text: w.text,
            severity: w.severity,
        })),
        lucky: day.lucky,
    }
}
