import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
    // A list of all locales that are supported
    locales: ["en", "th"],

    // Used when no locale matches
    defaultLocale: "en",

    // Hide default locale prefix in URLs
    localePrefix: "as-needed",

    // On first visit (no locale in path, no cookie), detect from Accept-Language
    // and redirect to matching locale (en or th) instead of defaulting to English
    localeDetection: true,

    // Remember detected locale for subsequent visits (set NEXT_LOCALE cookie)
    localeCookie: {
        maxAge: 60 * 60 * 24 * 365, // 1 year
    },
})
