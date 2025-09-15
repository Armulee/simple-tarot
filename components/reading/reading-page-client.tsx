"use client"

import ReadingType from "./reading-type"
import CardSelection from "./card-selection"
import Interpretation from "./interpretation"
import ReadingGuard from "./reading-guard"
import { useTranslations } from 'next-intl'
import { Locale } from '@/lib/i18n'

export type ReadingConfig = {
    [type: string]: {
        cards: number
        title: string
        description: string
    }
}

// Function to create reading config with translations
function createReadingConfig(t: (key: string) => string): ReadingConfig {
    return {
        simple: {
            cards: 1,
            title: t('reading.simpleReading'),
            description: t('reading.simpleDescription'),
        },
        intermediate: {
            cards: 2,
            title: t('reading.intermediateReading'),
            description: t('reading.intermediateDescription'),
        },
        advanced: {
            cards: 3,
            title: t('reading.advancedReading'),
            description: t('reading.advancedDescription'),
        },
    }
}

interface ReadingPageClientProps {
    locale: Locale
}

export default function ReadingPageClient({ locale: _ }: ReadingPageClientProps) {
    const t = useTranslations()
    const readingConfig = createReadingConfig(t)
    
    return (
        <ReadingGuard>
            <ReadingType readingConfig={readingConfig} />
            <CardSelection readingConfig={readingConfig} />
            <Interpretation />
        </ReadingGuard>
    )
}