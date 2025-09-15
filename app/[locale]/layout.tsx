import type React from "react"
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { I18nProvider } from "@/contexts/i18n-context"
import { Locale } from '@/lib/i18n'

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({
  children,
  params
}: LocaleLayoutProps) {
  const { locale } = await params
  
  // Validate locale
  if (locale !== 'en' && locale !== 'th') {
    throw new Error(`Invalid locale: ${locale}`)
  }
  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      <I18nProvider initialLocale={locale as Locale} messages={messages}>
        {children}
      </I18nProvider>
    </NextIntlClientProvider>
  )
}