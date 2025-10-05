import { cookies } from "next/headers"
import crypto from "crypto"

export const DID_COOKIE = "__host_sd"
const TWO_YEARS = 60 * 60 * 24 * 365 * 2

function getSigningSecret(): string {
    const secret =
        process.env.COOKIE_SIGNING_SECRET ||
        process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!secret) {
        // As a last resort in local dev only
        return "dev-signing-secret-change-me"
    }
    return secret
}

export function generateDid(): string {
    return crypto.randomUUID()
}

export function signDid(did: string): string {
    const h = crypto.createHmac("sha256", getSigningSecret())
    h.update(did)
    return h.digest("base64url")
}

export async function setDidCookie(did: string) {
    const sig = signDid(did)
    const value = `${did}.${sig}`
    const c = await cookies()
    const isProd = process.env.NODE_ENV === "production"
    c.set(DID_COOKIE, value, {
        httpOnly: true,
        sameSite: "lax",
        secure: isProd,
        path: "/",
        maxAge: TWO_YEARS,
    })
}

export async function readAndVerifyDid(): Promise<string | null> {
    const c = await cookies()
    const raw = c.get(DID_COOKIE)?.value
    if (!raw) return null
    const parts = raw.split(".")
    if (parts.length !== 2) return null
    const [did, sig] = parts
    const expected = signDid(did)
    if (sig !== expected) return null
    return did
}
