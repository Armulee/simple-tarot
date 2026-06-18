import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js"
import { supabase } from "@/lib/supabase"

/**
 * Verify an incoming MCP bearer token against Supabase Auth.
 *
 * Passed to `withMcpAuth` as the `verifyToken` callback. Returning `undefined`
 * makes mcp-handler respond with 401, which kicks off the OAuth handshake.
 *
 * NOTE: Task 2 wires the full Supabase OAuth 2.1 Server (Dynamic Client
 * Registration + consent page + protected-resource metadata discovery). This
 * helper already performs the token verification that step relies on.
 */
export async function verifyMcpToken(
    _req: Request,
    bearerToken?: string,
): Promise<AuthInfo | undefined> {
    if (!bearerToken) return undefined

    // getClaims verifies the JWT signature via Supabase's JWKS.
    const { data, error } = await supabase.auth.getClaims(bearerToken)
    const sub = data?.claims?.sub
    if (error || !sub) return undefined

    return {
        token: bearerToken,
        clientId: sub,
        scopes: [],
        extra: { userId: sub },
    }
}

/**
 * Resolve the authenticated AskingFate user id from a tool's `authInfo`.
 * Throws when the request is unauthenticated (should not happen when the
 * handler is wrapped with `withMcpAuth({ required: true })`, but kept as a
 * defensive guard).
 */
export function getUserId(authInfo: AuthInfo | undefined): string {
    const userId = authInfo?.extra?.userId as string | undefined
    if (!userId) {
        throw new UnauthenticatedError()
    }
    return userId
}

export class UnauthenticatedError extends Error {
    constructor() {
        super("Please sign in to AskingFate to use this tool.")
        this.name = "UnauthenticatedError"
    }
}
