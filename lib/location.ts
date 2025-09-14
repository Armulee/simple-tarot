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
    } catch (error) {
        console.log(
            "Timezone conversion error:",
            error,
            "for timezone:",
            timezone
        )
        return 0 // UTC fallback
    }
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
        console.log(
            "Resolved timezone string:",
            timezone,
            "for coords:",
            latitude,
            longitude
        )
    } catch (error) {
        console.log("tz-lookup error:", error)
        // keep UTC fallback
    }

    // Convert timezone name to numeric offset
    const timezoneOffset = timezoneToOffset(timezone)
    console.log(
        "Converted timezone offset:",
        timezoneOffset,
        "from timezone:",
        timezone
    )

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

    // Best-effort reverse country/state via nearest city search (coarse).
    // We will simply try to find a country whose bounding by proximity works by scanning cities quickly.
    // To avoid heavy loops, just return coordinates and timezone.
    return {
        countryName: "",
        countryCode: "",
        stateName: null,
        stateCode: null,
        latitude,
        longitude,
        timezone: timezoneOffset,
    }
}
