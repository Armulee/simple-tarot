/**
 * Opening a chat room in one place.
 *
 * Both entry points into the reading — the landing CTA and the navbar "+"
 * (new thread) button — go through here so the room-opening contract lives in
 * a single file.
 *
 * The room is created EMPTY: the fortune teller speaks first once it loads, so
 * there is no seeded question and nothing for the visitor to compose.
 */

export type StartAstraSessionArgs = {
    /**
     * Optional seed message. Left unset for a normal reading; used only when a
     * caller already has the person's question in hand.
     */
    openingQuestion?: string
    /** Supabase user id when signed in; anonymous sessions bind to the DID cookie. */
    userId?: string | null
    signal?: AbortSignal
}

/** Creates a fresh chat session and resolves its id. */
export async function startAstraSession({
    openingQuestion,
    userId,
    signal,
}: StartAstraSessionArgs): Promise<string> {
    const response = await fetch("/api/chat-sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
            question: openingQuestion ?? "",
            user_id: userId ?? null,
        }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.id) {
        throw new Error("FAILED_TO_CREATE_SESSION")
    }
    return payload.id as string
}

/**
 * Most recent room for this device / account, or null when there is none.
 * Used by the landing redirect so a returning visitor lands back in the
 * conversation instead of on a marketing page.
 */
export async function findLatestAstraSession(
    accessToken?: string | null,
    signal?: AbortSignal,
): Promise<string | null> {
    try {
        const response = await fetch("/api/chat-sessions/latest", {
            signal,
            headers: accessToken
                ? { Authorization: `Bearer ${accessToken}` }
                : undefined,
        })
        if (!response.ok) return null
        const payload = await response.json().catch(() => null)
        return typeof payload?.id === "string" ? payload.id : null
    } catch {
        return null
    }
}
