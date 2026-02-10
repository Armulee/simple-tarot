"use client"

import { useEffect } from "react"
import { useStars } from "@/contexts/stars-context"

/**
 * Client component to refresh stars balance when success page loads
 * This ensures star balance is updated after purchase
 */
export function RefreshStarsOnSuccess() {
    const { initialized } = useStars()

    useEffect(() => {
        if (initialized && typeof window !== "undefined") {
            // Trigger stars refresh by dispatching event
            window.dispatchEvent(new CustomEvent("stars-balance-updated"))

            // Also trigger via BroadcastChannel if available
            if ("BroadcastChannel" in window) {
                const bc = new BroadcastChannel("stars-balance")
                bc.postMessage({ ts: Date.now() })
                bc.close()
            }
        }
    }, [initialized])

    return null
}
