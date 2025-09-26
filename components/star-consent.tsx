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
                <DialogContent className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 relative overflow-hidden max-w-lg w-[92vw] border border-yellow-400/20 bg-gradient-to-br from-[#0a0a1a]/95 via-[#0d0b1f]/90 to-[#0a0a1a]/95 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(234,179,8,0.35)]'>
                    {/* Deep-space stars background */}
                    <div className='pointer-events-none absolute inset-0 opacity-40'>
                        <div className='cosmic-stars-layer-3' />
                        <div className='cosmic-stars-layer-4' />
                        <div className='cosmic-stars-layer-5' />
                    </div>
                    {/* Golden aura behind dialog */}
                    <div className='pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-gradient-to-br from-yellow-300/25 via-yellow-500/15 to-transparent blur-3xl animate-pulse' />
                    <div className='pointer-events-none absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-gradient-to-tl from-yellow-400/20 via-yellow-600/10 to-transparent blur-[100px] animate-pulse' style={{ animationDelay: "0.8s" }} />
                    <DialogHeader>
                        <DialogTitle className='text-yellow-300 font-serif text-xl'>Introducing Star Currency</DialogTitle>
                        <DialogDescription className='text-white/85'>
                            Stars let you reveal AI interpretations and unlock features. With your consent, we create an anonymous device ID to securely store and sync your star balance and hourly refills in our database, and remember your preferences.
                        </DialogDescription>
                    </DialogHeader>
                    <div className='text-xs text-white/70 mb-3'>Read our <Link href='/privacy-policy' className='underline text-yellow-300 hover:text-yellow-200'>Privacy Policy</Link>.</div>
                    <div className='flex gap-3 justify-end'>
                        <button onClick={decline} className='px-3 py-2 rounded-md border border-white/20 text-white hover:bg-white/10'>Decline</button>
                        <button onClick={accept} className='px-3 py-2 rounded-md bg-gradient-to-r from-yellow-400 to-yellow-600 text-black border border-yellow-500/40 hover:from-yellow-300 hover:to-yellow-500 shadow-[0_12px_30px_-10px_rgba(234,179,8,0.45)]'>Accept</button>
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

