import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"
import { NextResponse, type NextRequest } from "next/server"

const intlMiddleware = createMiddleware(routing)

const LOCALE_COOKIE = "NEXT_LOCALE"

/**
 * Detect preferred locale for root path. With localePrefix "as-needed", path "/"
 * is treated as matching default locale, so next-intl skips Accept-Language.
 * We explicitly detect from cookie (user preference) or Accept-Language (browser).
 */
function getPreferredLocaleForRoot(req: NextRequest): string | null {
    const supported = routing.locales as readonly string[]
    const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value
    if (cookieLocale && supported.includes(cookieLocale)) {
        return cookieLocale
    }

    const acceptLanguage = req.headers.get("accept-language")
    if (!acceptLanguage) return null

    const preferred = acceptLanguage
        .split(",")
        .map((part) => part.split(";")[0].trim().split("-")[0].toLowerCase())
        .find((lang) => supported.includes(lang))

    return preferred ?? null
}

export default function proxy(req: NextRequest) {
    const pathname = req.nextUrl.pathname

    // For root path only: detect locale from cookie or Accept-Language
    if (pathname === "/" || pathname === "") {
        const preferred = getPreferredLocaleForRoot(req)
        if (preferred && preferred !== routing.defaultLocale) {
            const url = req.nextUrl.clone()
            url.pathname = `/${preferred}`
            return NextResponse.redirect(url)
        }
    }

    return intlMiddleware(req)
}

export const config = {
    matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
}
