import type { Metadata } from "next"
import { redirect } from 'next/navigation'
import { defaultLocale } from '@/lib/i18n'

export const metadata: Metadata = {
  title: "Page Not Found - 404 | Asking Fate",
  description: "The page you're looking for doesn't exist. Return to our AI tarot reading homepage to continue your spiritual journey.",
  robots: "noindex, nofollow",
}

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic'

export default function RootNotFound() {
  // Redirect to the default locale's not-found page
  redirect(`/${defaultLocale}`)
}