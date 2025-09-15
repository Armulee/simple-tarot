import type { Metadata } from "next"
import NotFoundClient from "@/components/not-found-client"
import { Locale } from '@/lib/i18n'

interface NotFoundPageProps {
  params?: Promise<{ locale: string }>
}

export const metadata: Metadata = {
  title: "Page Not Found - 404 | Asking Fate",
  description: "The page you're looking for doesn't exist. Return to our AI tarot reading homepage to continue your spiritual journey.",
  robots: "noindex, nofollow",
}

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic'

export default async function NotFound({ params }: NotFoundPageProps) {
  // Handle case where params might not be available during prerendering
  let locale: Locale = 'en' // Default fallback
  
  try {
    if (params) {
      const resolvedParams = await params
      locale = (resolvedParams?.locale as Locale) || 'en'
    }
  } catch (error) {
    console.warn('Could not resolve params in not-found page:', error)
    locale = 'en'
  }
  
  return (
    <NotFoundClient locale={locale} />
  )
}