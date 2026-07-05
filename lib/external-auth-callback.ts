/**
 * Sign-in handoff for trusted external services (mcp.askingfate.com).
 *
 * The Supabase session lives in this origin's localStorage, so subdomains
 * like the MCP server can never see it. When a signin/signup/auth-callback
 * page receives a callbackUrl pointing at an allowlisted external origin,
 * we hand the access token over in the URL FRAGMENT (mirroring Supabase's
 * own implicit flow — fragments never reach any server log) and the service
 * verifies it server-side to establish its own session.
 *
 * Any other absolute or relative callbackUrl keeps the existing in-app
 * navigation behaviour.
 */
const DEFAULT_ALLOWED_ORIGINS = ["https://mcp.askingfate.com"]

function allowedOrigins(): string[] {
    const extra = (process.env.NEXT_PUBLIC_EXTERNAL_AUTH_CALLBACK_ORIGINS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    return [...DEFAULT_ALLOWED_ORIGINS, ...extra]
}

/**
 * Returns callbackUrl with the access token in the fragment when it targets
 * an allowlisted external origin, or null for normal in-app navigation.
 */
export function externalCallbackWithToken(
    callbackUrl: string | null | undefined,
    accessToken: string | null | undefined
): string | null {
    if (!callbackUrl || !accessToken) return null
    let url: URL
    try {
        url = new URL(callbackUrl)
    } catch {
        return null
    }
    if (!allowedOrigins().includes(url.origin)) return null
    url.hash = `access_token=${encodeURIComponent(accessToken)}`
    return url.toString()
}
