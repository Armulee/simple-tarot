/**
 * Central mapping from app locale -> the language the AI/LLM should respond in,
 * plus a script-detection fallback for when no locale is supplied.
 *
 * Why both: the UI locale is the source of truth for what language the user
 * wants (it disambiguates cases a script detector cannot — e.g. Simplified vs
 * Traditional Chinese, Brazilian vs European Portuguese, or a Spanish/Indonesian
 * user who happens to type an English-looking word). When the locale is missing
 * (older clients, internal calls) we fall back to detecting the script of the
 * user's text.
 */

/**
 * Locale -> human-readable target language used inside the system prompt.
 * The phrasing is intentionally explicit about script/region so the model
 * always replies in the correct variant.
 */
export const LOCALE_TO_AI_LANGUAGE: Record<string, string> = {
    en: "English",
    th: "Thai",
    lo: "Lao",
    "zh-CN": "Simplified Chinese",
    "zh-TW": "Traditional Chinese",
    ja: "Japanese",
    ko: "Korean",
    id: "Indonesian",
    es: "Spanish",
    "pt-BR": "Brazilian Portuguese",
    my: "Burmese (Myanmar)",
}

const DEFAULT_AI_LANGUAGE = "English"

/**
 * Detect the primary language of a piece of text by script. Used only as a
 * fallback when no locale is provided. Cannot distinguish Simplified vs
 * Traditional Chinese (use the locale for that).
 */
export function detectQuestionLanguage(text: string): string {
    if (/[က-႟]/.test(text)) return "Burmese (Myanmar)"
    if (/[຀-໿]/.test(text)) return "Lao"
    if (/[฀-๿]/.test(text)) return "Thai"
    if (/[가-힯]/.test(text)) return "Korean"
    if (/[぀-ヿ]/.test(text)) return "Japanese"
    if (/[一-鿿]/.test(text)) return "Chinese"
    if (/[Ѐ-ӿ]/.test(text)) return "Russian"
    return DEFAULT_AI_LANGUAGE
}

/**
 * Normalize an incoming locale string (which may carry casing/region quirks)
 * to one of our known keys, returning null if unknown.
 */
function normalizeLocaleKey(locale: string | null | undefined): string | null {
    if (!locale) return null
    if (LOCALE_TO_AI_LANGUAGE[locale]) return locale
    const lower = locale.toLowerCase()
    // Match case-insensitively against known keys (e.g. "zh-cn" -> "zh-CN").
    const match = Object.keys(LOCALE_TO_AI_LANGUAGE).find(
        (k) => k.toLowerCase() === lower,
    )
    if (match) return match
    // Fall back to the base language for unknown region variants
    // (e.g. "pt-PT" -> "pt-BR" mapping isn't desired, but "es-MX" -> "es" is).
    const base = lower.split("-")[0]
    const baseMatch = Object.keys(LOCALE_TO_AI_LANGUAGE).find(
        (k) => k.toLowerCase() === base,
    )
    return baseMatch ?? null
}

/**
 * Resolve the language the AI should respond in. Prefers the explicit UI
 * locale; falls back to detecting the script of the user's text.
 */
export function resolveResponseLanguage(
    locale: string | null | undefined,
    text?: string | null,
): string {
    const key = normalizeLocaleKey(locale)
    if (key) return LOCALE_TO_AI_LANGUAGE[key]
    if (text) return detectQuestionLanguage(text)
    return DEFAULT_AI_LANGUAGE
}

/**
 * Build an explicit, forceful language instruction for a system prompt. Use
 * when you want a strong directive (e.g. for structured/JSON outputs where the
 * model might otherwise echo the language of injected context data).
 */
export function buildLanguageInstruction(
    locale: string | null | undefined,
    text?: string | null,
): string {
    const language = resolveResponseLanguage(locale, text)
    return `You MUST write your ENTIRE response in ${language}. Every user-facing word must be in ${language}, regardless of the language of any context, data, or examples provided. Do not mix in other languages or scripts.`
}
