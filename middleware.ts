import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"
import { NextResponse, type NextRequest } from "next/server"

const intlMiddleware = createMiddleware(routing)

const COOKIE_NAME = "anon_device_id"

function generateId(): string {
    const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
    return template.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === "x" ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

export default function middleware(req: NextRequest) {
    // First, run i18n routing
    const res = intlMiddleware(req)

    // Ensure anon device id cookie exists for all non-excluded routes
    const hasCookie = req.cookies.get(COOKIE_NAME)?.value
    if (!hasCookie) {
        const did = generateId()
        // Clone response to set cookie header
        const response = NextResponse.next({ request: req })
        response.headers.set("set-cookie", `${COOKIE_NAME}=${did}; Path=/; Max-Age=${60 * 60 * 24 * 365 * 2}; SameSite=Lax${req.nextUrl.protocol === "https:" ? "; Secure" : ""}`)
        // Merge headers from intl response into this response
        res.headers.forEach((v, k) => {
            if (k.toLowerCase() !== "set-cookie") response.headers.set(k, v)
        })
        return response
    }
    return res
}

export const config = {
    matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
}
