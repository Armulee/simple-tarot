import type { Metadata } from "next"
import ReadingHistory from "@/components/tarot/reading-history"
import { getTranslations } from "next-intl/server"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Meta.Reading")
    return {
        title: `${t("title")} - History`,
        description: t("description"),
    }
}

export default function ReadingHistoryPage() {
    return <ReadingHistory />
}
