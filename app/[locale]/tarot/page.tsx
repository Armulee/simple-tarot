import type { Metadata } from "next"
import ReadingType from "@/components/tarot/reading-type"
import CardSelection from "@/components/tarot/card-selection"
import ReadingGuard from "@/components/tarot/reading-guard"
import { getTranslations } from "next-intl/server"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Meta.Reading")
    return {
        title: t("title"),
        description: t("description"),
        keywords: t("keywords"),
        openGraph: {
            title: t("ogTitle"),
            description: t("ogDescription"),
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: t("twitterTitle"),
            description: t("twitterDescription"),
        },
    }
}

export type ReadingConfig = {
    [type: string]: {
        cards: number
        title: string
        description: string
    }
}

export default async function ReadingPage() {
    const t = await getTranslations("Reading.types")
    const readingConfig: ReadingConfig = {
        simple: {
            cards: 1,
            title: t("simple.title"),
            description: t("simple.description"),
        },
        general: {
            cards: 3,
            title: t("general.title"),
            description: t("general.description"),
        },
        detailed: {
            cards: 5,
            title: t("detailed.title"),
            description: t("detailed.description"),
        },
        expanded: {
            cards: 7,
            title: t("expanded.title"),
            description: t("expanded.description"),
        },
        celtic: {
            cards: 10,
            title: t("celtic.title"),
            description: t("celtic.description"),
        }
    }
    return (
        <ReadingGuard>
            <ReadingType readingConfig={readingConfig} />
            <CardSelection readingConfig={readingConfig} />
        </ReadingGuard>
    )
}
