import type { Metadata } from "next"
import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import ChatSession from "@/components/chat-session"
import ReferralHandler from "@/components/referral-handler"

import { getMetadataBase } from "@/lib/seo"

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>
}): Promise<Metadata> {
    const { locale } = await params
    const t = await getTranslations("Meta.Home")
    const s = await getTranslations("Meta.Site")
    const baseUrl = getMetadataBase().toString().replace(/\/$/, "")
    const ogImage = `${baseUrl}/${locale}/opengraph-image`
    const twitterImage = `${baseUrl}/${locale}/twitter-image`

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

export default function ChatPage() {
    return (
        <>
            <Suspense fallback={null}>
                <ReferralHandler />
            </Suspense>
            <section className='relative z-10 overflow-hidden h-[calc(100vh-64px)] flex flex-col items-center justify-center text-center'>
                <ChatSession mode='home' />
            </section>
        </>
    )
}
