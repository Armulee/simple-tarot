type TransitDateParts = {
    day: number
    month: number
    year: number
}

type ExtractedTransitDate = {
    mentioned?: boolean
    day?: number | null
    month?: number | null
    year?: number | null
} | null

export type TransitExtractResult = {
    mentioned: boolean
    day: number | null
    month: number | null
    year: number | null
}

const DAY_MS = 24 * 60 * 60 * 1000

function startOfUtcDay(value: Date) {
    return new Date(
        Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    )
}

function addDays(value: Date, days: number) {
    return new Date(value.getTime() + days * DAY_MS)
}

function toValidUtcDate(year: number, month: number, day: number): Date | null {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day))
        return null
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

function toParts(date: Date): TransitDateParts {
    return {
        day: date.getUTCDate(),
        month: date.getUTCMonth() + 1,
        year: date.getUTCFullYear(),
    }
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
        มกราคม: 1,
        กุมภาพันธ์: 2,
        มีนาคม: 3,
        เมษายน: 4,
        พฤษภาคม: 5,
        มิถุนายน: 6,
        กรกฎาคม: 7,
        สิงหาคม: 8,
        กันยายน: 9,
        ตุลาคม: 10,
        พฤศจิกายน: 11,
        ธันวาคม: 12,
    }
    return monthMap[normalized] ?? null
}

function hasBirthContext(message: string, matchIndex: number) {
    const contextStart = Math.max(0, matchIndex - 30)
    const contextEnd = Math.min(message.length, matchIndex + 30)
    const window = message.slice(contextStart, contextEnd).toLowerCase()
    return /\b(born|birth|birthday|dob)\b|เกิด|วันเกิด/.test(window)
}

function parseRelativeDay(message: string, now: Date): TransitDateParts | null {
    if (/\b(today|this day)\b|วันนี้/i.test(message)) {
        return toParts(startOfUtcDay(now))
    }
    if (/\b(tomorrow)\b|พรุ่งนี้/i.test(message)) {
        return toParts(addDays(startOfUtcDay(now), 1))
    }
    return null
}

function parseDayOnly(message: string, now: Date): TransitDateParts | null {
    const match =
        message.match(/\b(?:on|date)\s*(?:the\s*)?(\d{1,2})\b/i) ||
        message.match(/(?:วันที่|วันที)\s*(\d{1,2})/)
    if (!match) return null

    const day = Number(match[1])
    const month = now.getUTCMonth() + 1
    const year = now.getUTCFullYear()
    const parsed = toValidUtcDate(year, month, day)
    return parsed ? toParts(parsed) : null
}

function parseExplicitDate(message: string, now: Date): TransitDateParts | null {
    const isoRegex = /\b(19\d{2}|20\d{2})-(\d{1,2})-(\d{1,2})\b/g
    let isoMatch: RegExpExecArray | null = null
    while ((isoMatch = isoRegex.exec(message))) {
        if (hasBirthContext(message, isoMatch.index)) continue
        const parsed = toValidUtcDate(
            Number(isoMatch[1]),
            Number(isoMatch[2]),
            Number(isoMatch[3]),
        )
        if (parsed) return toParts(parsed)
    }

    const slashRegex = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](19\d{2}|20\d{2})\b/g
    let slashMatch: RegExpExecArray | null = null
    while ((slashMatch = slashRegex.exec(message))) {
        if (hasBirthContext(message, slashMatch.index)) continue
        const left = Number(slashMatch[1])
        const right = Number(slashMatch[2])
        const year = Number(slashMatch[3])
        const dayFirst = toValidUtcDate(year, right, left)
        if (dayFirst) return toParts(dayFirst)
        const monthFirst = toValidUtcDate(year, left, right)
        if (monthFirst) return toParts(monthFirst)
    }

    const monthFirstRegex =
        /\b([A-Za-z]{3,9}|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s+(\d{1,2})(?:,?\s+(19\d{2}|20\d{2}))?\b/gi
    let monthFirstMatch: RegExpExecArray | null = null
    while ((monthFirstMatch = monthFirstRegex.exec(message))) {
        if (hasBirthContext(message, monthFirstMatch.index)) continue
        const month = parseMonthName(monthFirstMatch[1])
        const day = Number(monthFirstMatch[2])
        const year = monthFirstMatch[3]
            ? Number(monthFirstMatch[3])
            : now.getUTCFullYear()
        if (!month) continue
        const parsed = toValidUtcDate(year, month, day)
        if (parsed) return toParts(parsed)
    }

    const dayFirstRegex =
        /\b(\d{1,2})\s+([A-Za-z]{3,9}|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)(?:\s+(19\d{2}|20\d{2}))?\b/gi
    let dayFirstMatch: RegExpExecArray | null = null
    while ((dayFirstMatch = dayFirstRegex.exec(message))) {
        if (hasBirthContext(message, dayFirstMatch.index)) continue
        const day = Number(dayFirstMatch[1])
        const month = parseMonthName(dayFirstMatch[2])
        const year = dayFirstMatch[3]
            ? Number(dayFirstMatch[3])
            : now.getUTCFullYear()
        if (!month) continue
        const parsed = toValidUtcDate(year, month, day)
        if (parsed) return toParts(parsed)
    }

    return null
}

export function resolveDeterministicTransitDate(
    message: string,
    now: Date = new Date(),
): TransitDateParts | null {
    return (
        parseExplicitDate(message, now) ||
        parseRelativeDay(message, now) ||
        parseDayOnly(message, now) ||
        null
    )
}

export function toValidTransitDateParts(
    transit: ExtractedTransitDate,
): TransitDateParts | null {
    if (!transit?.mentioned) return null
    if (transit.day == null || transit.month == null || transit.year == null) return null
    const date = toValidUtcDate(transit.year, transit.month, transit.day)
    return date ? toParts(date) : null
}

export function selectTransitDateFromSources(args: {
    message: string
    extractedTransit: ExtractedTransitDate
    now?: Date
}): TransitExtractResult {
    const deterministic = resolveDeterministicTransitDate(args.message, args.now)
    const aiValid = toValidTransitDateParts(args.extractedTransit)
    const selected = deterministic || aiValid
    if (!selected) {
        return {
            mentioned: false,
            day: null,
            month: null,
            year: null,
        }
    }
    return {
        mentioned: true,
        day: selected.day,
        month: selected.month,
        year: selected.year,
    }
}
