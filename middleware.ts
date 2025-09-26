import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"
import { type NextRequest } from "next/server"

const intlMiddleware = createMiddleware(routing)

export default function middleware(req: NextRequest) {
    // Just run i18n; do NOT set any cookies pre-consent
    return intlMiddleware(req)
}

export const config = {
    matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
}
