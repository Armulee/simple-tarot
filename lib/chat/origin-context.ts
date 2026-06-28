/**
 * Page-level "origin context" that can be attached to a chat session at
 * creation time. Persisted on `chat_sessions.origin_context` (JSONB) and
 * merged into every `contextSummary` we send to the AI on follow-ups so the
 * AI keeps seeing the birth chart / calendar day the user started from.
 */

import type { DayData } from "@/lib/calendar-helper"
import type { AstroPoint } from "@/lib/birth-chart-utils"

export type BirthChartOriginContext = {
    kind: "birth-chart"
    label: string
    summary: string
}

export type CalendarDayOriginContext = {
    kind: "calendar-day"
    label: string
    isoDate: string
    summary: string
}

export type TarotCardOriginContext = {
    kind: "tarot-card"
    label: string
    slug: string
    summary: string
}

export type OriginContext =
    | BirthChartOriginContext
    | CalendarDayOriginContext
    | TarotCardOriginContext

const MAX_SUMMARY_CHARS = 600
const MAX_LABEL_CHARS = 120

function clamp(text: string, max: number) {
    const trimmed = text.replace(/\s+/g, " ").trim()
    if (trimmed.length <= max) return trimmed
    return `${trimmed.slice(0, Math.max(1, max - 1)).trim()}…`
}

export function isOriginContext(value: unknown): value is OriginContext {
    if (!value || typeof value !== "object") return false
    const v = value as Record<string, unknown>
    if (v.kind === "birth-chart") {
        return typeof v.label === "string" && typeof v.summary === "string"
    }
    if (v.kind === "calendar-day") {
        return (
            typeof v.label === "string" &&
            typeof v.summary === "string" &&
            typeof v.isoDate === "string"
        )
    }
    if (v.kind === "tarot-card") {
        return (
            typeof v.label === "string" &&
            typeof v.summary === "string" &&
            typeof v.slug === "string"
        )
    }
    return false
}

export function normalizeOriginContext(value: unknown): OriginContext | null {
    if (!isOriginContext(value)) return null
    if (value.kind === "birth-chart") {
        return {
            kind: "birth-chart",
            label: clamp(value.label, MAX_LABEL_CHARS),
            summary: clamp(value.summary, MAX_SUMMARY_CHARS),
        }
    }
    if (value.kind === "tarot-card") {
        return {
            kind: "tarot-card",
            label: clamp(value.label, MAX_LABEL_CHARS),
            slug: value.slug,
            summary: clamp(value.summary, MAX_SUMMARY_CHARS),
        }
    }
    return {
        kind: "calendar-day",
        label: clamp(value.label, MAX_LABEL_CHARS),
        isoDate: value.isoDate,
        summary: clamp(value.summary, MAX_SUMMARY_CHARS),
    }
}

// ---------------------------------------------------------------------------
// Tarot card builder
// ---------------------------------------------------------------------------

/**
 * Origin context for the tarot article page. The summary both describes the
 * card and constrains the AI: this chat ONLY explains the card's meaning and
 * must refuse to predict real-life events from it (those require a full
 * reading / drawing cards).
 */
export function buildTarotCardOriginContext(input: {
    name: string
    slug: string
    arcanaLabel: string
    uprightLine: string
    reversedLine: string
}): TarotCardOriginContext {
    const lines = [
        `Tarot card in focus: ${input.name} (${input.arcanaLabel}). This chat ONLY explains this card — meaning, symbolism, upright/reversed nuance. Do NOT predict real-life events or outcomes from this single card. If the user asks you to foretell an event (e.g. "will my ex come back?"), say you can only explain the card here and invite them to start a full reading (draw cards) for situational guidance.`,
        `Upright — ${input.uprightLine}`,
        `Reversed — ${input.reversedLine}`,
    ]
    return {
        kind: "tarot-card",
        label: clamp(input.name, MAX_LABEL_CHARS),
        slug: input.slug,
        summary: clamp(lines.join("\n"), MAX_SUMMARY_CHARS),
    }
}

// ---------------------------------------------------------------------------
// Birth chart builder
// ---------------------------------------------------------------------------

