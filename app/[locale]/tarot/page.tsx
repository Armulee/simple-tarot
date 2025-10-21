import type { Metadata } from "next"
import ReadingType from "@/components/tarot/reading-type"
import CardSelection from "@/components/tarot/card-selection"
import ReadingGuard from "@/components/tarot/reading-guard"
import { getTranslations } from "next-intl/server"
import { getTranslations as getT } from "next-intl/server"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getT("Meta.Reading")
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
        intermediate: {
            cards: 2,
            title: t("intermediate.title"),
            description: t("intermediate.description"),
        },
        advanced: {
            cards: 3,
            title: t("advanced.title"),
            description: t("advanced.description"),
        },
    }
    return (
        <ReadingGuard>
            <ReadingType readingConfig={readingConfig} />
            <CardSelection readingConfig={readingConfig} />
        </ReadingGuard>
    )
}
