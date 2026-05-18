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
 * Returns true iff the question does NOT pin to a specific date or
 * date-range. These are "self / natal" questions like
 *   "Which career fits me?"
 *   "Am I lucky in love?"
 *   "What is my purpose?"
 * where the resolver had to fall back to the default 30-day window or to an
 * AI-inferred duration because no explicit/relative timing was present.
 *
 * Used by the verdict route to swap from a transit-driven daily verdict to a
 * natal-driven verdict that highlights the user's birth-chart placements.
 */
export function isNatalQuestionRange(
    range: SingleDayCheckable | null | undefined,
): boolean {
    if (!range) return false
    return range.source === "default_30d" || range.source === "ai_inferred"
}

/**
 * Detects open-ended timing questions like "When will I be rich?" or
 * "เมื่อไหร่ฉันจะรวย?". These should NOT be treated as natal — the user
 * is asking for a date or date window — so the verdict route runs a
 * forward-looking transit search instead of the natal lens.
 *
 * Conservative: matches "when" only when it leads a question about the
 * future (will/would/can/could/should/do/am). Bare "when" without a
 * future-tense modal (e.g. "When I was a kid…") is treated as not-timing.
 */
export function looksLikeTimingQuestion(question: string): boolean {
    if (typeof question !== "string") return false
    const trimmed = question.trim()
    if (!trimmed) return false

    // English future-tense "when ... will/can/could/should ..." questions.
    if (
        /\bwhen\b[^?]*\b(will|would|can|could|should|do|am|are|is|going to|gonna)\b/i.test(
            trimmed,
        )
    ) {
        return true
    }
    // "by when", "how long until", "how soon"
    if (/\b(by when|how long until|how soon|how long till)\b/i.test(trimmed)) {
        return true
    }

    // Thai timing markers — "when / what day / what week / what month /
    // what year / what period / how many days/months/years / how long
    // until / for how long". Also catches common typos like "เมื่อใหร่".
    if (
        /(เมื่อไหร่|เมื่อใหร่|เมื่อไร|เมื่อใด|ตอนไหน|ตอนใด|วันไหน|วันใด|สัปดาห์ไหน|อาทิตย์ไหน|เดือนไหน|เดือนใด|ปีไหน|ปีใด|ช่วงไหน|ช่วงใด|ระยะไหน|ระยะใด|อีกกี่วัน|อีกกี่สัปดาห์|อีกกี่เดือน|อีกกี่ปี|อีกกี่นาน|อีกนานไหม|อีกนานแค่ไหน|กี่วัน|กี่สัปดาห์|กี่เดือน|กี่ปี|อีกนาน|ยังอีกนาน)/.test(
            trimmed,
        )
    ) {
        return true
    }

    // Lao timing markers.
    if (
        /(ເມື່ອໃດ|ຕອນໃດ|ມື້ໃດ|ອາທິດໃດ|ເດືອນໃດ|ປີໃດ|ໄລຍະໃດ|ຊ່ວງໃດ|ອີກດົນບໍ່|ອີກຈັກວັນ|ອີກຈັກອາທິດ|ອີກຈັກເດືອນ|ອີກຈັກປີ|ຈັກວັນ|ຈັກອາທິດ|ຈັກເດືອນ|ຈັກປີ|ດົນປານໃດ)/.test(
            trimmed,
        )
    ) {
        return true
    }

    return false
}

/**
 * Cheap, client-safe heuristic that mirrors the regex-based date detection
 * inside `resolveQuestionTimeRange` (server-side resolver). Returns true when
 * the question text contains NO explicit date, no relative single-day phrase
 * ("today", "tomorrow"), and no relative window phrase ("this month", "next
 * year", "within 7 days", etc.) in English/Thai/Lao.
 *
 * We use this on the client to suppress today's transit visuals before the
 * server-side natal verdict has arrived — without it, the reading tabs would
 * briefly auto-flip to "Technical Information" and run today's transit
 * calculation while the natal verdict is still in flight.
 *
 * IMPORTANT: this is intentionally conservative. False positives (treating a
 * date-bound question as natal) only delay the transit visual by a fraction
 * of a second; false negatives (treating a natal question as date-bound)
 * would re-introduce the very flicker we are trying to remove.
 */
export function looksLikeNatalQuestion(question: string): boolean {
    if (typeof question !== "string") return false
    const trimmed = question.trim()
    if (!trimmed) return false

    // Timing questions ("when will I..?") are not natal — they ask for a
    // future date window, even when no explicit date is present.
    if (looksLikeTimingQuestion(trimmed)) return false

    // Single-day relative phrases (English / Thai / Lao).
    if (/\b(today|this\s*day|tonight|tomorrow|yesterday)\b/i.test(trimmed)) {
        return false
    }
    if (/วันนี้|พรุ่งนี้|เมื่อวาน|เมื่อวานนี้|คืนนี้/.test(trimmed)) return false
    if (/ມື້ນີ້|ມື້ອື່ນ|ມື້ວານ|ຄືນນີ້/.test(trimmed)) return false

    // Calendar windows.
    if (
        /\b(this|next|last)\s+(week|fortnight|month|quarter|year|decade)\b/i.test(
            trimmed,
        )
    ) {
        return false
    }
    if (/เดือนนี้|เดือนหน้า|ปีนี้|ปีหน้า|สัปดาห์นี้|สัปดาห์หน้า/.test(trimmed)) {
        return false
    }
    if (/ເດືອນນີ້|ເດືອນໜ້າ|ປີນີ້|ປີໜ້າ|ອາທິດນີ້|ອາທິດໜ້າ/.test(trimmed)) {
        return false
    }

    // "within / in / for / next N day|days|week|...|year"
    if (
        /\b(within|in|for|next)\s+\d+\s+(day|days|week|weeks|month|months|year|years)\b/i.test(
            trimmed,
        )
    ) {
        return false
    }
    if (/(ในอีก|ภายใน|อีก)\s*\d+\s*(วัน|สัปดาห์|เดือน|ปี)/.test(trimmed)) {
        return false
    }
    if (/(ໃນອີກ|ພາຍໃນ|ອີກ)\s*\d+\s*(ມື້|ອາທິດ|ເດືອນ|ປີ)/.test(trimmed)) return false

    // ISO date / slash date / Month-Day-Year long form.
    if (/\b(19|20)\d{2}-\d{1,2}-\d{1,2}\b/.test(trimmed)) return false
    if (/\b\d{1,2}[\/\-]\d{1,2}[\/\-](?:19|20)\d{2}\b/.test(trimmed)) return false
    if (
        /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,\s*\d{4})?\b/i.test(
            trimmed,
        )
    ) {
        return false
    }
    if (
        /\b\d{1,2}\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.test(
            trimmed,
        )
    ) {
        return false
    }

    return true
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
