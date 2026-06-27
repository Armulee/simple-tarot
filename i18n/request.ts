import { getRequestConfig } from "next-intl/server"
import { hasLocale } from "next-intl"
import { routing } from "./routing"

export const locales = [
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
export type AppLocale = (typeof locales)[number]

type Messages = Record<string, unknown>

/** Deep-merge `override` onto `base`, so keys missing in a locale fall back. */
function deepMerge(base: Messages, override: Messages): Messages {
    const out: Messages = { ...base }
    for (const key of Object.keys(override)) {
        const b = out[key]
        const o = override[key]
        if (
            o &&
            typeof o === "object" &&
            !Array.isArray(o) &&
            b &&
            typeof b === "object" &&
            !Array.isArray(b)
        ) {
            out[key] = deepMerge(b as Messages, o as Messages)
        } else {
            out[key] = o
        }
    }
    return out
}

// Per-locale merged-message cache (en base + locale overrides), so an
// untranslated key renders in English instead of showing its key path.
const messageCache = new Map<string, Messages>()

async function loadMessages(locale: string): Promise<Messages> {
    const cached = messageCache.get(locale)
    if (cached) return cached
    const localeMessages = (await import(`../messages/${locale}.json`))
        .default as Messages
    const merged =
        locale === routing.defaultLocale
            ? localeMessages
            : deepMerge(
                  (await import(`../messages/en.json`)).default as Messages,
                  localeMessages,
              )
    messageCache.set(locale, merged)
    return merged
}

export default getRequestConfig(async ({ requestLocale }) => {
    // Typically corresponds to the `[locale]` segment
    const requested = await requestLocale
    const locale = hasLocale(routing.locales, requested)
        ? requested
        : routing.defaultLocale
    const messages = await loadMessages(locale)

    return {
        locale,
        messages,
    }
})
