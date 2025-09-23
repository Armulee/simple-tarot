import type { Metadata } from "next"
import HomeInteractive from "@/components/home-interactive"
import HomeFeaturesGrid from "@/components/home-features-grid"
import Link from "next/link"
import { Suspense } from "react"
import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"

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
    const t = useTranslations("Home")
    return (
        <div className='relative z-10 snap-y snap-mandatory overflow-y-auto h-[calc(100vh-65px)]'>
            <Suspense fallback={<div className='h-[calc(100vh-65px)] snap-start' />}> 
                <HomeInteractive />
            </Suspense>

            {/* Details section */}
            <section className='relative px-6 py-16 max-w-6xl mx-auto snap-start'>
                <div className='text-center mb-10'>
                    <h2 className='font-serif text-3xl md:text-4xl font-bold'>
                        {t("features.title")}
                    </h2>
                    <p className='text-white/70 mt-2'>
                        {t("features.subtitle")}
                    </p>
                </div>
                <HomeFeaturesGrid />
                <div className='text-center mt-10'>
                    <Link href='/about' className='text-white/80 hover:text-white underline'>
                        {t("learnMore")}
                    </Link>
                </div>
            </section>
        </div>
    )
}
