const DEFAULT_FALLBACK_DAYS = 180
const DAY_MS = 24 * 60 * 60 * 1000

export type TimeRangeSource = "explicit" | "relative" | "default_180d"

export type QuestionTimeRange = {
    startDate: Date
    endDate: Date
    startDateIso: string
    endDateIso: string
    durationDays: number
    source: TimeRangeSource
}

type TransitDateHint = {
    day?: number | null
    month?: number | null
    year?: number | null
} | null

function startOfUtcDay(value: Date) {
    return new Date(
        Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
    )
}

function toIsoDate(value: Date) {
    return value.toISOString().slice(0, 10)
}

function addDays(value: Date, days: number) {
    return new Date(value.getTime() + days * DAY_MS)
}

function lastDayOfMonthUtc(year: number, monthIndex: number) {
    return new Date(Date.UTC(year, monthIndex + 1, 0))
}

function parseMonthName(text: string) {
    const normalized = text.toLowerCase()
    const monthMap: Record<string, number> = {
        jan: 1,
        january: 1,
        feb: 2,
        february: 2,
        mar: 3,
        march: 3,
        apr: 4,
        april: 4,
        may: 5,
        jun: 6,
        june: 6,
        jul: 7,
        july: 7,
        aug: 8,
        august: 8,
        sep: 9,
        sept: 9,
        september: 9,
        oct: 10,
        october: 10,
        nov: 11,
        november: 11,
        dec: 12,
        december: 12,
    }
    return monthMap[normalized] ?? null
}

function toValidUtcDate(year: number, month: number, day: number) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
        return null
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    const date = new Date(Date.UTC(year, month - 1, day))
    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null
    }
    return date
}

function parseExplicitDate(question: string): Date | null {
    const isoMatch = question.match(/\b(19\d{2}|20\d{2})-(\d{1,2})-(\d{1,2})\b/)
    if (isoMatch) {
        const parsed = toValidUtcDate(
            Number(isoMatch[1]),
            Number(isoMatch[2]),
            Number(isoMatch[3])
        )
        if (parsed) return parsed
    }

    const slashMatch = question.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](19\d{2}|20\d{2})\b/)
    if (slashMatch) {
        const left = Number(slashMatch[1])
        const right = Number(slashMatch[2])
        const year = Number(slashMatch[3])
        const dayFirst = toValidUtcDate(year, right, left)
        if (dayFirst) return dayFirst
        const monthFirst = toValidUtcDate(year, left, right)
        if (monthFirst) return monthFirst
    }

    const longMonthMatch = question.match(
        /\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(19\d{2}|20\d{2})\b/
    )
    if (longMonthMatch) {
        const month = parseMonthName(longMonthMatch[1])
        const day = Number(longMonthMatch[2])
        const year = Number(longMonthMatch[3])
        if (month) {
            const parsed = toValidUtcDate(year, month, day)
            if (parsed) return parsed
        }
    }

    const dayFirstLongMonthMatch = question.match(
        /\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(19\d{2}|20\d{2})\b/
    )
    if (dayFirstLongMonthMatch) {
        const day = Number(dayFirstLongMonthMatch[1])
        const month = parseMonthName(dayFirstLongMonthMatch[2])
        const year = Number(dayFirstLongMonthMatch[3])
        if (month) {
            const parsed = toValidUtcDate(year, month, day)
            if (parsed) return parsed
        }
    }

    return null
}

function parseRelativeSingleDayDate(question: string, now: Date): Date | null {
    if (/\b(today|this day)\b|วันนี้/i.test(question)) {
        return now
    }
    if (/\b(tomorrow)\b|พรุ่งนี้/i.test(question)) {
        return addDays(now, 1)
    }
    return null
}

type RelativeRange = {
    durationDays?: number
    calendarEnd?: Date
}

