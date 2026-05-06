import type { TimeRangeSource } from "./question-time-range"

/**
 * Minimal shape needed to decide single-day rendering. We keep this loose so
 * the helper can accept either the full `QuestionTimeRange` from the resolver
 * or the slimmed-down `questionRange` that is attached to chart data and
 * persisted on chat messages.
 */
export type SingleDayCheckable = {
    durationDays?: number | null
    source?: TimeRangeSource | string | null
}

/**
 * Returns true iff the question references exactly one day AND the resolver
 * was confident about it (explicit date or unambiguous relative phrasing like
 * today/tomorrow). We deliberately exclude `default_30d` and `ai_inferred`
 * even when their durationDays happens to be 1, because those signals are not
 * trustworthy enough to swap the user into the "daily verdict" experience.
 */
export function isSingleDayQuestionRange(
    range: SingleDayCheckable | null | undefined,
): boolean {
    if (!range) return false
    if (range.durationDays !== 1) return false
    return range.source === "explicit" || range.source === "relative"
}

/**
 * Convenience for picking the questionRange off an arbitrary chart data blob
 * (the message stores chartData as Record<string, unknown> so callers don't
 * have to do their own type narrowing).
 */
export function readQuestionRangeFromChartData(
    chartData: Record<string, unknown> | null | undefined,
): SingleDayCheckable | null {
    if (!chartData || typeof chartData !== "object") return null
    const range = (chartData as { questionRange?: unknown }).questionRange
    if (!range || typeof range !== "object") return null
    const r = range as Record<string, unknown>
    const durationDays =
        typeof r.durationDays === "number" ? r.durationDays : null
    const source = typeof r.source === "string" ? r.source : null
    if (durationDays === null || source === null) return null
    return { durationDays, source }
}
