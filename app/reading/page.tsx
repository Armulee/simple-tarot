import type { Metadata } from "next"
import ReadingPageContent from "@/components/reading/reading-page-content"

export const metadata: Metadata = {
    title: "AI Tarot Card Reading - Get Your Free Reading | Asking Fate",
    description: "Get a personalized AI tarot card reading for free. Ask your question and receive detailed interpretations with spiritual guidance from our advanced AI system.",
    keywords: "tarot card reading, AI tarot reading, free tarot reading, tarot card interpretation, spiritual guidance, tarot reading online",
    openGraph: {
        title: "AI Tarot Card Reading - Get Your Free Reading",
        description: "Get a personalized AI tarot card reading for free. Ask your question and receive detailed interpretations.",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "AI Tarot Card Reading - Get Your Free Reading",
        description: "Get a personalized AI tarot card reading for free. Ask your question and receive detailed interpretations.",
    },
}

export default function ReadingPage() {
    return <ReadingPageContent />
}
