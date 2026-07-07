import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
    // A list of all locales that are supported
    locales: [
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
    ],

    // Used when no locale matches
    defaultLocale: "en",

    // Hide default locale prefix in URLs
    localePrefix: "as-needed",

    // Default to English on first visit. We do NOT auto-detect the browser
    // language — a first-time visitor always lands on English and can switch
    // manually (their choice is then remembered via the NEXT_LOCALE cookie).
    localeDetection: false,

    // Remember detected locale for subsequent visits (set NEXT_LOCALE cookie)
    localeCookie: {
        maxAge: 60 * 60 * 24 * 365, // 1 year
    },
})
