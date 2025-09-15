import { locales, defaultLocale, type Locale } from '@/i18n/request'

// Function to detect user's preferred language based on location
export async function detectUserLanguage(): Promise<Locale> {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return defaultLocale
    }

    // Try to get user's location from browser
    const response = await fetch('https://ipapi.co/json/')
    const data = await response.json()
    
    // If user is in Thailand, return Thai, otherwise English
    if (data.country_code === 'TH') {
      return 'th'
    }
    
    return 'en'
  } catch (error) {
    console.error('Error detecting user language:', error)
    // Fallback: try to use browser language
    if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language.toLowerCase()
      if (browserLang.startsWith('th')) {
        return 'th'
      }
    }
    return defaultLocale
  }
}

// Function to get locale from URL path
export function getLocaleFromPath(pathname: string): Locale | null {
  const segments = pathname.split('/')
  const firstSegment = segments[1]
  
  if (firstSegment && locales.includes(firstSegment as Locale)) {
    return firstSegment as Locale
  }
  
  return null
}

// Function to add locale to path
export function addLocaleToPath(pathname: string, locale: Locale): string {
  // Remove existing locale if present
  const cleanPath = pathname.replace(/^\/[a-z]{2}(\/|$)/, '/')
  return `/${locale}${cleanPath === '/' ? '' : cleanPath}`
}

// Function to remove locale from path
export function removeLocaleFromPath(pathname: string): string {
  return pathname.replace(/^\/[a-z]{2}(\/|$)/, '/')
}

// Re-export types and constants for convenience
export { locales, defaultLocale, type Locale }