type BirthChartLike = {
    day: number
    month: number
    year: number
    hour: number
    minute: number
    country?: string | null
    state_province?: string | null
    houses?: Record<string, unknown> | null
    planets?: Record<string, unknown> | null
}

const KEY_PLANETS = [
    "Sun",
    "Moon",
    "Ascendant",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
] as const

function extractAstroPoint(value: unknown): AstroPoint | null {
    if (!value || typeof value !== "object") return null
    const sign = (value as { sign?: unknown }).sign
    if (typeof sign !== "string" || sign.length === 0) return null
    return value as AstroPoint
}

function summarizePlanet(name: string, point: AstroPoint): string {
    const parts: string[] = [`${name} in ${point.sign}`]
    if (point.isExalted) parts.push("exalted")
    else if (point.isDebilitated) parts.push("debilitated")
    else if (point.isOwnSign) parts.push("own sign")
    if (point.degree !== undefined) {
        const deg =
            typeof point.degree === "number"
                ? point.degree.toFixed(1)
                : String(point.degree)
        parts.push(`${deg}°`)
    }
    return parts.join(", ")
}

export function buildBirthChartOriginContext(
    birthChart: BirthChartLike,
    label: string,
): BirthChartOriginContext {
    const lines: string[] = []
    lines.push(
        `Born ${birthChart.year}-${String(birthChart.month).padStart(2, "0")}-${String(
            birthChart.day,
        ).padStart(2, "0")} at ${String(birthChart.hour).padStart(2, "0")}:${String(
            birthChart.minute,
        ).padStart(2, "0")}`,
    )
    const place = [birthChart.state_province, birthChart.country]
        .filter(
            (value): value is string =>
                typeof value === "string" && value.length > 0,
        )
        .join(", ")
    if (place) lines.push(`Birthplace: ${place}`)

    const planets = birthChart.planets ?? {}
    const placements: string[] = []
    for (const name of KEY_PLANETS) {
        const point = extractAstroPoint((planets as Record<string, unknown>)[name])
        if (!point) continue
        placements.push(summarizePlanet(name, point))
    }
    if (placements.length > 0) {
        lines.push(`Key placements: ${placements.join("; ")}`)
    }

    return {
        kind: "birth-chart",
        label: clamp(label, MAX_LABEL_CHARS),
        summary: clamp(lines.join("\n"), MAX_SUMMARY_CHARS),
    }
}

// ---------------------------------------------------------------------------
// Calendar day builder
// ---------------------------------------------------------------------------

function formatLongDate(date: Date, locale: string) {
    try {
        return new Intl.DateTimeFormat(locale, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
        }).format(date)
    } catch {
        return date.toISOString().slice(0, 10)
    }
}

function toIsoLocal(date: Date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
}

export function buildCalendarDayOriginContext(
    date: Date,
    dayData: DayData | null,
    locale: string,
    labelOverride?: string,
): CalendarDayOriginContext {
    const longLabel = formatLongDate(date, locale)
    const isoDate = toIsoLocal(date)

    const lines: string[] = []
    lines.push(`Selected day: ${longLabel} (${isoDate})`)

    if (dayData) {
        const overall = Number.isFinite(dayData.overall)
            ? dayData.overall.toFixed(1)
            : "n/a"
        lines.push(
            `Day quality: ${dayData.quality} (overall score ${overall}/10)`,
        )

        const vitalityLabels = Object.entries(dayData.vitality)
            .map(([key, value]) => `${key} ${Number(value).toFixed(1)}`)
            .join(", ")
        if (vitalityLabels) lines.push(`Vitality: ${vitalityLabels}`)

        const topHighlights = dayData.highlights
            .slice(0, 3)
            .map((h) => h.text)
            .filter((text): text is string => Boolean(text))
        if (topHighlights.length > 0) {
            lines.push(`Highlights: ${topHighlights.join(" | ")}`)
        }
        const topWarnings = dayData.warnings
            .slice(0, 3)
            .map((w) => w.text)
            .filter((text): text is string => Boolean(text))
        if (topWarnings.length > 0) {
            lines.push(`Warnings: ${topWarnings.join(" | ")}`)
        }
    } else {
        lines.push("Day data has not loaded yet on this device.")
    }

    return {
        kind: "calendar-day",
        label: clamp(labelOverride ?? longLabel, MAX_LABEL_CHARS),
        isoDate,
        summary: clamp(lines.join("\n"), MAX_SUMMARY_CHARS),
    }
}

