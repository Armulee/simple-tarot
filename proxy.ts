import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"
import { NextResponse, type NextRequest } from "next/server"

const intlMiddleware = createMiddleware(routing)

const LOCALE_COOKIE = "NEXT_LOCALE"

/**
 * Preferred locale for the root path. English is the default: we only honor an
 * explicit saved preference (the NEXT_LOCALE cookie the user's manual language
 * switch sets). Browser Accept-Language is intentionally NOT used, so a
 * first-time visitor always lands on English regardless of their browser.
 */
function getPreferredLocaleForRoot(req: NextRequest): string | null {
    const supported = routing.locales as readonly string[]
    const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value
    if (cookieLocale && supported.includes(cookieLocale)) {
        return cookieLocale
    }
    return null
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
