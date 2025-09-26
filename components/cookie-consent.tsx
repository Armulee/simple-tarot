"use client"

import React, { useEffect, useState } from "react"

const CONSENT_KEY = "cookie-consent-v1"

export function hasCookieConsent(): boolean {
    if (typeof window === "undefined") return false
    try {
        return window.localStorage.getItem(CONSENT_KEY) === "accepted"
    } catch {
        return false
    }
}

export default function CookieConsentOverlay() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (typeof window === "undefined") return
        try {
            const accepted = window.localStorage.getItem(CONSENT_KEY) === "accepted"
            setVisible(!accepted)
        } catch {
            setVisible(true)
        }
    }, [])

    const accept = () => {
        try {
            window.localStorage.setItem(CONSENT_KEY, "accepted")
        } catch {}
        setVisible(false)
        // Soft reload to allow cookie-based features to initialize
        if (typeof window !== "undefined") {
            setTimeout(() => window.location.reload(), 50)
        }
    }

    if (!visible) return null

    return (
        <div className='fixed inset-0 z-[10000] pointer-events-none'>
            {/* Bottom consent bar */}
            <div className='pointer-events-auto fixed left-0 right-0 bottom-0 m-4 rounded-xl border border-white/15 bg-black/80 backdrop-blur-xl shadow-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3'>
                <div className='text-sm text-white/90'>
                    We use cookies to remember your preferences and improve your experience. You must accept cookies to use this site.
                </div>
                <div className='flex gap-3'>
                    <button
                        onClick={accept}
                        className='px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-white/90'
                    >
                        Accept cookies
                    </button>
                </div>
            </div>

            {/* Interaction blocker */}
            <div className='absolute inset-0 bg-black/40' />
        </div>
    )
}

