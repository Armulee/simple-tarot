import {
    convertUsdToCurrency,
    DEFAULT_CURRENCY,
    type CurrencyCode,
} from "@/lib/payments/currency-utils"

export type LabelTranslationKey = "popular" | "bestValue"

export type StarPackDefinition = {
    id: string | undefined
    name: string
    baseUsdPrice: number
    stars: number
    bonus: number
    labelKey?: LabelTranslationKey
}

// NEXT_PUBLIC_STARTER_PACK_ID
// NEXT_PUBLIC_EXPLORER_PACK_ID
// NEXT_PUBLIC_SEEKER_PACK_ID
// NEXT_PUBLIC_MYSTIC_PACK_ID
// NEXT_PUBLIC_MASTER_PACK_ID
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
const PACK_LOOKUP = new Map<string, StarPackDefinition>(
    STAR_PACKS.map((pack) => [pack.id ?? "", pack])
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
