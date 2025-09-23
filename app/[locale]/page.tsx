import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { HomepageContainer } from "@/components/homepage-container"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Meta.Home")
    const s = await getTranslations("Meta.Site")
    return {
        title: t("title"),
        description: t("description"),
        keywords: t("keywords"),
        openGraph: {
            title: t("ogTitle"),
            description: t("ogDescription"),
            type: "website",
            url: s("url"),
            siteName: s("siteName"),
        },
        twitter: {
            card: "summary_large_image",
            title: t("twitterTitle"),
            description: t("twitterDescription"),
        },
    }
}

export default function HomePage() {
    return <HomepageContainer />
}
