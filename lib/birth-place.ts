/**
 * `profiles.birth_place` is one text column holding a country and a province.
 *
 * Two screens have historically written it in opposite orders — the age-gate
 * consent modal saves "Country, Province", the birth-chart and astrology forms
 * save "Province, Country" — so reading it by position mislabels whatever the
 * other screen wrote. Parse by *checking* which part is a country instead.
 *
 * Country data comes from `countrycitystatejson`, the same package the
 * LocationSelector fills its dropdowns from, so anything a user can pick is
 * something this can parse back.
 */

import ccs from "countrycitystatejson"

type CcsCountry = { name?: string; native?: string; shortName?: string }

/** Lowercased name / native name / ISO2 -> canonical country name. */
let indexCache: Map<string, string> | null = null

function countryIndex(): Map<string, string> {
    if (indexCache) return indexCache
    const index = new Map<string, string>()
    try {
        for (const country of ccs.getCountries() as CcsCountry[]) {
            const name = (country.name ?? "").trim()
            if (!name) continue
            index.set(name.toLowerCase(), name)
            // "ประเทศไทย" resolves to Thailand — most of this userbase is Thai.
            const native = (country.native ?? "").trim()
            if (native) index.set(native.toLowerCase(), name)
            const iso2 = (country.shortName ?? "").trim()
            if (iso2) index.set(iso2.toLowerCase(), name)
        }
    } catch {
        // Keep whatever was built; an empty index just means "can't tell".
    }
    indexCache = index
    return index
}

/** Canonical country name for a fragment, or null when it isn't a country. */
export function resolveCountry(value: string | null | undefined): string | null {
    const needle = (value ?? "").trim().toLowerCase()
    if (!needle) return null
    // A 2-letter ISO code is only meaningful at that exact length; longer
    // fragments must match a real name.
    const hit = countryIndex().get(needle)
    if (!hit) return null
    if (needle.length === 2 && hit.toLowerCase() !== needle) return hit
    return hit
}

/**
 * Split a stored birth place into country + province, whichever order it is in.
 * Returns empty strings when no part is recognisably a country — the caller
 * should then keep the original text rather than discarding it.
 */
export function parseBirthPlace(value: string | null | undefined): {
    country: string
    state: string
} {
    const raw = (value ?? "").trim()
    if (!raw) return { country: "", state: "" }

    // Whole string first: a few country names contain a comma themselves.
    const whole = resolveCountry(raw)
    if (whole) return { country: whole, state: "" }

    const parts = raw
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)

    for (let i = 0; i < parts.length; i++) {
        const country = resolveCountry(parts[i])
        if (country) {
            const state = parts.find((_, j) => j !== i) ?? ""
            return { country, state }
        }
    }
    return { country: "", state: "" }
}

/**
 * Join country + province for storage.
 *
 * "Province, Country" is the order the birth-chart and astrology forms already
 * write, and the order `api/birth-chart/me` and the chat session parser read
 * back, so new writes match the majority of the codebase.
 */
export function formatBirthPlace(
    country: string | null | undefined,
    state: string | null | undefined,
): string {
    const c = (country ?? "").trim()
    const s = (state ?? "").trim()
    if (!c) return ""
    return s ? `${s}, ${c}` : c
}
