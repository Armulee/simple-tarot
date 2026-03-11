import type { HoroscopeBirthData, HoroscopeTransitData } from "@/types/horoscope"

type ChartDataBirth = {
    date?: { day?: number; month?: number; year?: number }
    time?: { hour?: number; minute?: number }
    location?: {
        country?: string | null
        state?: string | null
        lat?: number
        lng?: number
        timezone?: number
    }
}

type ChartDataTransit = {
    date?: {
        day?: number | null
        month?: number | null
        year?: number | null
        hour?: number | null
        minute?: number | null
    }
    location?: {
        country?: string | null
        state?: string | null
        lat?: number | null
        lng?: number | null
        timezone?: number | null
    }
} | null

export function chartDataToBirth(
    chartData: { birth?: ChartDataBirth } | null
): HoroscopeBirthData | null {
    const birth = chartData?.birth
    if (!birth?.date?.day || !birth?.date?.month || !birth?.date?.year) return null
    const loc = birth.location
    if (
        !loc ||
        loc.lat == null ||
        loc.lng == null ||
        loc.timezone == null
    )
        return null
    return {
        day: birth.date.day,
        month: birth.date.month,
        year: birth.date.year,
        hour: birth.time?.hour ?? null,
        minute: birth.time?.minute ?? null,
        timeHint: "unknown",
        timezone: loc.timezone,
        lat: loc.lat,
        lng: loc.lng,
        country: loc.country ?? null,
        state: loc.state ?? null,
        usedLocationFallback: false,
    }
}

export function chartDataToTransit(
    chartData: { transit?: ChartDataTransit } | null
): HoroscopeTransitData | null {
    const transit = chartData?.transit
    if (!transit?.date?.day || !transit?.date?.month || !transit?.date?.year)
        return null
    const loc = transit.location
    if (
        !loc ||
        loc.lat == null ||
        loc.lng == null ||
        loc.timezone == null
    )
        return null
    return {
        day: transit.date.day,
        month: transit.date.month,
        year: transit.date.year,
        hour: transit.date.hour ?? null,
        minute: transit.date.minute ?? null,
        timezone: loc.timezone,
        lat: loc.lat,
        lng: loc.lng,
        country: loc.country ?? null,
        state: loc.state ?? null,
    }
}
