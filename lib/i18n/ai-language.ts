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
 * Detect a distinctive (non-Latin) script in `text` and return its language
 * name, or null when the script is Latin / ambiguous / too short. Uses a small
 * ratio threshold so a stray foreign character doesn't flip the result.
 *
 * Cannot distinguish Simplified vs Traditional Chinese — returns the generic
 * "Chinese"; callers use the locale to pick the variant.
 */
function detectScriptLanguage(text: string): string | null {
    const trimmed = (text ?? "").trim()
    const letters = trimmed.replace(/\s/g, "").length
    if (letters < 2) return null
    const ratio = (re: RegExp) => (trimmed.match(re) ?? []).length / letters

    if (ratio(/[຀-໿]/g) > 0.1) return "Lao"
    if (ratio(/[฀-๿]/g) > 0.1) return "Thai"
    if (ratio(/[က-႟]/g) > 0.1) return "Burmese (Myanmar)"
    if (ratio(/[가-힯]/g) > 0.1) return "Korean"
    if (ratio(/[぀-ヿ]/g) > 0.1) return "Japanese"
    if (ratio(/[一-鿿]/g) > 0.1) return "Chinese"
    if (ratio(/[Ѐ-ӿ]/g) > 0.1) return "Russian"
    return null
}

/**
 * Detect the primary language of a piece of text by script. Used as a fallback
 * when no locale is provided. Defaults to English for Latin/ambiguous input.
 */
export function detectQuestionLanguage(text: string): string {
    return detectScriptLanguage(text) ?? DEFAULT_AI_LANGUAGE
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
 * Resolve the language the AI should respond in.
 *
 * Precedence:
 * 1. If the user wrote in a distinctive non-Latin script (Thai, Lao, Burmese,
 *    Japanese, Korean, Chinese), honor what they actually typed — even if the UI
 *    locale differs — so a Japanese question never gets an English answer.
 *    For Chinese, keep the locale's Simplified/Traditional variant when set.
 * 2. Otherwise (Latin / ambiguous text) trust the chosen UI locale, which is the
 *    only signal that separates en / es / id / pt-BR.
 * 3. Fall back to English.
 */
export function resolveResponseLanguage(
    locale: string | null | undefined,
    text?: string | null,
): string {
    const key = normalizeLocaleKey(locale)
    const localeLanguage = key ? LOCALE_TO_AI_LANGUAGE[key] : null

    const scripted = text ? detectScriptLanguage(text) : null
    if (scripted) {
        if (scripted === "Chinese") {
            if (
                localeLanguage === "Simplified Chinese" ||
                localeLanguage === "Traditional Chinese"
            ) {
                return localeLanguage
            }
            return "Simplified Chinese"
        }
        return scripted
    }

    return localeLanguage ?? DEFAULT_AI_LANGUAGE
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
