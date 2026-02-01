import type React from "react"
import type { Metadata } from "next"
import type { SwiperRef } from "swiper/react"
import { getTranslations } from "next-intl/server"
import AboutSections from "@/components/about"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Meta.About")
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

export default function AboutPage() {
    const dummyRef = { current: null } as React.RefObject<SwiperRef | null>

    return (
        <div className='min-h-screen pt-16'>
            <AboutSections mainSwiperRef={dummyRef} />
        </div>
    )
}
