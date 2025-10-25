import type { Metadata } from "next"
import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import HomeHero from "@/components/home"
import ReferralHandler from "@/components/referral-handler"

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
                <ReferralHandler />
            </Suspense>
            <section className='relative z-10 overflow-hidden h-[calc(100vh-64px)] flex flex-col items-center justify-center text-center'>
                <HomeHero />
            </section>
        </>
    )
}
