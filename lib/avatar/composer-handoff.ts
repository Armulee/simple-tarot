/**
 * Client helper for handing a composer question off to the avatar page.
 *
 * When the composer's avatar/chat toggle is set to "avatar", submitting a
 * question persists it as a session (the same `chat_sessions` store the text
 * chat uses) and the caller navigates to `/avatar/{id}`, where the avatar opens
 * that question as its initial message — mirroring how the text chat creates a
 * session reference in the URL.
 */

/** Generate a short session reference, matching the chat composer's scheme. */
export function newComposerSessionId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(12)))
        .map((value) => value.toString(36))
        .join("")
        .slice(0, 12)
}

/**
 * Persist the initial question as a session row. Returns true on success.
 * Reuses /api/chat-sessions/create so the avatar handoff shares the chat
 * session store (re-readable, shareable, and loadable by reference).
 */
export async function persistInitialQuestion(opts: {
    id: string
    question: string
    userId: string | null
}): Promise<boolean> {
    try {
        const res = await fetch("/api/chat-sessions/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: opts.id,
                question: opts.question,
                user_id: opts.userId,
                messages: [
                    {
                        id: `user-${Date.now()}`,
                        role: "user",
                        text: opts.question,
                    },
                ],
            }),
        })
        const payload = await res.json().catch(() => null)
        return res.ok && Boolean(payload?.id)
    } catch {
        return false
    }
}
