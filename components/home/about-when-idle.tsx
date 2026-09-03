"use client"

import type { ReactNode } from "react"
import { usePendingMessage } from "@/contexts/pending-message-context"

/**
 * Hides the About sections while a message is being sent.
 *
 * The home page swaps its hero for the sent message and a "consulting" badge,
 * and marketing copy sitting under that reads as leftover page furniture during
 * what should be a single, focused hand-off into the new session.
 */
export function AboutWhenIdle({ children }: { children: ReactNode }) {
    const { pending } = usePendingMessage()
    if (pending) return null
    return <>{children}</>
}
