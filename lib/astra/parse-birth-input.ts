/**
 * Reading a birth date or time out of whatever the person types.
 *
 * The pickers above the composer are the easy path, but the composer itself
 * stays open the whole time — so "12/5/2542", "May 12 1999", "07:20", and
 * "จำไม่ได้" all have to land. Anything this cannot read confidently returns
 * null, and she asks again rather than guessing a birth chart wrong.
 */

export type ParsedBirthDate = { year: number; month: number; day: number }
export type ParsedBirthTime = { hour: number; minute: number }

/** Thai month names, full and abbreviated, in calendar order. */
const THAI_MONTHS = [
    ["มกราคม", "ม.ค.", "มค"],
    ["กุมภาพันธ์", "ก.พ.", "กพ"],
    ["มีนาคม", "มี.ค.", "มีค"],
    ["เมษายน", "เม.ย.", "เมย"],
    ["พฤษภาคม", "พ.ค.", "พค"],
    ["มิถุนายน", "มิ.ย.", "มิย"],
    ["กรกฎาคม", "ก.ค.", "กค"],
    ["สิงหาคม", "ส.ค.", "สค"],
    ["กันยายน", "ก.ย.", "กย"],
    ["ตุลาคม", "ต.ค.", "ตค"],
    ["พฤศจิกายน", "พ.ย.", "พย"],
    ["ธันวาคม", "ธ.ค.", "ธค"],
]

const EN_MONTHS = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
]

/** "I don't know", in the languages this is likely to arrive in. */
const UNKNOWN_PATTERNS =
    /(ไม่รู้|ไม่ทราบ|จำไม่ได้|ไม่แน่ใจ|บ่ฮู้|ບໍ່ຮູ້|don'?t\s*know|do\s*not\s*know|not\s*sure|no\s*idea|unknown|不知道|わからない|모르)/i

export function saysUnknown(input: string): boolean {
    return UNKNOWN_PATTERNS.test(input)
}

function monthFromWord(token: string): number | null {
    const cleaned = token.toLowerCase().replace(/[.\s]/g, "")
    for (let i = 0; i < THAI_MONTHS.length; i += 1) {
        for (const name of THAI_MONTHS[i]) {
            if (cleaned === name.replace(/\./g, "")) return i + 1
        }
    }
    for (let i = 0; i < EN_MONTHS.length; i += 1) {
        const full = EN_MONTHS[i]
        if (cleaned === full || cleaned === full.slice(0, 3)) return i + 1
        // "sept"
        if (i === 8 && cleaned === "sept") return 9
    }
    return null
}

/** Buddhist-era and two-digit years, resolved to a plain Gregorian year. */
function normalizeYear(raw: number, now: Date): number | null {
    let year = raw
    if (year > 2200) year -= 543
    if (year < 100) {
        const currentTwoDigit = now.getFullYear() % 100
        year = year <= currentTwoDigit ? 2000 + year : 1900 + year
    }
    if (year < 1900 || year > now.getFullYear()) return null
    return year
}

function buildDate(
    day: number,
    month: number,
    year: number,
    now: Date,
): ParsedBirthDate | null {
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    const normalizedYear = normalizeYear(year, now)
    if (normalizedYear == null) return null
    const probe = new Date(Date.UTC(normalizedYear, month - 1, day))
    if (
        probe.getUTCFullYear() !== normalizedYear ||
        probe.getUTCMonth() !== month - 1 ||
        probe.getUTCDate() !== day
    ) {
        return null
    }
    if (probe.getTime() > now.getTime()) return null
    return { year: normalizedYear, month, day }
}

/**
 * Day-first for numeric dates ("12/5/2542"), because that is how the people
 * this is written for write dates. A four-digit leading number is read as ISO.
 */
export function parseBirthDate(
    input: string,
    now: Date = new Date(),
): ParsedBirthDate | null {
    const text = input.trim()
    if (!text) return null

    const iso = text.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/)
    if (iso) {
        return buildDate(
            Number(iso[3]),
            Number(iso[2]),
            Number(iso[1]),
            now,
        )
    }

    const numeric = text.match(/\b(\d{1,2})[-/.\s](\d{1,2})[-/.\s](\d{2,4})\b/)
    if (numeric) {
        const first = Number(numeric[1])
        const second = Number(numeric[2])
        // A first number above 12 can only be the day; otherwise day-first.
        const [day, month] = first > 12 && second <= 12
            ? [first, second]
            : second > 12 && first <= 12
              ? [second, first]
              : [first, second]
        return buildDate(day, month, Number(numeric[3]), now)
    }

    // "12 พฤษภาคม 2542" / "12 May 1999" / "May 12, 1999"
    const words = text
        .replace(/,/g, " ")
        .split(/\s+/)
        .filter(Boolean)
    let month: number | null = null
    let monthIndex = -1
    for (let i = 0; i < words.length; i += 1) {
        const found = monthFromWord(words[i])
        if (found) {
            month = found
            monthIndex = i
            break
        }
    }
    if (month == null) return null

    const numbers: number[] = []
    for (let i = 0; i < words.length; i += 1) {
        if (i === monthIndex) continue
        const value = Number(words[i].replace(/[^\d]/g, ""))
        if (Number.isFinite(value) && value > 0) numbers.push(value)
    }
    if (numbers.length < 2) return null
    const day = numbers.find((n) => n <= 31)
    const year = numbers.find((n) => n > 31)
    if (day == null || year == null) return null
    return buildDate(day, month, year, now)
}

/** "07:20", "7.20", "7 20", "7pm", "19" — anything unambiguous. */
export function parseBirthTime(input: string): ParsedBirthTime | null {
    const text = input.trim().toLowerCase()
    if (!text) return null

    // No leading \b: "7pm" has no boundary between the digit and the letters.
    const meridiem = /(am|pm)\b/.exec(text)?.[1]
    const withMinutes = text.match(/\b(\d{1,2})\s*[:.\s]\s*(\d{2})\b/)
    let hour: number
    let minute: number

    if (withMinutes) {
        hour = Number(withMinutes[1])
        minute = Number(withMinutes[2])
    } else {
        // Not \b-anchored either, so "7pm" still yields its hour.
        const hourOnly = text.match(/(\d{1,2})(?!\d)/)
        if (!hourOnly) return null
        hour = Number(hourOnly[1])
        minute = 0
    }

    if (meridiem === "pm" && hour < 12) hour += 12
    if (meridiem === "am" && hour === 12) hour = 0
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
    return { hour, minute }
}
