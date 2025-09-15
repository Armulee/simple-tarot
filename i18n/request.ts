import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'

// List of supported locales
export const locales = ['en', 'th'] as const
export type Locale = typeof locales[number]

// Default locale
export const defaultLocale: Locale = 'th'

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locale || !locales.includes(locale as any)) notFound()

  return {
    locale: locale as Locale,
    messages: (await import(`../messages/${locale}.json`)).default
  }
})