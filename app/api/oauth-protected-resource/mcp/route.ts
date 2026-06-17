import {
    generateProtectedResourceMetadata,
    getPublicOrigin,
    metadataCorsOptionsRequestHandler,
} from "mcp-handler"

/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728) for the MCP server.
 *
 * Served at `/.well-known/oauth-protected-resource/mcp` via a next.config
 * rewrite. Points MCP clients (Claude) at Supabase as the authorization
 * server, so Dynamic Client Registration + the OAuth handshake happen against
 * the Supabase OAuth 2.1 Server. The 401 from `withMcpAuth` references this
 * document via its `resourceMetadataPath`.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

export function GET(req: Request): Response {
    const origin = getPublicOrigin(req)
    const authServerUrls = SUPABASE_URL ? [`${SUPABASE_URL}/auth/v1`] : []

    const metadata = generateProtectedResourceMetadata({
        authServerUrls,
        resourceUrl: `${origin}/api/mcp`,
    })

    return Response.json(metadata, {
        headers: { "Access-Control-Allow-Origin": "*" },
    })
}

export const OPTIONS = metadataCorsOptionsRequestHandler()
