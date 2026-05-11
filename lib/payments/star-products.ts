import {
    DEFAULT_CURRENCY,
    type CurrencyCode,
} from "@/lib/payments/currency-utils"

export type LabelTranslationKey = "popular" | "bestValue"

export type StarPackDefinition = {
    id: string | undefined
    idThb: string | undefined
    name: string
    baseUsdPrice: number
    baseThbPrice: number
    stars: number
    bonus: number
    labelKey?: LabelTranslationKey
}

export const STAR_PACKS: StarPackDefinition[] = [
    {
        id: process.env.NEXT_PUBLIC_STARTER_PACK_ID,
        idThb: process.env.NEXT_PUBLIC_STARTER_PACK_ID_THB,
        name: "Starter",
        baseUsdPrice: 0.99,
        baseThbPrice: 35,
        stars: 30,
        bonus: 0,
    },
    {
        id: process.env.NEXT_PUBLIC_EXPLORER_PACK_ID,
        idThb: process.env.NEXT_PUBLIC_EXPLORER_PACK_ID_THB,
        name: "Explorer",
        baseUsdPrice: 1.99,
        baseThbPrice: 69,
        stars: 65,
        bonus: 5,
    },
    {
        id: process.env.NEXT_PUBLIC_SEEKER_PACK_ID,
        idThb: process.env.NEXT_PUBLIC_SEEKER_PACK_ID_THB,
        name: "Seeker",
        baseUsdPrice: 2.99,
        baseThbPrice: 109,
        stars: 100,
        bonus: 10,
        labelKey: "popular",
    },
    {
        id: process.env.NEXT_PUBLIC_MYSTIC_PACK_ID,
        idThb: process.env.NEXT_PUBLIC_MYSTIC_PACK_ID_THB,
        name: "Mystic",
        baseUsdPrice: 4.99,
        baseThbPrice: 179,
        stars: 175,
        bonus: 25,
        labelKey: "bestValue",
    },
    {
        id: process.env.NEXT_PUBLIC_MASTER_PACK_ID,
        idThb: process.env.NEXT_PUBLIC_MASTER_PACK_ID_THB,
        name: "Master",
        baseUsdPrice: 6.99,
        baseThbPrice: 249,
        stars: 250,
        bonus: 40,
    },
    {
        id: process.env.NEXT_PUBLIC_100_STARS_ADDON_ID,
        idThb: process.env.NEXT_PUBLIC_100_STARS_ADDON_ID_THB,
        name: "100 Stars",
        baseUsdPrice: 2.99,
        baseThbPrice: 99,
        stars: 100,
        bonus: 0,
    },
]
const PACK_LOOKUP = new Map<string, StarPackDefinition>(
    STAR_PACKS.map((pack) => [pack.id ?? "", pack])
)
const PACK_LOOKUP_THB = new Map<string, StarPackDefinition>(
    STAR_PACKS.map((pack) => [pack.idThb ?? "", pack])
)

export function getPackById(id: string): StarPackDefinition | null {
    return PACK_LOOKUP.get(id) ?? PACK_LOOKUP_THB.get(id) ?? null
}

export function resolveCurrencyFromLocale(
    locale?: string | null
): CurrencyCode {
    if (!locale) return "USD"
    return locale.toLowerCase() === "th" ? "THB" : DEFAULT_CURRENCY
}

export function getPackPriceId(
    pack: StarPackDefinition,
    currency: CurrencyCode,
): string {
    if (currency === "THB" && pack.idThb) return pack.idThb
    return pack.id ?? ""
}

export function getPackPrice(
    pack: StarPackDefinition,
    currency: CurrencyCode,
): number {
    if (currency === "THB") return pack.baseThbPrice
    return pack.baseUsdPrice
}

export function getPackPriceById(
    packId: string,
    currency: CurrencyCode,
): number | null {
    const pack = getPackById(packId)
    if (!pack) return null
    return getPackPrice(pack, currency)
}
