"use client"

import { useEffect, useState } from "react"
import {
    getAvailabilityCountdown,
    formatAvailabilityCountdown,
    type AvailabilityCountdown,
} from "@/lib/roadmap"

const TICK_INTERVAL_MS = 1000

export function useAvailabilityCountdown() {
    const [countdown, setCountdown] = useState<AvailabilityCountdown | null>(() =>
        getAvailabilityCountdown()
    )

    useEffect(() => {
        if (typeof window === "undefined") return
        const interval = window.setInterval(() => {
            setCountdown(getAvailabilityCountdown())
        }, TICK_INTERVAL_MS)
        return () => window.clearInterval(interval)
    }, [])

    return {
        countdown,
        label: formatAvailabilityCountdown(countdown),
    }
}