// ---------------------------------------------------------------------------
// Context-strip strategy override (horoscope routing)
// ---------------------------------------------------------------------------

export type OriginContextStrategyOverride = {
    replyStrategy: "daily" | "natal"
    questionRange: {
        startDateIso: string
        endDateIso: string
        durationDays: number
        granularity: "hourly"
    } | null
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Deterministic strategy override for the composer's context strip. The
 * extract LLM classifies from the message text alone, so a question with no
 * time anchor ("how will my career be?") resolves to natal/general even when
 * the user attached a calendar day. The attachment IS the missing anchor:
 *
 * - calendar-day context + no date in the question → daily verdict anchored
 *   to the attached ISO date (transit + natal aspects for that day).
 * - calendar-day context + a RELATIVE "today" reference ("วันนี้ / today /
 *   tonight") → the resolved range comes back as the wall-clock today; in
 *   this UI those words mean the ATTACHED day, so the single-day range is
 *   re-anchored onto it. (An absolute date equal to today written out in
 *   full would also re-anchor — attaching a different day while spelling
 *   out today's date is a contradiction we resolve in the attachment's
 *   favor.)
 * - birth-chart context + no anchor → natal strategy (answer from the user's
 *   natal placements immediately).
 *
 * Absolute dates/windows written in the question win otherwise, and
 * planet-focused (technical) / "when will…" (timing) questions keep their
 * strategy; the attachment never rewrites those.
 */
export function resolveOriginContextStrategyOverride({
    originContext,
    replyStrategy,
    questionRange,
    currentDateIso,
}: {
    originContext:
        | { kind: string; isoDate?: string | null }
        | null
        | undefined
    replyStrategy: string
    questionRange:
        | { startDateIso: string; endDateIso: string }
        | null
        | undefined
    /** Wall-clock "today" (UTC, YYYY-MM-DD) the LLM resolved relative dates against. */
    currentDateIso?: string | null
}): OriginContextStrategyOverride | null {
    if (!originContext) return null

    if (originContext.kind === "calendar-day") {
        const attachedIso =
            typeof originContext.isoDate === "string" &&
            ISO_DATE_RE.test(originContext.isoDate)
                ? originContext.isoDate
                : null
        if (!attachedIso) return null

        const dailyOnAttachedDay: OriginContextStrategyOverride = {
            replyStrategy: "daily",
            questionRange: {
                startDateIso: attachedIso,
                endDateIso: attachedIso,
                durationDays: 1,
                granularity: "hourly",
            },
        }

        if (
            !questionRange &&
            (replyStrategy === "natal" ||
                replyStrategy === "general" ||
                replyStrategy === "daily")
        ) {
            return dailyOnAttachedDay
        }

        if (
            questionRange &&
            replyStrategy === "daily" &&
            currentDateIso &&
            questionRange.startDateIso === currentDateIso &&
            questionRange.endDateIso === currentDateIso &&
            attachedIso !== currentDateIso
        ) {
            return dailyOnAttachedDay
        }

        return null
    }

    if (
        originContext.kind === "birth-chart" &&
        !questionRange &&
        replyStrategy === "general"
    ) {
        return { replyStrategy: "natal", questionRange: null }
    }

    return null
}

// ---------------------------------------------------------------------------
// Summary merge
// ---------------------------------------------------------------------------

/**
 * Prepends the persisted page context to the conversation context summary so
 * the chat decision/respond endpoints can see it on every turn.
 */
export function mergeOriginContextIntoSummary(
    originContext: OriginContext | null | undefined,
    existingSummary: string | null | undefined,
): string {
    const existing = (existingSummary ?? "").trim()
    if (!originContext) return existing

    const prefix = `Page context (where the user started this chat):\n${originContext.summary.trim()}`
    if (!existing) return prefix
    return `${prefix}\n\n${existing}`
}
