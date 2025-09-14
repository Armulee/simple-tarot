import { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Asking Fate - AI Tarot Reading",
        short_name: "Asking Fate",
        description:
            "Get free AI-powered tarot card readings and spiritual guidance. Ask questions about your destiny and receive personalized insights.",
        start_url: "/",
        display: "standalone",
        background_color: "#0a0a1a",
        theme_color: "#6366f1",
        orientation: "portrait-primary",
        scope: "/",
        lang: "en",
        categories: ["lifestyle", "entertainment", "spirituality"],
        icons: [
            {
                src: "/icons/icon-72x72.png",
                sizes: "72x72",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icons/icon-96x96.png",
                sizes: "96x96",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icons/icon-128x128.png",
                sizes: "128x128",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icons/icon-144x144.png",
                sizes: "144x144",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icons/icon-152x152.png",
                sizes: "152x152",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icons/icon-192x192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icons/icon-384x384.png",
                sizes: "384x384",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icons/icon-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
        ],
        screenshots: [
            {
                src: "/screenshots/desktop-reading.png",
                sizes: "1280x720",
                type: "image/png",
                form_factor: "wide",
                label: "AI Tarot Reading Interface",
            },
            {
                src: "/screenshots/mobile-reading.png",
                sizes: "390x844",
                type: "image/png",
                form_factor: "narrow",
                label: "Mobile Tarot Reading Experience",
            },
        ],
        shortcuts: [
            {
                name: "Start Reading",
                short_name: "Reading",
                description: "Begin your AI tarot card reading",
                url: "/reading",
                icons: [
                    {
                        src: "/icons/shortcut-reading.png",
                        sizes: "96x96",
                    },
                ],
            },
            {
                name: "About Us",
                short_name: "About",
                description: "Learn about our AI tarot technology",
                url: "/about",
                icons: [
                    {
                        src: "/icons/shortcut-about.png",
                        sizes: "96x96",
                    },
                ],
            },
        ],
        related_applications: [],
        prefer_related_applications: false,
    }
}
