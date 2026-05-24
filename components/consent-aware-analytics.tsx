"use client"

import { useEffect, useState } from "react"
import { Analytics } from "@vercel/analytics/react"
import {
    COOKIE_PREFERENCES_EVENT,
    hasAnalyticsConsent,
} from "@/lib/consent-storage"

export function ConsentAwareAnalytics() {
    const [enabled, setEnabled] = useState(false)

    useEffect(() => {
        setEnabled(hasAnalyticsConsent())

        const sync = () => {
            setEnabled(hasAnalyticsConsent())
        }

        window.addEventListener(COOKIE_PREFERENCES_EVENT, sync)
        window.addEventListener("storage", sync)

        return () => {
            window.removeEventListener(COOKIE_PREFERENCES_EVENT, sync)
            window.removeEventListener("storage", sync)
        }
    }, [])

    if (!enabled) return null

    return <Analytics />
}
