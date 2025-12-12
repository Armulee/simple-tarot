"use client"

import { useEffect } from "react"
import { toast } from "sonner"

const STORAGE_KEY = "beta-announcement-seen"

export function BetaAnnouncementModal() {
    useEffect(() => {
        // Check if user has seen the announcement
        const hasSeen = localStorage.getItem(STORAGE_KEY)
        if (!hasSeen) {
            // Small delay to ensure smooth page load
            setTimeout(() => {
                const toastId = toast.warning("Beta Testing", {
                    description:
                        "We're in beta! You may encounter bugs and some features are still in development.",
                    duration: 8000,
                    closeButton: true,
                    onDismiss: () => {
                        localStorage.setItem(STORAGE_KEY, "true")
                    },
                    onAutoClose: () => {
                        localStorage.setItem(STORAGE_KEY, "true")
                    },
                })
            }, 500)
        }
    }, [])

    return null
}
