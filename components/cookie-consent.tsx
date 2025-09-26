"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"

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
        <div className='fixed inset-0 z-[10000]'>
            {/* Interaction blocker */}
            <div className='absolute inset-0 bg-black/50' />

            {/* Bottom consent bar - fixed and requires action */}
            <div className='absolute left-0 right-0 bottom-0 m-0 md:m-4'>
                <div className='rounded-none md:rounded-xl border-t md:border border-white/15 bg-black/90 backdrop-blur-xl shadow-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
                    <div className='text-sm text-white/90 space-y-1'>
                        <p>
                            We need your consent to use cookies on this device. Cookies are used to create an anonymous device ID so we can store and sync your star balance and refill status in our database, and remember your site preferences.
                        </p>
                        <p className='text-xs text-white/70'>
                            Read more in our <Link href='/privacy-policy' className='underline hover:text-white'>Privacy Policy</Link>.
                        </p>
                    </div>
                    <div className='flex gap-3 justify-end'>
                        <button
                            onClick={accept}
                            className='px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-white/90'
                        >
                            Accept and continue
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

