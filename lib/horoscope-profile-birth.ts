import type { HoroscopeBirthData } from "@/types/horoscope"

/** Minimal profile fields needed to build natal input for horoscope / ephemeris. */
export type ProfileBirthFields = {
    birth_date: string | null
    birth_time: string | null
    birth_place: string | null
}

/**
 * Maps DB profile birth fields to HoroscopeBirthData.
 * Birth place is free text: stored as `country`; lat/lng/tz stay null until
 * {@link applyEphemerisLocationTimeDefaults} (0, 0, 0 for calculations).
 */
export function profileToHoroscopeBirthData(
    profile: ProfileBirthFields | null | undefined,
): HoroscopeBirthData | null {
    if (!profile?.birth_date) return null
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(profile.birth_date.trim())
    if (!dateMatch) return null
    const year = Number.parseInt(dateMatch[1], 10)
    const month = Number.parseInt(dateMatch[2], 10)
    const day = Number.parseInt(dateMatch[3], 10)
    if (
        !Number.isFinite(year) ||
        !Number.isFinite(month) ||
        !Number.isFinite(day)
    ) {
        return null
    }

    let hour: number | null = null
    let minute: number | null = null
    const tt = profile.birth_time?.trim()
    if (tt) {
        const timeMatch = /^(\d{1,2}):(\d{2})/.exec(tt)
        if (timeMatch) {
            hour = Number.parseInt(timeMatch[1], 10)
            minute = Number.parseInt(timeMatch[2], 10)
        }
    }

    const place = profile.birth_place?.trim() || null

    return {
        day,
        month,
        year,
        hour,
        minute,
        timeHint: "unknown",
        timezone: null,
        lat: null,
        lng: null,
        country: place,
        state: null,
        usedLocationFallback: true,
    }
}

/** True when natal calendar date is complete (time/location may be defaulted). */
export function hasHoroscopeBirthDate(data: HoroscopeBirthData | null): boolean {
    if (!data) return false
    return Boolean(data.day && data.month && data.year)
}

/**
 * Fills missing natal fields from profile (logged-in). Extracted chat values
 * win when present.
 */
export function mergeHoroscopeBirthWithProfile(
    birth: HoroscopeBirthData,
    profile: ProfileBirthFields | null | undefined,
): HoroscopeBirthData {
    const p = profileToHoroscopeBirthData(profile)
    if (!p) return birth
    return {
        day: birth.day ?? p.day,
        month: birth.month ?? p.month,
        year: birth.year ?? p.year,
        hour: birth.hour ?? p.hour,
        minute: birth.minute ?? p.minute,
        timeHint: birth.timeHint !== "unknown" ? birth.timeHint : p.timeHint,
        timezone: birth.timezone ?? p.timezone,
        lat: birth.lat ?? p.lat,
        lng: birth.lng ?? p.lng,
        country: birth.country ?? p.country,
        state: birth.state ?? p.state,
        usedLocationFallback: birth.usedLocationFallback || p.usedLocationFallback,
    }
}

/**
 * Ephemeris fallbacks: unknown time → 00:00; unknown location → lat/lng/tz 0.
 */
export function applyEphemerisLocationTimeDefaults(
    birth: HoroscopeBirthData,
): HoroscopeBirthData {
    const hour = birth.hour ?? 0
    const minute = birth.minute ?? 0
    const latMissing = birth.lat == null || Number.isNaN(birth.lat)
    const lngMissing = birth.lng == null || Number.isNaN(birth.lng)
    const tzMissing = birth.timezone == null || Number.isNaN(birth.timezone)
    return {
        ...birth,
        hour,
        minute,
        timeHint: birth.timeHint ?? "unknown",
        lat: latMissing ? 0 : birth.lat!,
        lng: lngMissing ? 0 : birth.lng!,
        timezone: tzMissing ? 0 : birth.timezone!,
        usedLocationFallback:
            birth.usedLocationFallback || latMissing || lngMissing || tzMissing,
    }
}
