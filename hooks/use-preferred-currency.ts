"use client"

import { useEffect, useState } from "react"
import {
    DEFAULT_CURRENCY,
    detectRegionFromLocales,
    ensureSupportedCurrency,
    type CurrencyCode,
} from "@/lib/payments/currency-utils"

function extractRegionFromNavigator(): string | null {
    if (typeof window === "undefined") return null
    const locales = (navigator.languages ?? [navigator.language]).filter(Boolean)
    return detectRegionFromLocales(locales)
}

export function usePreferredCurrency(
    fallbackCurrency: CurrencyCode = DEFAULT_CURRENCY
): CurrencyCode {
    const [currency, setCurrency] = useState<CurrencyCode>(
        ensureSupportedCurrency(fallbackCurrency)
    )

    useEffect(() => {
        setCurrency(ensureSupportedCurrency(fallbackCurrency))
    }, [fallbackCurrency])

    useEffect(() => {
        let cancelled = false

        async function detectCurrency() {
            const region = extractRegionFromNavigator()
            if (!region) return
            try {
                const { Country } = await import("country-state-city")
                const info = Country.getCountryByCode(region)
                const candidate = info?.currency?.split(",")?.[0]
                const normalized = ensureSupportedCurrency(candidate)
                if (!cancelled) {
                    setCurrency(normalized)
                }
            } catch {
                // Swallow errors silently; fallback currency remains in place.
            }
        }

        detectCurrency()

        return () => {
            cancelled = true
        }
    }, [])

    return currency
}
