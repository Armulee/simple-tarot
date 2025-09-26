"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import Link from "next/link"

type ConsentChoice = "accepted" | "declined" | null

const CONSENT_KEY = "cookie-consent-v1"

type StarConsentContextType = {
    choice: ConsentChoice
    open: boolean
    show: () => void
    accept: () => void
    decline: () => void
}

const StarConsentContext = createContext<StarConsentContextType | undefined>(undefined)

export function useStarConsent() {
    const ctx = useContext(StarConsentContext)
    if (!ctx) throw new Error("useStarConsent must be used within StarConsentProvider")
    return ctx
}

export function StarConsentProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const [choice, setChoice] = useState<ConsentChoice>(null)

    useEffect(() => {
        if (typeof window === "undefined") return
        try {
            const saved = window.localStorage.getItem(CONSENT_KEY)
            if (saved === "accepted" || saved === "declined") setChoice(saved)
        } catch {}
    }, [])

    const show = useCallback(() => {
        setOpen(true)
    }, [])

    const accept = useCallback(() => {
        try { window.localStorage.setItem(CONSENT_KEY, "accepted") } catch {}
        setChoice("accepted")
        setOpen(false)
        // Emit a custom event for listeners (e.g., stars-context) to initialize
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: { choice: "accepted" } }))
        }
    }, [])

    const decline = useCallback(() => {
        try { window.localStorage.setItem(CONSENT_KEY, "declined") } catch {}
        setChoice("declined")
        setOpen(false)
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: { choice: "declined" } }))
        }
    }, [])

    const value = useMemo<StarConsentContextType>(() => ({ choice, open, show, accept, decline }), [choice, open, show, accept, decline])

    return (
        <StarConsentContext.Provider value={value}>
            {children}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className='bg-black/90 border-white/10 max-w-lg'>
                    <DialogHeader>
                        <DialogTitle className='text-white'>Introducing Star Currency</DialogTitle>
                        <DialogDescription className='text-white/80'>
                            Stars are used to reveal interpretations and unlock features. Anonymous device IDs let us store and sync your star balance and refill status in our database and remember preferences. We need your cookie consent to create this device ID.
                        </DialogDescription>
                    </DialogHeader>
                    <div className='text-xs text-white/70 mb-3'>Read our <Link href='/privacy-policy' className='underline hover:text-white'>Privacy Policy</Link>.</div>
                    <div className='flex gap-3 justify-end'>
                        <button onClick={decline} className='px-3 py-2 rounded-md border border-white/20 text-white hover:bg-white/10'>Decline</button>
                        <button onClick={accept} className='px-3 py-2 rounded-md bg-white text-black hover:bg-white/90'>Accept</button>
                    </div>
                </DialogContent>
            </Dialog>
        </StarConsentContext.Provider>
    )
}

export function hasCookieConsent(): boolean {
    if (typeof window === "undefined") return false
    try { return window.localStorage.getItem(CONSENT_KEY) === "accepted" } catch { return false }
}

