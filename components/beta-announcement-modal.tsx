"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { Sparkle } from "lucide-react"

const STORAGE_KEY = "beta-announcement-seen"

export function BetaAnnouncementModal() {
    useEffect(() => {
        try {
            const hasSeen = localStorage.getItem(STORAGE_KEY)
            if (hasSeen) return

            // Small delay to ensure smooth page load
            setTimeout(() => {
                toast("We're in beta! You may encounter bugs and some features are still in development.", {
                    icon: <Sparkle className='h-4 w-4 text-yellow-300' />,
                    duration: 12000,
                    className:
                        "fixed bottom-6 inset-x-0 mx-auto z-[100] w-[92vw] max-w-md border border-yellow-400/20 bg-gradient-to-br from-[#0a0a1a]/95 via-[#0d0b1f]/90 to-[#0a0a1a]/95 text-white shadow-[0_10px_40px_-10px_rgba(234,179,8,0.35)]",
                })
            }, 500)

            // Mark as seen so this beta notice only shows once.
            localStorage.setItem(STORAGE_KEY, "true")
        } catch {
            // If localStorage is unavailable, fail silently.
        }
    }, [])

    return null
}
