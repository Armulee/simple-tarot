import { Metadata } from "next"
import { getStructuredDataForPage } from "@/lib/structured-data"

// SEO Configuration for Asking Fate AI Tarot Reading Website
export const seoConfig = {
    siteName: "Asking Fate",
    siteUrl: "https://askingfate.com",
    description:
        "Get free AI-powered tarot card readings and spiritual guidance. Ask questions about your destiny and receive personalized insights from our advanced AI tarot system.",
    keywords: [
        "AI tarot reading",
        "free tarot cards",
        "spiritual guidance",
        "destiny questions",
        "tarot card interpretation",
        "AI-powered divination",
        "mystical guidance",
        "cosmic insights",
        "tarot reading online",
        "spiritual consultation",
        "fortune telling",
        "tarot card meanings",
        "astrology guidance",
        "mystical advice",
        "spiritual journey",
    ],
    author: "Asking Fate",
    twitter: "@askingfate",
    openGraph: {
        type: "website",
        locale: "en_US",
        siteName: "Asking Fate",
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large" as const,
            "max-snippet": -1,
        },
    },
    verification: {
        google: "your-google-verification-code",
        yandex: "your-yandex-verification-code",
        yahoo: "your-yahoo-verification-code",
    },
}

// Generate metadata for different pages
export function generatePageMetadata({
    title,
    description,
    keywords = [],
    image = "/opengraph-image.png",
    url,
    type = "website",
}: {
    title: string
    description: string
    keywords?: string[]
    image?: string
    url?: string
    type?: "website" | "article"
}): Metadata {
    const fullTitle = title.includes("Asking Fate")
        ? title
        : `${title} | Asking Fate`
    const fullUrl = url ? `${seoConfig.siteUrl}${url}` : seoConfig.siteUrl
    const fullImage = image.startsWith("http")
        ? image
        : `${seoConfig.siteUrl}${image}`

    return {
        title: fullTitle,
        description,
        keywords: [...seoConfig.keywords, ...keywords].join(", "),
        authors: [{ name: seoConfig.author }],
        creator: seoConfig.author,
        publisher: seoConfig.author,

        // Open Graph
        openGraph: {
            type,
            locale: seoConfig.openGraph.locale,
            url: fullUrl,
            title: fullTitle,
            description,
            siteName: seoConfig.siteName,
            images: [
                {
                    url: fullImage,
                    width: 1200,
                    height: 630,
                    alt: title,
                },
            ],
        },

        // Twitter
        twitter: {
            card: "summary_large_image",
            title: fullTitle,
            description,
            creator: seoConfig.twitter,
            images: [fullImage],
        },

        // Robots
        robots: seoConfig.robots,

        // Verification
        verification: seoConfig.verification,

        // Additional metadata
        alternates: {
            canonical: fullUrl,
        },

        // App metadata
        applicationName: seoConfig.siteName,
        category: "Lifestyle",

        // Additional tags
        other: {
            "apple-mobile-web-app-capable": "yes",
            "apple-mobile-web-app-status-bar-style": "black-translucent",
            "apple-mobile-web-app-title": seoConfig.siteName,
            "msapplication-TileColor": "#6366f1",
            "theme-color": "#6366f1",
        },
    }
}

// Pre-defined metadata for common pages
export const pageMetadata = {
    home: generatePageMetadata({
        title: "AI Tarot Reading - Ask Questions About Your Destiny",
        description:
            "Get free AI-powered tarot card readings and spiritual guidance. Ask any question about your destiny and receive personalized insights from our advanced AI tarot system.",
        keywords: [
            "AI tarot reading",
            "free tarot cards",
            "spiritual guidance",
            "destiny questions",
        ],
        url: "/",
    }),

    reading: generatePageMetadata({
        title: "AI Tarot Card Reading - Get Your Free Reading",
        description:
            "Get a personalized AI tarot card reading for free. Ask your question and receive detailed interpretations with spiritual guidance from our advanced AI system.",
        keywords: [
            "tarot card reading",
            "AI tarot reading",
            "free tarot reading",
            "tarot card interpretation",
        ],
        url: "/tarot",
    }),

    about: generatePageMetadata({
        title: "About - AI Tarot Reading Technology",
        description:
            "Discover how Asking Fate blends centuries-old tarot traditions with cutting-edge AI technology to provide personalized cosmic guidance and spiritual insights.",
        keywords: [
            "AI tarot technology",
            "tarot reading history",
            "spiritual guidance AI",
            "mystical traditions",
        ],
        url: "/about",
    }),

    contact: generatePageMetadata({
        title: "Contact Us - Get Help with Your AI Tarot Reading",
        description:
            "Have questions about your AI tarot reading experience? Contact our support team for assistance with your cosmic journey and spiritual guidance.",
        keywords: [
            "tarot reading support",
            "AI tarot help",
            "spiritual guidance contact",
            "tarot reading questions",
        ],
        url: "/contact",
    }),

    privacy: generatePageMetadata({
        title: "Privacy Policy - Your Data Protection & Privacy Rights",
        description:
            "Learn how Asking Fate protects your privacy and personal information when using our AI tarot reading service. Read our comprehensive privacy policy.",
        keywords: [
            "privacy policy",
            "data protection",
            "AI tarot privacy",
            "personal information security",
        ],
        url: "/privacy-policy",
    }),

    terms: generatePageMetadata({
        title: "Terms of Service - AI Tarot Reading Terms & Conditions",
        description:
            "Read the terms of service for Asking Fate's AI-powered tarot reading platform. Understand your rights and responsibilities when using our spiritual guidance service.",
        keywords: [
            "terms of service",
            "terms and conditions",
            "AI tarot terms",
            "tarot reading terms",
        ],
        url: "/terms-of-service",
    }),
}

// Helper function to get structured data JSON-LD
export function getStructuredDataScript(page: string) {
    const structuredData = getStructuredDataForPage(page)
    return JSON.stringify(structuredData)
}

// Generate JSON-LD script tag
export function generateStructuredDataScript(page: string) {
    const data = getStructuredDataScript(page)
    return {
        __html: data,
    }
}
