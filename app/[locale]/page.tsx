import type { Metadata } from "next"
import HomeRefHandler from "@/components/home-ref-handler"
import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import HomeHero from "@/components/home"

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
    return (
        <>
            <Suspense fallback={null}>
                <HomeRefHandler />
            </Suspense>
            <section className='relative z-10 h-[calc(100vh-180px)] flex items-center justify-center text-center'>
                <HomeHero />
            </section>
        </>
    )
}
