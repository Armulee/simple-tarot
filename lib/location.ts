import {
    Country,
    State,
    City,
    type ICountry,
    type IState,
    type ICity,
} from "country-state-city"
import tzLookup from "tz-lookup"

export interface ResolvedLocation {
    countryName: string
    countryCode: string
    stateName: string | null
    stateCode: string | null
    latitude: number
    longitude: number
    timezone: number
}

function toNumberOrNull(value?: string | null): number | null {
    if (value == null) return null
    const num = Number(value)
    return Number.isFinite(num) ? num : null
}

function timezoneToOffset(timezone: string): number {
    try {
        const now = new Date()

        // Use Intl.DateTimeFormat to get the timezone offset
        const utcDate = new Date(
            now.toLocaleString("en-US", { timeZone: "UTC" })
        )
        const targetDate = new Date(
            now.toLocaleString("en-US", { timeZone: timezone })
        )

        // Calculate the difference in hours
        const offsetMs = targetDate.getTime() - utcDate.getTime()
        const offsetHours = offsetMs / (1000 * 60 * 60)

        return Math.round(offsetHours * 2) / 2 // Round to nearest 0.5
    } catch {
        return 0 // UTC fallback
    }
}

function haversineKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180
    const R = 6371 // km
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

function findNearestCountry(latitude: number, longitude: number): ICountry | null {
    const countries = Country.getAllCountries()
    let best: { c: ICountry; d: number } | null = null

    for (const c of countries) {
        const lat = toNumberOrNull(c.latitude)
        const lng = toNumberOrNull(c.longitude)
        if (lat == null || lng == null) continue
        const d = haversineKm(latitude, longitude, lat, lng)
        if (!best || d < best.d) best = { c, d }
    }
    return best ? best.c : null
}

function findNearestState(
    countryCode: string,
    latitude: number,
    longitude: number
): IState | null {
    const states = State.getStatesOfCountry(countryCode)
    let best: { s: IState; d: number } | null = null
    for (const s of states) {
        const lat = toNumberOrNull(s.latitude)
        const lng = toNumberOrNull(s.longitude)
        if (lat == null || lng == null) continue
        const d = haversineKm(latitude, longitude, lat, lng)
        if (!best || d < best.d) best = { s, d }
    }
    return best ? best.s : null
}

export function getCountryByName(countryName: string): ICountry | undefined {
    const countries = Country.getAllCountries()
    return countries.find(
        (c) => c.name.toLowerCase() === countryName.toLowerCase()
    )
}

export function getStateByName(
    countryCode: string,
    stateName: string
): IState | undefined {
    const states = State.getStatesOfCountry(countryCode)
    return states.find((s) => s.name.toLowerCase() === stateName.toLowerCase())
}

/**
 * Resolve representative coordinates and timezone for a given country and optional state/province.
 * Strategy:
 * - If state provided: use state lat/lng when available; fallback to centroid of its cities; fallback to country lat/lng.
 * - If only country: use country lat/lng; fallback to first major city if available.
 */
export function resolveLocationFromCountryState(
    countryName: string,
    stateName?: string
): ResolvedLocation | null {
    const country = getCountryByName(countryName)
    if (!country) return null

    const countryLat = toNumberOrNull(country.latitude)
    const countryLng = toNumberOrNull(country.longitude)

    let state: IState | undefined
    if (stateName) {
        state = getStateByName(country.isoCode, stateName)
    }

    let latitude: number | null = null
    let longitude: number | null = null

    if (state) {
        latitude = toNumberOrNull(state.latitude)
        longitude = toNumberOrNull(state.longitude)

        if (latitude == null || longitude == null) {
            // Try to approximate from cities within the state (average of first N cities with coords)
            const cities: ICity[] = City.getCitiesOfState(
                country.isoCode,
                state.isoCode
            )
            let sumLat = 0
            let sumLng = 0
            let count = 0
            for (const city of cities) {
                const latNum = toNumberOrNull(city.latitude)
                const lngNum = toNumberOrNull(city.longitude)
                if (latNum != null && lngNum != null) {
                    sumLat += latNum
                    sumLng += lngNum
                    count += 1
                    if (count >= 10) break
                }
            }
            if (count > 0) {
                latitude = sumLat / count
                longitude = sumLng / count
            }
        }
    }

    if (latitude == null || longitude == null) {
        // Fallback to country center or to a major city in the country
        latitude = countryLat
        longitude = countryLng
        if (latitude == null || longitude == null) {
            const citiesInCountry = City.getCitiesOfCountry(country.isoCode)
            if (citiesInCountry) {
                const firstCityWithCoords = citiesInCountry.find(
                    (c) =>
                        toNumberOrNull(c.latitude) != null &&
                        toNumberOrNull(c.longitude) != null
                )
                if (firstCityWithCoords) {
                    latitude = Number(firstCityWithCoords.latitude)
                    longitude = Number(firstCityWithCoords.longitude)
                }
            }
        }
    }

    if (latitude == null || longitude == null) return null

    let timezone = "UTC"
    try {
        timezone = tzLookup(latitude, longitude)
    } catch {
        // keep UTC fallback
    }

    // Convert timezone name to numeric offset
    const timezoneOffset = timezoneToOffset(timezone)

    return {
        countryName: country.name,
        countryCode: country.isoCode,
        stateName: state ? state.name : null,
        stateCode: state ? state.isoCode : null,
        latitude,
        longitude,
        timezone: timezoneOffset,
    }
}

export async function resolveLocationFromCoords(
    latitude: number,
    longitude: number
): Promise<ResolvedLocation | null> {
    let timezone = "UTC"
    try {
        timezone = tzLookup(latitude, longitude)
    } catch {
        // noop
    }

    // Convert timezone name to numeric offset
    const timezoneOffset = timezoneToOffset(timezone)

    // Best-effort reverse mapping using nearest centroids (fast, offline).
    // This is not perfect near borders, but good enough to populate UI defaults.
    const country = findNearestCountry(latitude, longitude)
    const state = country
        ? findNearestState(country.isoCode, latitude, longitude)
        : null

    return {
        countryName: country?.name ?? "",
        countryCode: country?.isoCode ?? "",
        stateName: state?.name ?? null,
        stateCode: state?.isoCode ?? null,
        latitude,
        longitude,
        timezone: timezoneOffset,
    }
}
