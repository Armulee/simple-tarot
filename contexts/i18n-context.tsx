"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Locale, detectUserLanguage, addLocaleToPath, removeLocaleFromPath } from '@/lib/i18n'

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
  messages: Record<string, any>
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

interface I18nProviderProps {
  children: ReactNode
  initialLocale: Locale
  messages: Record<string, any>
}

export function I18nProvider({ children, initialLocale, messages }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const [isNavigating, setIsNavigating] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Function to get nested object value by key path
  const getNestedValue = (obj: any, keyPath: string): string => {
    const keys = keyPath.split('.')
    let value = obj
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key]
      } else {
        console.warn(`Translation key not found: ${keyPath}`)
        return keyPath // Return the key if not found
      }
    }
    
    return typeof value === 'string' ? value : keyPath
  }

  // Translation function
  const t = (key: string): string => {
    return getNestedValue(messages, key)
  }

  // Set locale and update URL with navigation guard
  const setLocale = (newLocale: Locale) => {
    if (isNavigating) return // Prevent rapid navigation
    
    setLocaleState(newLocale)
    
    // Update the URL with the new locale
    const cleanPath = removeLocaleFromPath(pathname)
    const newPath = addLocaleToPath(cleanPath, newLocale)
    
    if (newPath !== pathname) {
      setIsNavigating(true)
      router.push(newPath)
      
      // Reset navigation guard after a short delay
      setTimeout(() => {
        setIsNavigating(false)
      }, 500)
    }
  }

  // Auto-detect language on first load with debouncing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    
    const detectLanguage = async () => {
      try {
        const detectedLocale = await detectUserLanguage()
        if (detectedLocale !== locale) {
          // Only navigate if the pathname doesn't already have a valid locale
          const currentLocale = pathname.split('/')[1]
          if (!['en', 'th'].includes(currentLocale)) {
            setLocale(detectedLocale)
          }
        }
      } catch (error) {
        console.error('Error detecting language:', error)
      }
    }

    // Debounce language detection to prevent rapid navigation
    timeoutId = setTimeout(() => {
      const currentLocale = pathname.split('/')[1]
      if (!['en', 'th'].includes(currentLocale)) {
        detectLanguage()
      }
    }, 100)

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [pathname, locale])

  const contextValue: I18nContextType = {
    locale,
    setLocale,
    t,
    messages
  }

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}