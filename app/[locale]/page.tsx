import type { Metadata } from "next"
import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import HomeHero from "@/components/home"
import AboutContent from "@/components/about/content"
import ReferralHandler from "@/components/referral-handler"

import { getSocialImageUrls } from "@/lib/seo"

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    const t = await getTranslations("Meta.Home")
    const s = await getTranslations("Meta.Site")
    const { ogImage, twitterImage } = getSocialImageUrls(locale)

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
            images: [
                {
                    url: ogImage,
                    width: 1200,
                    height: 630,
                    alt: t("ogTitle"),
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: t("twitterTitle"),
            description: t("twitterDescription"),
            images: [twitterImage],
        },
    }
}

export default function HomePage() {
    return (
        <>
            <Suspense fallback={null}>
                <ReferralHandler />
            </Suspense>
            {/* One full screen. `main` already carries pt-16 for the fixed
                navbar, so a bare 100dvh would push the composer 64px past the
                fold; dvh (not vh) so mobile browser chrome doesn't do the same. */}
            {/* z-40 (under the z-50 navbar, over the z-10 sections below):
                `relative z-index` here is a stacking context, so the composer's
                own z-index cannot lift it past a later sibling on its own. */}
            <section className='relative z-40 overflow-hidden h-[calc(100dvh-64px)] flex flex-col items-center justify-center text-center'>
                <HomeHero />
            </section>
            {/* Target of the hero's "learn more" — same sections as /about. The
                page's own footer sits below, so this copy renders without one. */}
            {/* Bottom padding clears the composer, which stays pinned to the
                viewport while these sections scroll past it. */}
            <section
                id='learn-more'
                className='relative z-10 scroll-mt-16 pb-[var(--home-composer-h,320px)]'
            >
                <AboutContent embedded />
            </section>
        </>
    )
}
