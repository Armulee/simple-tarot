export type HoroscopeBirthData = {
    day: number | null
    month: number | null
    year: number | null
    hour: number | null
    minute: number | null
    timeHint: "day" | "night" | "unknown"
    timezone: number | null
    lat: number | null
    lng: number | null
    country: string | null
    state: string | null
    usedLocationFallback: boolean
}

export type HoroscopeTransitData = {
    day: number | null
    month: number | null
    year: number | null
    hour: number | null
    minute: number | null
    timezone: number | null
    lat: number | null
    lng: number | null
    country: string | null
    state: string | null
}
