import type { HoroscopeBirthData } from "@/types/horoscope"

const STORAGE_KEY = "askingfate_birth_information"

export function saveBirthToStorage(data: HoroscopeBirthData): void {
    if (typeof window === "undefined") return
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
        /* ignore */
    }
}

export function clearBirthFromStorage(): void {
    if (typeof window === "undefined") return
    try {
        window.localStorage.removeItem(STORAGE_KEY)
    } catch {
        /* ignore */
    }
}

export function loadBirthFromStorage(): HoroscopeBirthData | null {
    if (typeof window === "undefined") return null
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as unknown
        if (!parsed || typeof parsed !== "object") return null
        const d = parsed as Record<string, unknown>
        return {
            day: typeof d.day === "number" ? d.day : null,
            month: typeof d.month === "number" ? d.month : null,
            year: typeof d.year === "number" ? d.year : null,
            hour: typeof d.hour === "number" ? d.hour : null,
            minute: typeof d.minute === "number" ? d.minute : null,
            timeHint:
                d.timeHint === "day" || d.timeHint === "night"
                    ? d.timeHint
                    : "unknown",
            timezone: typeof d.timezone === "number" ? d.timezone : null,
            lat: typeof d.lat === "number" ? d.lat : null,
            lng: typeof d.lng === "number" ? d.lng : null,
            country: typeof d.country === "string" ? d.country : null,
            state: typeof d.state === "string" ? d.state : null,
            usedLocationFallback: Boolean(d.usedLocationFallback),
        }
    } catch {
        return null
    }
}

export function hasCompleteBirthData(data: HoroscopeBirthData | null): boolean {
    if (!data) return false
    const hasDate = Boolean(data.day && data.month && data.year)
    const hasLocation = Boolean(
        data.country &&
            data.lat != null &&
            data.lng != null &&
            data.timezone != null,
    )
    return hasDate && hasLocation
}
