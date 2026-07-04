import { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const nextConfig: NextConfig = {
    serverExternalPackages: ["swisseph-wasm"],
    // Ensure the brand fonts and logo used by the dynamic social preview
    // images are bundled with the deployed functions.
    outputFileTracingIncludes: {
        "/[locale]/opengraph-image": [
            "./assets/fonts/**",
            "./public/assets/logo.png",
        ],
        "/[locale]/twitter-image": [
            "./assets/fonts/**",
            "./public/assets/logo.png",
        ],
    },
}

const withNextIntl = createNextIntlPlugin()
export default withNextIntl(nextConfig)
