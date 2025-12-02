import {
    convertUsdToCurrency,
    DEFAULT_CURRENCY,
    type CurrencyCode,
} from "@/lib/payments/currency-utils"

export type SubscriptionPlanId = "monthly" | "annual"

const SUBSCRIPTION_BASE_PRICES_USD = {
    monthly: 9.99,
    annual: 99.99,
    annualMonthlyEquivalent: 8.34,
    infinity: 9.99,
} as const

export type LabelTranslationKey = "popular" | "bestValue"

export type StarPackDefinition = {
    id: string
    baseUsdPrice: number
    stars: number | "infinity"
    bonus: number
    labelKey?: LabelTranslationKey
    infinityTerm?: "month" | "year"
}

export const STAR_PACKS: StarPackDefinition[] = [
    { id: "pack-1", baseUsdPrice: 0.99, stars: 60, bonus: 0 },
    { id: "pack-2", baseUsdPrice: 1.99, stars: 130, bonus: 10 },
    {
        id: "pack-3",
        baseUsdPrice: 2.99,
        stars: 200,
        bonus: 20,
        labelKey: "popular",
    },
    {
        id: "pack-5",
        baseUsdPrice: 4.99,
        stars: 350,
        bonus: 50,
        labelKey: "bestValue",
    },
    { id: "pack-7", baseUsdPrice: 6.99, stars: 500, bonus: 80 },
]

export const INFINITY_PACK: StarPackDefinition = {
    id: "pack-infinity",
    baseUsdPrice: SUBSCRIPTION_BASE_PRICES_USD.infinity,
    stars: "infinity",
    bonus: 0,
    infinityTerm: "month",
}

export const ALL_STAR_PACKS: StarPackDefinition[] = [
    ...STAR_PACKS,
    INFINITY_PACK,
]

const PACK_LOOKUP = new Map<string, StarPackDefinition>(
    ALL_STAR_PACKS.map((pack) => [pack.id, pack])
)

export function getPackById(id: string): StarPackDefinition | null {
    return PACK_LOOKUP.get(id) ?? null
}

export function resolveCurrencyFromLocale(locale?: string | null): CurrencyCode {
    if (!locale) return "USD"
    return locale.toLowerCase() === "th" ? "THB" : DEFAULT_CURRENCY
}

export function getPackPrice(
    packId: string,
    currency: CurrencyCode
): number | null {
    const pack = getPackById(packId)
    if (!pack) return null
    return convertUsdToCurrency(pack.baseUsdPrice, currency)
}

export function getSubscriptionPrice(
    plan: SubscriptionPlanId,
    currency: CurrencyCode
): number | null {
    const base = SUBSCRIPTION_BASE_PRICES_USD[plan]
    if (typeof base !== "number") return null
    return convertUsdToCurrency(base, currency)
}

export function getAnnualMonthlyEquivalent(
    currency: CurrencyCode
): number | null {
    return convertUsdToCurrency(
        SUBSCRIPTION_BASE_PRICES_USD.annualMonthlyEquivalent,
        currency
    )
}
