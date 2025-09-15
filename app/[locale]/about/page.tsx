import type { Metadata } from "next"
import AboutPageClient from "@/components/about/about-page-client"
import { getTranslations } from 'next-intl/server'
import { Locale } from '@/lib/i18n'

interface AboutPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })
  
  return {
    title: t('aboutTitle'),
    description: t('aboutDescription'),
    keywords: t('aboutKeywords'),
    openGraph: {
      title: t('aboutTitle'),
      description: t('aboutDescription'),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t('aboutTitle'),
      description: t('aboutDescription'),
    },
  }
}

export default async function AboutPage({ params }: AboutPageProps) {
    const { locale } = await params
    return (
        <AboutPageClient locale={locale as Locale} />
    )
}
