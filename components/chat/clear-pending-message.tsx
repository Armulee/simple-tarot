"use client"

import { useEffect } from "react"
import { usePendingMessage } from "@/contexts/pending-message-context"

/**
 * Releases the carried-over home composer message once the real session is
 * rendered. Rendered by the session route rather than hooked into the chat
 * component so the hand-off stays in one small, obvious place.
 */
export function ClearPendingMessage({ sessionId }: { sessionId: string }) {
    const { pending, setPending } = usePendingMessage()
    const isMine = pending?.sessionId === sessionId

    useEffect(() => {
        // Only clear the message this session was opened with — never one that
        // a newer send has already put in its place.
        if (isMine) setPending(null)
    }, [isMine, setPending])

    return null
}
