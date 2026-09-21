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
    /**
     * `/about` was a real, indexed page; its content now lives below the fold
     * on the landing page. Redirecting here rather than from a page component
     * is deliberate — next-intl's `redirect()` resolves internally and answers
     * 200, which would leave the same content served under two URLs. This
     * emits a real 308, and it runs before the i18n middleware so both the
     * bare and locale-prefixed forms are covered.
     */
    async redirects() {
        const locales = "en|th|lo|my|zh-CN|zh-TW|ja|ko|id|es|pt-BR"
        return [
            { source: "/about", destination: "/#about", permanent: true },
            {
                source: `/:locale(${locales})/about`,
                destination: "/:locale/#about",
                permanent: true,
            },
        ]
    },
}

const withNextIntl = createNextIntlPlugin()
export default withNextIntl(nextConfig)
