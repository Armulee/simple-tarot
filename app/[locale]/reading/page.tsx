import type { Metadata } from "next"
import { redirect } from "next/navigation"
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

export default async function ReadingPage() {
    redirect("/")
}
