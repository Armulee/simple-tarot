import type { Metadata } from "next"
import { TypewriterText } from "@/components/typewriter-text"
import HomeQuestionWrapper from "@/components/home-question-wrapper"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Suspense } from "react"
import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { Locale } from '@/lib/i18n'

interface HomePageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })
  
  return {
    title: t('homeTitle'),
    description: t('homeDescription'),
    keywords: t('homeKeywords'),
    openGraph: {
      title: t('homeTitle'),
      description: t('homeDescription'),
      type: "website",
      url: "https://askingfate.com",
      siteName: t('common.brandName'),
    },
    twitter: {
      card: "summary_large_image",
      title: t('homeTitle'),
      description: t('homeDescription'),
    },
  }
}

export default async function HomePage({ params }: HomePageProps) {
    const { locale } = await params
    return (
        <HomePageClient locale={locale as Locale} />
    )
}

function HomePageClient({ locale }: { locale: Locale }) {
    const t = useTranslations()
    
    return (
        <section className='relative z-10 flex flex-col items-center justify-center h-[calc(100vh-180px)] px-6 text-center'>
            <div className='max-w-4xl w-full mx-auto space-y-8'>
                {/* Main Heading */}
                <div className='space-y-4'>
                    <h1 className='font-serif font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-balance h-20 sm:h-24 md:h-28 lg:h-32'>
                        <TypewriterText
                            text={t('home.title')}
                            speed={60}
                            className='text-white'
                        />
                        <br />
                        <TypewriterText
                            text={t('home.subtitle')}
                            speed={60}
                            delay={60 * t('home.title').length}
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
                        <Link href={`/${locale}/about`}>{t('common.learnMore')}</Link>
                    </Button>
                </div>
            </div>
        </section>
    )
}
