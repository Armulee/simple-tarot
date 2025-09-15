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

  // Set locale and update URL
  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    
    // Update the URL with the new locale
    const cleanPath = removeLocaleFromPath(pathname)
    const newPath = addLocaleToPath(cleanPath, newLocale)
    
    if (newPath !== pathname) {
      router.push(newPath)
    }
  }

  // Auto-detect language on first load
  useEffect(() => {
    const detectLanguage = async () => {
      try {
        const detectedLocale = await detectUserLanguage()
        if (detectedLocale !== locale) {
          setLocale(detectedLocale)
        }
      } catch (error) {
        console.error('Error detecting language:', error)
      }
    }

    // Only detect if no locale is set in URL
    const currentLocale = pathname.split('/')[1]
    if (!['en', 'th'].includes(currentLocale)) {
      detectLanguage()
    }
  }, [])

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