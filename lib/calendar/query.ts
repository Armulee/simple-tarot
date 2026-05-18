import { addDays } from "date-fns"
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
import {
    getCalendarWindowDays,
    isDateWithinWindow,
    type CalendarPlanTier,
} from "@/lib/calendar/access-window"
import type {
    CalendarQueryCandidate,
    CalendarQueryConfidence,
    CalendarQueryIntent,
    CalendarQueryResult,
} from "@/lib/calendar-helper"

export const CALENDAR_QUERY_DEFAULT_RANGE_DAYS = 90
export const CALENDAR_QUERY_MAX_CANDIDATES = 3

export const CALENDAR_QUERY_INTENT_LABELS: Record<CalendarQueryIntent, string> = {
    job_change: "job change",
    resignation: "resignation",
    marriage: "marriage",
    contract_sign: "contract signing",
    travel_long: "long-distance travel",
    major_purchase: "major purchase",
}

type CalendarQueryBirthInput = {
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

type CalendarQueryOptions = {
    intent: CalendarQueryIntent
    locale?: string
    birth: CalendarQueryBirthInput
    planTier?: CalendarPlanTier
    today?: Date
    startDate?: Date
    endDate?: Date
    maxCandidates?: number
}

function clampToStartOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function toIsoDate(date: Date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
}

function toQuestionTimeRange(startDate: Date, endDate: Date): QuestionTimeRange {
    const safeStart = clampToStartOfDay(startDate)
    const safeEnd = clampToStartOfDay(endDate)
    const durationDays =
        Math.round((safeEnd.getTime() - safeStart.getTime()) / 86_400_000) + 1
    return {
        startDate: safeStart,
        endDate: safeEnd,
        startDateIso: toIsoDate(safeStart),
        endDateIso: toIsoDate(safeEnd),
        durationDays,
        source: "default_30d",
    }
}

function scoreToConfidence(score: number): CalendarQueryConfidence {
    if (score >= 8) return "high"
    if (score >= 6.5) return "medium"
    return "low"
}

function toCandidate(
    isoDate: string,
    score: number,
    day: ReturnType<typeof buildDayDataFromCodex>,
): CalendarQueryCandidate {
    return {
        isoDate,
        score,
        overall: day.overall,
        quality: day.quality,
        career: day.vitality.career,
        warningCount: day.warnings.length,
        highlightCount: day.highlights.length,
        highlights: day.highlights.slice(0, 2),
        warnings: day.warnings.slice(0, 2),
    }
}

export async function queryCalendarDates({
    intent,
    locale,
    birth,
    planTier = "free",
    today = new Date(),
    startDate,
    endDate,
    maxCandidates = CALENDAR_QUERY_MAX_CANDIDATES,
}: CalendarQueryOptions): Promise<CalendarQueryResult> {
    const safeToday = clampToStartOfDay(today)
    const windowDays = getCalendarWindowDays(planTier)
    const windowStart = Number.isFinite(windowDays)
        ? addDays(safeToday, -windowDays)
        : new Date(1900, 0, 1)
    const windowEnd = Number.isFinite(windowDays)
        ? addDays(safeToday, windowDays)
        : new Date(2100, 11, 31)

    const defaultStart = safeToday
    const defaultEnd = addDays(safeToday, CALENDAR_QUERY_DEFAULT_RANGE_DAYS)
    const requestedStart = clampToStartOfDay(startDate ?? defaultStart)
    const requestedEnd = clampToStartOfDay(endDate ?? defaultEnd)
    const boundedStart =
        requestedStart < windowStart ? clampToStartOfDay(windowStart) : requestedStart
    const boundedEnd =
        requestedEnd > windowEnd ? clampToStartOfDay(windowEnd) : requestedEnd

    if (boundedEnd < boundedStart) {
        return {
            intent,
            searchStartIso: toIsoDate(requestedStart),
            searchEndIso: toIsoDate(requestedEnd),
            windowStartIso: toIsoDate(windowStart),
            windowEndIso: toIsoDate(windowEnd),
            usedDefaultRange: !startDate && !endDate,
            confidence: "low",
            candidates: [],
            topCandidate: null,
        }
    }

    const range = toQuestionTimeRange(boundedStart, boundedEnd)
    const system = getDefaultAstrologySystem(null, birth.country ?? null)
    const resolvedTime = resolveBirthTime({
        hour: birth.hour ?? null,
        minute: birth.minute ?? null,
        timeHint: birth.timeHint ?? "unknown",
    })

    const [codex, natalChart] = await Promise.all([
        getCodexTransitWindow(range),
        calculateSwissEphChart(
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
            system,
        ),
    ])

    const natalLongitudes = buildNatalLongitudes(natalChart.planets ?? {})
    const candidates: CalendarQueryCandidate[] = []

    for (const row of codex.rows) {
        const cell = new Date(`${row.date}T00:00:00`)
        if (cell < boundedStart || cell > boundedEnd) continue
        if (!isDateWithinWindow(cell, safeToday, windowDays)) continue

        const exact = computeExactTransitAspects({
            dateIso: row.date,
            natalLongitudes,
            codexRow: row,
        })
        const day = buildDayDataFromCodex(cell, row, exact?.events ?? [], locale)
        candidates.push(toCandidate(row.date, day.eventSignals[intent], day))
    }

    candidates.sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score
        if (right.overall !== left.overall) return right.overall - left.overall
        if (right.career !== left.career) return right.career - left.career
        return left.isoDate.localeCompare(right.isoDate)
    })

    const topCandidate = candidates[0] ?? null

    return {
        intent,
        searchStartIso: toIsoDate(requestedStart),
        searchEndIso: toIsoDate(requestedEnd),
        windowStartIso: toIsoDate(windowStart),
        windowEndIso: toIsoDate(windowEnd),
        usedDefaultRange: !startDate && !endDate,
        confidence: topCandidate ? scoreToConfidence(topCandidate.score) : "low",
        candidates: candidates.slice(0, maxCandidates),
        topCandidate,
    }
}
