import type { Metadata } from "next"
import HomeHero from "@/components/home/home-hero"

export const metadata: Metadata = {
    title: "AI Tarot Reading - Ask Questions About Your Destiny | Asking Fate",
    description: "Get free AI-powered tarot card readings and spiritual guidance. Ask any question about your destiny and receive personalized insights from our advanced AI tarot system.",
    keywords: "AI tarot reading, free tarot cards, spiritual guidance, destiny questions, tarot card interpretation, AI-powered divination",
    openGraph: {
        title: "AI Tarot Reading - Ask Questions About Your Destiny",
        description: "Get free AI-powered tarot card readings and spiritual guidance. Ask any question about your destiny.",
        type: "website",
        url: "https://askingfate.com",
        siteName: "Asking Fate",
    },
    twitter: {
        card: "summary_large_image",
        title: "AI Tarot Reading - Ask Questions About Your Destiny",
        description: "Get free AI-powered tarot card readings and spiritual guidance. Ask any question about your destiny.",
    },
}

export default function HomePage() {
    return <HomeHero />
}
