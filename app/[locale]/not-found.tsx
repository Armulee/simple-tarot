import type { Metadata } from "next"
import NotFoundClient from "@/components/not-found-client"
import { Locale } from '@/lib/i18n'

interface NotFoundPageProps {
  params: Promise<{ locale: string }>
}

export const metadata: Metadata = {
  title: "Page Not Found - 404 | Asking Fate",
  description: "The page you're looking for doesn't exist. Return to our AI tarot reading homepage to continue your spiritual journey.",
  robots: "noindex, nofollow",
}

export default async function NotFound({ params }: NotFoundPageProps) {
  const { locale } = await params
  return (
    <NotFoundClient locale={locale as Locale} />
  )
}