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

    // Build a case-insensitive lookup so we can match both region-coded locales
    // (e.g. "zh-CN", "pt-BR") and bare language codes (e.g. "en", "th").
    const byLower = new Map(supported.map((l) => [l.toLowerCase(), l]))

    for (const part of acceptLanguage.split(",")) {
        const tag = part.split(";")[0].trim().toLowerCase()
        if (!tag) continue
        // 1) Exact match on the full BCP-47 tag (zh-cn -> zh-CN).
        if (byLower.has(tag)) return byLower.get(tag)!
        // 2) Match the base language: bare supported code (th-TH -> th) or the
        //    first region-coded locale sharing that base (zh -> zh-CN).
        const base = tag.split("-")[0]
        if (byLower.has(base)) return byLower.get(base)!
        const variant = supported.find(
            (l) => l.toLowerCase().split("-")[0] === base,
        )
        if (variant) return variant
    }

    return null
}

/**
 * /about was folded into the home page's "learn more" section. The URL is
 * indexed and linked from outside, so it redirects rather than 404s.
 */
function aboutRedirect(req: NextRequest): NextResponse | null {
    const segments = req.nextUrl.pathname.split("/").filter(Boolean)
    const isAbout =
        segments.length > 0 && segments[segments.length - 1] === "about"
    if (!isAbout) return null
    const prefix = segments.slice(0, -1)
    const supported = routing.locales as readonly string[]
    // Only /about and /<locale>/about — never /articles/about or similar.
    if (prefix.length > 1) return null
    if (prefix.length === 1 && !supported.includes(prefix[0])) return null

    const url = req.nextUrl.clone()
    url.pathname = prefix.length === 1 ? `/${prefix[0]}` : "/"
    url.hash = "learn-more"
    return NextResponse.redirect(url, 308)
}

export default function proxy(req: NextRequest) {
    const pathname = req.nextUrl.pathname

    const redirected = aboutRedirect(req)
    if (redirected) return redirected

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
