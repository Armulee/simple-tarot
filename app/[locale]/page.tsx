import type { Metadata } from "next"
import { TypewriterText } from "@/components/typewriter-text"
import HomeQuestionWrapper from "@/components/home-question-wrapper"
import HomeRefHandler from "@/components/home-ref-handler"
import { Button } from "@/components/ui/button"
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
        <>
            <Suspense fallback={null}>
                <HomeRefHandler />
            </Suspense>
            <section className='relative z-10 flex flex-col items-center justify-center h-[calc(100vh-180px)] px-6 text-center'>
                <div className='max-w-4xl w-full mx-auto space-y-8'>
                    {/* Main Heading */}
                    <div className='space-y-4'>
                        <h1 className='font-serif font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-balance h-20 sm:h-24 md:h-28 lg:h-32'>
                            <TypewriterText
                                text={t("hero.line1")}
                                speed={60}
                                className='text-white'
                            />
                            <br />
                            <TypewriterText
                                text={t("hero.line2")}
                                speed={60}
                                delay={60 * t("hero.line1").length}
                                className='text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'
                            />
                        </h1>
                    </div>

                    {/* Question Input */}
                    <div className='flex flex-col gap-6 justify-center items-center pt-8 max-w-md mx-auto px-4'>
                        <div className='w-full'>
                            <Suspense fallback={<div className='h-20' />}>
                                <HomeQuestionWrapper />
                            </Suspense>
                        </div>

                        <Button
                            asChild
                            variant='ghost'
                            size='lg'
                            className='border-border/30 hover:bg-card/20 backdrop-blur-sm px-8 py-6 text-lg bg-transparent'
                        >
                            <Link href='/about'>{t("learnMore")}</Link>
                        </Button>
                    </div>
                </div>
            </section>
        </>
    )
}
