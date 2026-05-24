/**
 * Detect primary language of user input for first-message routing.
 * Returns a supported locale if the input is clearly Thai or English.
 */

const SUPPORTED_LOCALES = ["en", "th", "lo"] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

const THAI_REGEX = /[\u0E00-\u0E7F]/g
const LAO_REGEX = /[\u0E80-\u0EFF]/g

/**
 * Detect if text is primarily Lao, Thai, or English.
 * Returns null for very short or ambiguous input.
 */
export function detectInputLanguage(text: string): SupportedLocale | null {
    const trimmed = text.trim()
    if (trimmed.length < 2) return null

    const letters = trimmed.replace(/\s/g, "").length
    if (letters < 2) return null

    const laoCount = (trimmed.match(LAO_REGEX) ?? []).length
    if (laoCount / letters > 0.1) return "lo"

    const thaiCount = (trimmed.match(THAI_REGEX) ?? []).length
    if (thaiCount / letters > 0.1) return "th"

    return "en"
}

export function isSupportedLocale(locale: string): locale is SupportedLocale {
    return SUPPORTED_LOCALES.includes(locale as SupportedLocale)
}
