import type { Metadata } from "next"
import ReadingPageClient from "@/components/reading/reading-page-client"
import { getTranslations } from 'next-intl/server'
import { Locale } from '@/lib/i18n'

interface ReadingPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: ReadingPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })
  
  return {
    title: t('readingTitle'),
    description: t('readingDescription'),
    keywords: t('readingKeywords'),
    openGraph: {
      title: t('readingTitle'),
      description: t('readingDescription'),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t('readingTitle'),
      description: t('readingDescription'),
    },
  }
}

export default async function ReadingPage({ params }: ReadingPageProps) {
    const { locale } = await params
    return (
        <ReadingPageClient locale={locale as Locale} />
    )
}
