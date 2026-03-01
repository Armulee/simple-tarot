/**
 * Detect primary language of user input for first-message routing.
 * Returns a supported locale if the input is clearly Thai or English.
 */

const SUPPORTED_LOCALES = ["en", "th"] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

/** Thai script Unicode range */
const THAI_REGEX = /[\u0E00-\u0E7F]/g

/**
 * Detect if text is primarily Thai or English.
 * - Thai: contains Thai script characters (threshold: >10% of letters)
 * - English: default when no significant Thai
 * Returns null for very short or ambiguous input.
 */
export function detectInputLanguage(
    text: string,
): SupportedLocale | null {
    const trimmed = text.trim()
    if (trimmed.length < 2) return null

    const thaiMatches = trimmed.match(THAI_REGEX) ?? []
    const thaiCount = thaiMatches.length
    const letters = trimmed.replace(/\s/g, "").length
    if (letters < 2) return null

    if (thaiCount / letters > 0.1) return "th"
    return "en"
}

export function isSupportedLocale(
    locale: string,
): locale is SupportedLocale {
    return SUPPORTED_LOCALES.includes(locale as SupportedLocale)
}
