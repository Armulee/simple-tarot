import { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

const nextConfig: NextConfig = {
    serverExternalPackages: ["swisseph-wasm"],
    async rewrites() {
        return [
            // MCP Protected Resource Metadata (RFC 9728). Dot-folders aren't
            // routable in the App Router, so expose it via a normal route.
            {
                source: "/.well-known/oauth-protected-resource/mcp",
                destination: "/api/oauth-protected-resource/mcp",
            },
            // Proxy OAuth Authorization Server metadata to Supabase for MCP
            // clients that probe the resource origin for it (RFC 8414).
            ...(supabaseUrl
                ? [
                      {
                          source: "/.well-known/oauth-authorization-server",
                          destination: `${supabaseUrl}/.well-known/oauth-authorization-server/auth/v1`,
                      },
                  ]
                : []),
        ]
    },
}

const withNextIntl = createNextIntlPlugin()
export default withNextIntl(nextConfig)
