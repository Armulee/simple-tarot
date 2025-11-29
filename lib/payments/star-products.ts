export type CurrencyCode = "USD" | "THB"

export type SubscriptionPlanId = "monthly" | "annual"

type SubscriptionPriceMap = {
    USD: number
    THB: number
    monthlyUsd?: number
    monthlyThb?: number
}

export const SUBSCRIPTION_PRICES: Record<
    SubscriptionPlanId | "infinity",
    SubscriptionPriceMap
> = {
    monthly: { THB: 349, USD: 9.99 },
    annual: { THB: 3499, USD: 99.99, monthlyThb: 292, monthlyUsd: 8.34 },
    infinity: { THB: 349, USD: 9.99 },
}

export type LabelTranslationKey = "popular" | "bestValue"

export type StarPackDefinition = {
    id: string
    priceThb: number
    priceUsd: number
    stars: number | "infinity"
    bonus: number
    labelKey?: LabelTranslationKey
    infinityTerm?: "month" | "year"
}

export const STAR_PACKS: StarPackDefinition[] = [
    { id: "pack-1", priceThb: 35, priceUsd: 0.99, stars: 60, bonus: 0 },
    { id: "pack-2", priceThb: 69, priceUsd: 1.99, stars: 130, bonus: 10 },
    {
        id: "pack-3",
        priceThb: 99,
        priceUsd: 2.99,
        stars: 200,
        bonus: 20,
        labelKey: "popular",
    },
    {
        id: "pack-5",
        priceThb: 169,
        priceUsd: 4.99,
        stars: 350,
        bonus: 50,
        labelKey: "bestValue",
    },
    { id: "pack-7", priceThb: 249, priceUsd: 6.99, stars: 500, bonus: 80 },
]

export const INFINITY_PACK: StarPackDefinition = {
    id: "pack-infinity",
    priceThb: SUBSCRIPTION_PRICES.infinity.THB,
    priceUsd: SUBSCRIPTION_PRICES.infinity.USD,
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

export function normalizeCurrency(input?: string | null): CurrencyCode {
    if (input && input.toUpperCase() === "THB") return "THB"
    return "USD"
}

export function resolveCurrencyFromLocale(locale?: string | null): CurrencyCode {
    if (!locale) return "USD"
    return locale.toLowerCase() === "th" ? "THB" : "USD"
}

export function toStripeCurrency(currency: CurrencyCode): "usd" | "thb" {
    return currency.toLowerCase() as "usd" | "thb"
}

export function toMinorUnits(amount: number): number {
    return Math.round(amount * 100)
}

export function getPackPrice(
    packId: string,
    currency: CurrencyCode
): number | null {
    const pack = getPackById(packId)
    if (!pack) return null
    return currency === "THB" ? pack.priceThb : pack.priceUsd
}

export function getSubscriptionPrice(
    plan: SubscriptionPlanId,
    currency: CurrencyCode
): number | null {
    const price = SUBSCRIPTION_PRICES[plan]?.[currency]
    return typeof price === "number" ? price : null
}
