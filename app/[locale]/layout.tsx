import type React from "react"
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { I18nProvider } from "@/contexts/i18n-context"
import { Locale } from '@/lib/i18n'
import { Navbar } from "@/components/navbar"
import Footer from "@/components/footer"

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
        <div className='min-h-screen flex flex-col home-gradient'>
          <Navbar />
          <main className='pt-16 md:min-h-[calc(100dvh-65px)] min-h-[calc(100dvh-65px-4rem)] relative overflow-hidden'>
            {children}
          </main>
          <Footer />
        </div>
      </I18nProvider>
    </NextIntlClientProvider>
  )
}