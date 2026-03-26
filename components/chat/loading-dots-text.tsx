"use client"

import { useEffect, useState } from "react"

/**
 * Animated "..." suffix isolated from parent state so ChatSession does not
 * re-render every tick (avoids effect / state interaction bugs).
 */
export function LoadingDotsText({
    active,
    getText,
}: {
    active: boolean
    getText: (dotCount: number) => string
}) {
    const [dotCount, setDotCount] = useState(1)

    useEffect(() => {
        if (!active) {
            setDotCount((p) => (p === 1 ? p : 1))
            return
        }
        const id = window.setInterval(() => {
            setDotCount((prev) => (prev >= 3 ? 1 : prev + 1))
        }, 1000)
        return () => window.clearInterval(id)
    }, [active])

    return <>{getText(dotCount)}</>
}
