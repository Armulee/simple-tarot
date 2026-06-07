import { resolveLocationFromCountryState } from "@/lib/location"
import type { HoroscopeBirthData } from "@/types/horoscope"

/** Minimal profile fields needed to build natal input for horoscope / ephemeris. */
export type ProfileBirthFields = {
    birth_date: string | null
    birth_time: string | null
    birth_place: string | null
}

function parseProfileBirthPlace(place: string | null): {
    country: string | null
    state: string | null
} {
    if (!place) return { country: null, state: null }
    const parts = place
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
    if (parts.length === 0) return { country: null, state: null }
    if (parts.length === 1) return { country: parts[0], state: null }

    return {
        country: parts[parts.length - 1],
        state: parts[parts.length - 2],
    }
}

/**
 * Maps DB profile birth fields to HoroscopeBirthData.
 * Birth place is free text; when it matches a known country/state we resolve
 * representative lat/lng/timezone so horoscope calculations can use it.
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
    const parsedPlace = parseProfileBirthPlace(place)
    const resolvedPlace = parsedPlace.country
        ? resolveLocationFromCountryState(
              parsedPlace.country,
              parsedPlace.state ?? undefined,
          )
        : null

    return {
        day,
        month,
        year,
        hour,
        minute,
        timeHint: "unknown",
        timezone: resolvedPlace?.timezone ?? null,
        lat: resolvedPlace?.latitude ?? null,
        lng: resolvedPlace?.longitude ?? null,
        country: resolvedPlace?.countryName ?? parsedPlace.country,
        state: resolvedPlace?.stateName ?? parsedPlace.state,
        // Profile has place text only; ephemeris may fill coords later. This is
        // not the same as "birth place came from device current location".
        usedLocationFallback: false,
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
        // Only preserve explicit "used current / client location for birth place"
        // (extract route, inline form). Missing coords before 0-defaults are not
        // that signal and would false-trigger the user-facing disclaimer.
        usedLocationFallback: birth.usedLocationFallback,
    }
}

/**
 * Shape returned by `/api/horoscope/extract` for a third party mentioned in
 * the chat message. Each leaf may be null when the model couldn't extract it.
 */
export type MentionedPersonBirth = {
    isOtherPerson?: boolean | null
    birthDate?: {
        day: number | null
        month: number | null
        year: number | null
    } | null
    birthTime?: {
        hour: number | null
        minute: number | null
    } | null
    birthPlace?: {
        country: string | null
        state: string | null
    } | null
}

/**
 * Buddhist Era → Gregorian for years that are clearly BE (≥2400). Mirrors the
 * same conversion the extract route applies before comparison.
 */
function normalizeBirthYear(year: number | null | undefined): number | null {
    if (year == null || !Number.isFinite(year)) return null
    const n = Number(year)
    if (n >= 2400 && n <= 2800) return n - 543
    return n
}

/**
 * Build `HoroscopeBirthData` for the third party mentioned in the chat
 * message — used when a paid asker asks about someone else's chart. Falls
 * back to the asker's profile for time/place so the reading can still run
 * when the user only supplied the third party's birth DATE.
 *
 * Returns null when the mention is missing day / month / year (required to
 * build a natal chart at all).
 */
export function mentionedPersonToHoroscopeBirthData(
    mention: MentionedPersonBirth | null | undefined,
    askerProfile: ProfileBirthFields | null | undefined,
): HoroscopeBirthData | null {
    if (!mention?.birthDate) return null
    const { day, month } = mention.birthDate
    const year = normalizeBirthYear(mention.birthDate.year)
    if (!day || !month || !year) return null

    const askerBirth = profileToHoroscopeBirthData(askerProfile ?? null)
    const mentionedPlace = mention.birthPlace ?? null
    const resolvedPlace = mentionedPlace?.country
        ? resolveLocationFromCountryState(
              mentionedPlace.country,
              mentionedPlace.state ?? undefined,
          )
        : null

    return {
        day,
        month,
        year,
        hour: mention.birthTime?.hour ?? null,
        minute: mention.birthTime?.minute ?? null,
        timeHint: "unknown",
        timezone: resolvedPlace?.timezone ?? askerBirth?.timezone ?? null,
        lat: resolvedPlace?.latitude ?? askerBirth?.lat ?? null,
        lng: resolvedPlace?.longitude ?? askerBirth?.lng ?? null,
        country:
            resolvedPlace?.countryName ??
            mentionedPlace?.country ??
            askerBirth?.country ??
            null,
        state:
            resolvedPlace?.stateName ??
            mentionedPlace?.state ??
            askerBirth?.state ??
            null,
        usedLocationFallback: false,
    }
}
