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
    id: string | undefined
    name: string
    baseUsdPrice: number
    stars: number | "infinity"
    bonus: number
    labelKey?: LabelTranslationKey
    infinityTerm?: "month" | "year"
}

// NEXT_PUBLIC_STARTER_PACK_ID
// NEXT_PUBLIC_EXPLORER_PACK_ID
// NEXT_PUBLIC_SEEKER_PACK_ID
// NEXT_PUBLIC_MYSTIC_PACK_ID
// NEXT_PUBLIC_MASTER_PACK_ID
// NEXT_PUBLIC_INFINITY_PACK_ID
// NEXT_PUBLIC_MONTHLY_PACK_ID
// NEXT_PUBLIC_ANNUALLY_PACK_ID
export const STAR_PACKS: StarPackDefinition[] = [
    {
        id: process.env.NEXT_PUBLIC_STARTER_PACK_ID,
        name: "Starter",
        baseUsdPrice: 0.99,
        stars: 30,
        bonus: 0,
    },
    {
        id: process.env.NEXT_PUBLIC_EXPLORER_PACK_ID,
        name: "Explorer",
        baseUsdPrice: 1.99,
        stars: 65,
        bonus: 5,
    },
    {
        id: process.env.NEXT_PUBLIC_SEEKER_PACK_ID,
        name: "Seeker",
        baseUsdPrice: 2.99,
        stars: 100,
        bonus: 10,
        labelKey: "popular",
    },
    {
        id: process.env.NEXT_PUBLIC_MYSTIC_PACK_ID,
        name: "Mystic",
        baseUsdPrice: 4.99,
        stars: 175,
        bonus: 25,
        labelKey: "bestValue",
    },
    {
        id: process.env.NEXT_PUBLIC_MASTER_PACK_ID,
        name: "Master",
        baseUsdPrice: 6.99,
        stars: 250,
        bonus: 40,
    },
]

export const INFINITY_PACK: StarPackDefinition = {
    id: process.env.NEXT_PUBLIC_INFINITY_PACK_ID,
    name: "Infinity",
    baseUsdPrice: SUBSCRIPTION_BASE_PRICES_USD.infinity,
    stars: "infinity",
    bonus: 0,
    infinityTerm: "month",
}

export const MONTHLY_PACKS: StarPackDefinition = {
    id: process.env.NEXT_PUBLIC_MONTHLY_PACK_ID,
    name: "Monthly Subscription",
    baseUsdPrice: SUBSCRIPTION_BASE_PRICES_USD.monthly,
    stars: "infinity",
    bonus: 0,
    infinityTerm: "month",
}

export const ANNUALLY_PACKS: StarPackDefinition = {
    id: process.env.NEXT_PUBLIC_ANNUALLY_PACK_ID,
    name: "Annually Subscription",
    baseUsdPrice: SUBSCRIPTION_BASE_PRICES_USD.annual,
    stars: "infinity",
    bonus: 0,
    infinityTerm: "year",
}

export const ALL_STAR_PACKS: StarPackDefinition[] = [
    ...STAR_PACKS,
    INFINITY_PACK,
    MONTHLY_PACKS,
    ANNUALLY_PACKS,
]

const PACK_LOOKUP = new Map<string, StarPackDefinition>(
    ALL_STAR_PACKS.map((pack) => [pack.id ?? "", pack])
)

export function getPackById(id: string): StarPackDefinition | null {
    return PACK_LOOKUP.get(id) ?? null
}

export function resolveCurrencyFromLocale(
    locale?: string | null
): CurrencyCode {
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
