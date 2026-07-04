/**
 * Detect primary language of user input for first-message routing.
 * Returns a supported locale when the input is written in a script that maps
 * unambiguously to one of our locales (Thai, Lao, Burmese, Japanese, Korean,
 * Chinese). Latin-script input (English, Spanish, Indonesian, Portuguese) cannot
 * be told apart by script, so it returns null and the caller keeps the user's
 * current locale.
 */

const SUPPORTED_LOCALES = [
    "en",
    "th",
    "lo",
    "my",
    "zh-CN",
    "zh-TW",
    "ja",
    "ko",
    "id",
    "es",
    "pt-BR",
] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

const THAI_REGEX = /[฀-๿]/g
const LAO_REGEX = /[຀-໿]/g
const MYANMAR_REGEX = /[က-႟]/g
const HANGUL_REGEX = /[가-힯]/g
const KANA_REGEX = /[぀-ヿ]/g // hiragana + katakana => Japanese
const CJK_REGEX = /[一-鿿]/g // Han ideographs (no kana/hangul) => Chinese

/**
 * Detect the locale of `text` by script. Returns a distinctive locale, or null
 * for Latin / ambiguous / too-short input (caller should keep the current locale).
 * Chinese defaults to Simplified (zh-CN); the caller's resolveSessionLocale keeps
 * a Traditional (zh-TW) user on their variant.
 */
export function detectInputLanguage(text: string): SupportedLocale | null {
    const trimmed = text.trim()
    if (trimmed.length < 2) return null

    const letters = trimmed.replace(/\s/g, "").length
    if (letters < 2) return null

    const ratio = (re: RegExp) => (trimmed.match(re) ?? []).length / letters

    if (ratio(LAO_REGEX) > 0.1) return "lo"
    if (ratio(THAI_REGEX) > 0.1) return "th"
    if (ratio(MYANMAR_REGEX) > 0.1) return "my"
    if (ratio(HANGUL_REGEX) > 0.1) return "ko"
    if (ratio(KANA_REGEX) > 0.1) return "ja"
    if (ratio(CJK_REGEX) > 0.1) return "zh-CN"

    return null
}

export function isSupportedLocale(locale: string): locale is SupportedLocale {
    return SUPPORTED_LOCALES.includes(locale as SupportedLocale)
}

/**
 * Decide which locale a freshly created session should open in, given the
 * script detected from the first message and the user's current locale.
 * - Unknown/null detection -> keep the current locale.
 * - Same base language (e.g. zh-CN vs zh-TW) -> respect the user's current
 *   choice so a Traditional-Chinese user isn't flipped to Simplified.
 * - Otherwise -> switch to the detected locale.
 */
export function resolveSessionLocale(
    detected: SupportedLocale | null,
    current: string,
): string {
    if (!detected || !isSupportedLocale(detected)) return current
    if (detected.split("-")[0] === current.split("-")[0]) return current
    return detected
}
