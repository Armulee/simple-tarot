export type CurrencyCode = string

const defaultCurrencyEnv =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_STRIPE_DEFAULT_CURRENCY) ||
    (typeof process !== "undefined" && process.env.STRIPE_DEFAULT_CURRENCY) ||
    "USD"

export const DEFAULT_CURRENCY: CurrencyCode = defaultCurrencyEnv
    .trim()
    .toUpperCase()

const supportedCurrenciesEnv =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_STRIPE_SUPPORTED_CURRENCIES) ||
    (typeof process !== "undefined" && process.env.STRIPE_SUPPORTED_CURRENCIES) ||
    ""

function parseCurrencyList(raw: string): CurrencyCode[] {
    if (!raw) return []
    return raw
        .split(",")
        .map((part) => part.trim().toUpperCase())
        .filter((code) => /^[A-Z]{3}$/.test(code))
}

const defaultSupported: CurrencyCode[] = [
    "USD",
    "EUR",
    "GBP",
    "AUD",
    "CAD",
    "NZD",
    "SGD",
    "HKD",
    "JPY",
    "THB",
]

const configuredSupported = parseCurrencyList(supportedCurrenciesEnv)

export const SUPPORTED_PAYMENT_CURRENCIES: CurrencyCode[] = Array.from(
    new Set([DEFAULT_CURRENCY, ...configuredSupported, ...defaultSupported])
)

export const POPULAR_CURRENCIES: CurrencyCode[] = [
    "USD",
    "EUR",
    "GBP",
    "THB",
    "JPY",
    "AUD",
    "CAD",
    "SGD",
    "HKD",
    "INR",
    "CNY",
    "BRL",
    "MXN",
] as const

const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    THB: "฿",
    JPY: "¥",
    CNY: "¥",
    HKD: "HK$",
    AUD: "A$",
    CAD: "C$",
    SGD: "S$",
    INR: "₹",
    MXN: "MX$",
    BRL: "R$",
    CHF: "CHF",
    SEK: "kr",
    NOK: "kr",
    DKK: "kr",
    PLN: "zł",
    TRY: "₺",
    RUB: "₽",
    NZD: "NZ$",
    ZAR: "R",
    AED: "د.إ",
    SAR: "﷼",
    IDR: "Rp",
    MYR: "RM",
    PHP: "₱",
    KRW: "₩",
    VND: "₫",
    COP: "COL$",
    CLP: "CLP$",
    ARS: "AR$",
}

const EXCHANGE_RATES_TO_USD: Record<string, number> = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    THB: 35,
    JPY: 150,
    CNY: 7.2,
    HKD: 7.8,
    AUD: 1.52,
    CAD: 1.37,
    SGD: 1.34,
    INR: 83,
    MXN: 17,
    BRL: 5.2,
    CHF: 0.9,
    SEK: 9.8,
    NOK: 10.5,
    DKK: 6.8,
    PLN: 4.0,
    TRY: 32,
    RUB: 92,
    NZD: 1.65,
    ZAR: 18.5,
    AED: 3.67,
    SAR: 3.75,
    IDR: 15500,
    MYR: 4.7,
    PHP: 57,
    KRW: 1350,
    VND: 24500,
    COP: 3900,
    CLP: 960,
    ARS: 850,
}

const ZERO_DECIMAL_CURRENCIES = new Set([
    "BIF",
    "CLP",
    "DJF",
    "GNF",
    "JPY",
    "KMF",
    "KRW",
    "MGA",
    "PYG",
    "RWF",
    "UGX",
    "VND",
    "VUV",
    "XAF",
    "XOF",
    "XPF",
])

const THREE_DECIMAL_CURRENCIES = new Set(["BHD", "JOD", "KWD", "OMR", "TND"])

export function normalizeCurrencyCode(code?: string | null): CurrencyCode | null {
    if (!code) return null
    const trimmed = code.trim().toUpperCase()
    if (!/^[A-Z]{3}$/.test(trimmed)) return null
    return trimmed
}

export function ensureSupportedCurrency(code?: string | null): CurrencyCode {
    const normalized = normalizeCurrencyCode(code)
    if (normalized && SUPPORTED_PAYMENT_CURRENCIES.includes(normalized)) {
        return normalized
    }
    return SUPPORTED_PAYMENT_CURRENCIES[0] ?? DEFAULT_CURRENCY
}

export function getCurrencySymbol(currency: CurrencyCode): string {
    return CURRENCY_SYMBOLS[currency] ?? currency
}

function getCurrencyDecimals(currency: CurrencyCode): number {
    if (THREE_DECIMAL_CURRENCIES.has(currency)) return 3
    if (ZERO_DECIMAL_CURRENCIES.has(currency)) return 0
    return 2
}

export function convertUsdToCurrency(amountUsd: number, currency: CurrencyCode): number {
    const rate = EXCHANGE_RATES_TO_USD[currency] ?? 1
    const converted = amountUsd * rate
    const decimals = getCurrencyDecimals(currency)
    return Number(converted.toFixed(decimals > 0 ? Math.min(decimals + 1, 4) : 0))
}

export function toMinorUnits(amount: number, currency: CurrencyCode): number {
    const decimals = getCurrencyDecimals(currency)
    const multiplier = Math.pow(10, decimals)
    return Math.round(amount * multiplier)
}

export function formatCurrency(amount: number, currency: CurrencyCode, locale = "en"): string {
    try {
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
            currencyDisplay: "symbol",
        }).format(amount)
    } catch {
        const symbol = getCurrencySymbol(currency)
        return `${symbol}${amount.toFixed(getCurrencyDecimals(currency))}`
    }
}

export function detectRegionFromLocales(locales: readonly string[]): string | null {
    for (const locale of locales) {
        const parts = locale.replace("_", "-").split("-")
        if (parts.length >= 2) {
            const region = parts[1]
            if (region && region.length === 2) return region.toUpperCase()
        } else if (parts[0].length === 2) {
            return parts[0].toUpperCase()
        }
    }
    return null
}
