import { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const nextConfig: NextConfig = {
    serverExternalPackages: ["swisseph-wasm"],
}

const withNextIntl = createNextIntlPlugin()
export default withNextIntl(nextConfig)
