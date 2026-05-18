import type { DayQuality } from "@/lib/calendar-helper"

export function monthKey(year: number, month: number): string {
    return `${year}-${month}`
}

export function sameYMD(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    )
}

export function getCalendarIntlLocale(locale: string) {
    if (locale === "th") return "th-TH"
    if (locale === "lo") return "lo-LA"
    return "en-US"
}

export function formatMonthHeading(
    locale: string,
    year: number,
    month: number,
) {
    return new Intl.DateTimeFormat(getCalendarIntlLocale(locale), {
        month: "long",
        year: "numeric",
    }).format(new Date(year, month, 1))
}

export function formatFullDate(locale: string, date: Date) {
    return new Intl.DateTimeFormat(getCalendarIntlLocale(locale), {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(date)
}

export function formatDayAriaLabel(locale: string, date: Date) {
    return new Intl.DateTimeFormat(getCalendarIntlLocale(locale), {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(date)
}

export function getQualityLabel(
    quality: DayQuality,
    t: (key: string) => string,
) {
    switch (quality) {
        case "excellent":
            return t("excellent")
        case "good":
            return t("good")
        case "neutral":
            return t("neutral")
        case "caution":
            return t("caution")
        case "avoid":
            return t("avoid")
    }
}

const LUCKY_COLOR_TRANSLATION_KEYS: Record<string, string> = {
    ทอง: "gold",
    เงิน: "silver",
    ม่วง: "purple",
    ฟ้า: "sky",
    เขียวมรกต: "emerald",
    แดงเลือดหมู: "maroon",
    ขาวมุก: "pearlWhite",
    ชมพูกุหลาบ: "rosePink",
    น้ำตาลทอง: "goldenBrown",
    เหลืองมัสตาร์ด: "mustardYellow",
    ฟ้าคราม: "azure",
    เขียวน้ำทะเล: "seaGreen",
    ส้มอำพัน: "amberOrange",
}

const LUCKY_DIRECTION_TRANSLATION_KEYS: Record<string, string> = {
    ทิศเหนือ: "north",
    ทิศตะวันออกเฉียงเหนือ: "northEast",
    ทิศตะวันออก: "east",
    ทิศตะวันออกเฉียงใต้: "southEast",
    ทิศใต้: "south",
    ทิศตะวันตกเฉียงใต้: "southWest",
    ทิศตะวันตก: "west",
    ทิศตะวันตกเฉียงเหนือ: "northWest",
}

export function translateLuckyColor(color: string, t: (key: string) => string) {
    const key = LUCKY_COLOR_TRANSLATION_KEYS[color]
    return key ? t(key) : color
}

export function translateLuckyDirection(
    direction: string,
    t: (key: string) => string,
) {
    const key = LUCKY_DIRECTION_TRANSLATION_KEYS[direction]
    return key ? t(key) : direction
}
