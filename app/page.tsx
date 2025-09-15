import { redirect } from 'next/navigation'
import { defaultLocale } from '@/lib/i18n'

export default function RootPage() {
  // Redirect to the default locale
  redirect(`/${defaultLocale}`)
}

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic'