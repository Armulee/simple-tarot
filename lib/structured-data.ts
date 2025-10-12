// Structured data for SEO - AI Tarot Reading Website
export const websiteStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Asking Fate",
    alternateName: "Asking Fate AI Tarot",
    url: "https://askingfate.com",
    description:
        "Get free AI-powered tarot card readings and spiritual guidance. Ask questions about your destiny and receive personalized insights from our advanced AI tarot system.",
    potentialAction: {
        "@type": "SearchAction",
        target: {
            "@type": "EntryPoint",
            urlTemplate:
                "https://askingfate.com/tarot?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
    },
    publisher: {
        "@type": "Organization",
        name: "Asking Fate",
        url: "https://askingfate.com",
        logo: {
            "@type": "ImageObject",
            url: "https://askingfate.com/assets/logo.png",
        },
    },
}

export const organizationStructuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Asking Fate",
    url: "https://askingfate.com",
    logo: "https://askingfate.com/assets/logo.png",
    description:
        "AI-powered tarot reading platform providing free spiritual guidance and personalized insights.",
    foundingDate: "2024",
    sameAs: [
        "https://twitter.com/askingfate",
        "https://facebook.com/askingfate",
        "https://instagram.com/askingfate",
    ],
    contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        email: "support@askingfate.com",
        url: "https://askingfate.com/contact",
    },
    serviceType: "AI Tarot Reading",
    areaServed: "Worldwide",
    hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Tarot Reading Services",
        itemListElement: [
            {
                "@type": "Offer",
                itemOffered: {
                    "@type": "Service",
                    name: "Simple Tarot Reading",
                    description: "One card for focused guidance",
                },
                price: "0",
                priceCurrency: "USD",
            },
            {
                "@type": "Offer",
                itemOffered: {
                    "@type": "Service",
                    name: "Intermediate Tarot Reading",
                    description: "Two cards for deeper insight",
                },
                price: "0",
                priceCurrency: "USD",
            },
            {
                "@type": "Offer",
                itemOffered: {
                    "@type": "Service",
                    name: "Advanced Tarot Reading",
                    description: "Three cards for comprehensive guidance",
                },
                price: "0",
                priceCurrency: "USD",
            },
        ],
    },
}

export const serviceStructuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI Tarot Reading",
    description:
        "Free AI-powered tarot card readings with personalized spiritual guidance and insights about your destiny.",
    provider: {
        "@type": "Organization",
        name: "Asking Fate",
        url: "https://askingfate.com",
    },
    areaServed: {
        "@type": "Country",
        name: "Worldwide",
    },
    hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Tarot Reading Services",
        itemListElement: [
            {
                "@type": "Offer",
                itemOffered: {
                    "@type": "Service",
                    name: "Simple Tarot Reading",
                    description: "One card for focused guidance",
                },
            },
            {
                "@type": "Offer",
                itemOffered: {
                    "@type": "Service",
                    name: "Intermediate Tarot Reading",
                    description: "Two cards for deeper insight",
                },
            },
            {
                "@type": "Offer",
                itemOffered: {
                    "@type": "Service",
                    name: "Advanced Tarot Reading",
                    description: "Three cards for comprehensive guidance",
                },
            },
        ],
    },
    category: "Spiritual Guidance",
    serviceType: "Tarot Reading",
    audience: {
        "@type": "Audience",
        audienceType: "Spiritual Seekers",
    },
}

export const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
        {
            "@type": "Question",
            name: "Is the AI tarot reading service free?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Yes, our AI tarot reading service is completely free to use. No subscriptions or payments are required to get personalized spiritual guidance and insights.",
            },
        },
        {
            "@type": "Question",
            name: "How accurate are the AI tarot readings?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Our AI provides insights based on traditional tarot symbolism and patterns. While readings are for guidance and entertainment purposes, many users find them meaningful and helpful for reflection.",
            },
        },
        {
            "@type": "Question",
            name: "What types of tarot readings are available?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "We offer three types of readings: Simple (1 card), Intermediate (2 cards), and Advanced (3 cards). Each provides different levels of insight and guidance for your questions.",
            },
        },
        {
            "@type": "Question",
            name: "Can I ask any question in my tarot reading?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Yes, you can ask questions about love, career, relationships, life decisions, or any topic you'd like guidance on. Our AI interprets your question and provides relevant insights.",
            },
        },
        {
            "@type": "Question",
            name: "How does the AI tarot reading work?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Our AI system analyzes your question, selects appropriate tarot cards, and provides personalized interpretations based on traditional tarot meanings and modern AI technology.",
            },
        },
    ],
}

// Helper function to get structured data for a specific page
export function getStructuredDataForPage(page: string) {
    const baseData = {
        "@context": "https://schema.org",
    }

    switch (page) {
        case "home":
            return {
                ...baseData,
                ...websiteStructuredData,
                ...organizationStructuredData,
            }
        case "reading":
            return {
                ...baseData,
                ...serviceStructuredData,
            }
        case "about":
            return {
                ...baseData,
                ...organizationStructuredData,
            }
        case "contact":
            return {
                ...baseData,
                ...faqStructuredData,
            }
        default:
            return baseData
    }
}
