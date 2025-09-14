import type { Metadata } from "next"
import ReadingType from "@/components/reading/reading-type"
import CardSelection from "@/components/reading/card-selection"
import Interpretation from "@/components/reading/interpretation"
import ReadingGuard from "@/components/reading/reading-guard"

export const metadata: Metadata = {
    title: "AI Tarot Card Reading - Get Your Free Reading | Asking Fate",
    description:
        "Get a personalized AI tarot card reading for free. Ask your question and receive detailed interpretations with spiritual guidance from our advanced AI system.",
    keywords:
        "tarot card reading, AI tarot reading, free tarot reading, tarot card interpretation, spiritual guidance, tarot reading online",
    openGraph: {
        title: "AI Tarot Card Reading - Get Your Free Reading",
        description:
            "Get a personalized AI tarot card reading for free. Ask your question and receive detailed interpretations.",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "AI Tarot Card Reading - Get Your Free Reading",
        description:
            "Get a personalized AI tarot card reading for free. Ask your question and receive detailed interpretations.",
    },
}

export type ReadingConfig = {
    [type: string]: {
        cards: number
        title: string
        description: string
    }
}

const readingConfig: ReadingConfig = {
    simple: {
        cards: 1,
        title: "Simple Reading",
        description: "One card for focused guidance",
    },
    intermediate: {
        cards: 2,
        title: "Intermediate Reading",
        description: "Two cards for deeper insight",
    },
    advanced: {
        cards: 3,
        title: "Advanced Reading",
        description: "Three cards for comprehensive guidance",
    },
}

export default function ReadingPage() {
    return (
        <ReadingGuard>
            <ReadingType readingConfig={readingConfig} />
            <CardSelection readingConfig={readingConfig} />
            <Interpretation />
        </ReadingGuard>
    )
}