function parseRelativeRange(question: string, now: Date): RelativeRange | null {
    if (/\b(today|this day)\b|วันนี้/i.test(question)) {
        return { durationDays: 1 }
    }
    if (/\b(tomorrow)\b|พรุ่งนี้/i.test(question)) {
        return { durationDays: 1 }
    }

    const lowered = question.toLowerCase()
    const withinMatch = lowered.match(
        /\b(?:within|in|for|next)\s+(\d+)\s+(day|days|week|weeks|month|months|year|years)\b/
    )
    if (withinMatch) {
        const amount = Number(withinMatch[1])
        const unit = withinMatch[2]
        const factor =
            unit.startsWith("day")
                ? 1
                : unit.startsWith("week")
                  ? 7
                  : unit.startsWith("month")
                    ? 30
                    : 365
        if (Number.isFinite(amount) && amount > 0) {
            return { durationDays: amount * factor }
        }
    }

    const thaiWithinMatch = question.match(
        /(?:ในอีก|ภายใน|อีก)\s*(\d+)\s*(วัน|สัปดาห์|เดือน|ปี)/
    )
    if (thaiWithinMatch) {
        const amount = Number(thaiWithinMatch[1])
        const unit = thaiWithinMatch[2]
        const factor =
            unit === "วัน" ? 1 : unit === "สัปดาห์" ? 7 : unit === "เดือน" ? 30 : 365
        if (Number.isFinite(amount) && amount > 0) {
            return { durationDays: amount * factor }
        }
    }

    if (/\bthis\s+month\b|เดือนนี้/i.test(question)) {
        return {
            calendarEnd: lastDayOfMonthUtc(now.getUTCFullYear(), now.getUTCMonth()),
        }
    }
    if (/\bnext\s+month\b|เดือนหน้า/i.test(question)) {
        const nextMonth = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
        )
        return {
            durationDays: 30,
            calendarEnd: lastDayOfMonthUtc(
                nextMonth.getUTCFullYear(),
                nextMonth.getUTCMonth()
            ),
        }
    }
    if (/\bthis\s+year\b|ปีนี้/i.test(question)) {
        return {
            calendarEnd: new Date(Date.UTC(now.getUTCFullYear(), 11, 31)),
        }
    }
    if (/\bnext\s+year\b|ปีหน้า/i.test(question)) {
        return {
            calendarEnd: new Date(Date.UTC(now.getUTCFullYear() + 1, 11, 31)),
        }
    }

    return null
}

function normalizeDurationDays(startDate: Date, endDate: Date) {
    const diff = Math.ceil((endDate.getTime() - startDate.getTime()) / DAY_MS)
    return Math.max(diff, 1)
}

function getHintDate(hint: TransitDateHint) {
    if (!hint?.year || !hint?.month || !hint?.day) return null
    return toValidUtcDate(hint.year, hint.month, hint.day)
}

export function resolveQuestionTimeRange(
    question: string,
    opts?: {
        now?: Date
        hintedTransitDate?: TransitDateHint
    }
): QuestionTimeRange {
    const today = startOfUtcDay(opts?.now ?? new Date())
    const explicitDate =
        parseExplicitDate(question) ||
        parseRelativeSingleDayDate(question, today) ||
        getHintDate(opts?.hintedTransitDate ?? null)
    const relativeRange = parseRelativeRange(question, today)

    const startDate = explicitDate ?? today
    let source: TimeRangeSource = "default_180d"
    let endDate = addDays(startDate, DEFAULT_FALLBACK_DAYS)

    if (explicitDate && !relativeRange) {
        endDate = addDays(startDate, 1)
        source = "explicit"
    } else if (relativeRange?.calendarEnd) {
        endDate = startOfUtcDay(relativeRange.calendarEnd)
        source = "relative"
    } else if (relativeRange?.durationDays) {
        endDate = addDays(startDate, relativeRange.durationDays)
        source = "relative"
    }

    if (explicitDate && source === "default_180d") {
        source = source === "default_180d" ? "explicit" : source
    }

    if (endDate.getTime() <= startDate.getTime()) {
        endDate = addDays(startDate, DEFAULT_FALLBACK_DAYS)
        source = explicitDate ? "explicit" : "default_180d"
    }

    const durationDays = normalizeDurationDays(startDate, endDate)
    return {
        startDate,
        endDate,
        startDateIso: toIsoDate(startDate),
        endDateIso: toIsoDate(endDate),
        durationDays,
        source,
    }
}
