import { z } from "zod"
import { calculateSwissEphChart } from "@/lib/astrology/swisseph"
import {
    getDefaultAstrologySystem,
    resolveBirthTime,
} from "@/lib/astrology/intake"
import type { QuestionTimeRange } from "@/lib/astrology/question-time-range"
import { getCodexTransitWindow } from "@/lib/astrology/ephemeris-codex"
import {
    buildNatalLongitudes,
    computeExactTransitAspects,
} from "@/lib/astrology/transit-aspects"
import { buildDayDataFromCodex } from "@/lib/calendar/day-from-aspects"
import type { DayData } from "@/lib/calendar-helper"

const requestSchema = z.object({
    year: z.number().int().min(1900).max(2100),
    month: z.number().int().min(0).max(11),
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
    }),
})

function toIsoDate(d: Date): string {
    return d.toISOString().slice(0, 10)
}

function monthRangeUtc(year: number, month: number): QuestionTimeRange {
    const startDate = new Date(Date.UTC(year, month, 1))
    const endDate = new Date(Date.UTC(year, month + 1, 0))
    const durationDays =
        Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1
    return {
        startDate,
        endDate,
        startDateIso: toIsoDate(startDate),
        endDateIso: toIsoDate(endDate),
        durationDays,
        source: "default_30d",
        granularity: "daily",
    }
}

/**
 * DayData uses `Date` (non-serializable in JSON). We send isoDate strings on
 * the wire and the client rehydrates a Date instance per day.
 */
type DayDataWire = Omit<DayData, "date"> & { isoDate: string }

export async function POST(req: Request) {
    try {
        const body = requestSchema.parse(await req.json())

        const range = monthRangeUtc(body.year, body.month)

        const codexPromise = getCodexTransitWindow(range)

        // Calendar scoring must be stable across UI locales: only the user's
        // birth country chooses the astrology system. `body.locale` is still
        // forwarded to `buildDayDataFromCodex` for highlight/warning text.
        const system = getDefaultAstrologySystem(null, body.birth.country ?? null)
        const resolvedTime = resolveBirthTime({
            hour: body.birth.hour ?? null,
            minute: body.birth.minute ?? null,
            timeHint: body.birth.timeHint,
        })
        const natalChartPromise = calculateSwissEphChart(
            {
                day: body.birth.day,
                month: body.birth.month,
                year: body.birth.year,
                hour: resolvedTime.hour,
                minute: resolvedTime.minute,
                timezone: body.birth.timezone,
                lat: body.birth.lat,
                lng: body.birth.lng,
            },
            system,
        )

        const [codex, natalChart] = await Promise.all([
            codexPromise,
            natalChartPromise,
        ])

        const natalLongitudes = buildNatalLongitudes(natalChart.planets ?? {})

        const days: Record<string, DayDataWire | null> = {}
        const isoByDate = new Map<string, (typeof codex.rows)[number]>()
        for (const row of codex.rows) {
            isoByDate.set(row.date, row)
        }

        // Walk every calendar day in the month (so the client doesn't have to
        // distinguish "row missing because codex" vs "row missing because we
        // never asked").
        const cursor = new Date(range.startDate.getTime())
        while (cursor <= range.endDate) {
            const iso = toIsoDate(cursor)
            const row = isoByDate.get(iso)
            if (!row) {
                days[iso] = null
            } else {
                const exact = computeExactTransitAspects({
                    dateIso: iso,
                    natalLongitudes,
                    codexRow: row,
                })
                const day = buildDayDataFromCodex(
                    new Date(cursor.getTime()),
                    row,
                    exact?.events ?? [],
                    body.locale,
                )
                days[iso] = {
                    isoDate: iso,
                    overall: day.overall,
                    quality: day.quality,
                    vitality: day.vitality,
                    eventSignals: day.eventSignals,
                    highlights: day.highlights,
                    warnings: day.warnings,
                    lucky: day.lucky,
                }
            }
            cursor.setUTCDate(cursor.getUTCDate() + 1)
        }

        return Response.json(
            {
                source: codex.source,
                coverage: codex.coverage,
                year: body.year,
                month: body.month,
                days,
            },
            { status: 200 },
        )
    } catch (error) {
        console.error("[calendar/month] request failed:", error)
        const message =
            error instanceof Error ? error.message : "CALENDAR_MONTH_FAILED"
        return Response.json({ error: message }, { status: 400 })
    }
}
