/**
 * Browser-side typed fetchers for the /avatar API.
 *
 * Every call carries the Supabase access token as a Bearer header (the same
 * pattern the rest of the app uses, e.g. components/checkout/index.tsx). The
 * HeyGen API key is NEVER referenced here — the server mints a short-lived
 * LiveKit token/url that these calls return.
 */

import { supabase } from "@/lib/supabase"

export type AvatarStatus = {
    configured: boolean
    freeRevealUsed: boolean
    wishBalance: number
    eligible: boolean
}

export type SessionInfo = {
    sessionId: string
    accessToken: string
    url: string
    mode: "free" | "paid"
    durationSeconds: number
    wishBalance: number
}

export type SpokenReading = {
    text: string
    card: { name: string; isReversed: boolean }
    mode: "free" | "paid"
    closeAfter: boolean
}

export class AvatarApiError extends Error {
    code: string
    status: number
    constructor(code: string, status: number) {
        super(code)
        this.name = "AvatarApiError"
        this.code = code
        this.status = status
    }
}

async function authHeaders(): Promise<Record<string, string>> {
    const {
        data: { session },
    } = await supabase.auth.getSession()
    const headers: Record<string, string> = { "content-type": "application/json" }
    if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
    }
    return headers
}

async function parseError(res: Response): Promise<never> {
    let code = "REQUEST_FAILED"
    try {
        const body = await res.json()
        if (body?.error) code = String(body.error)
    } catch {
        /* ignore */
    }
    throw new AvatarApiError(code, res.status)
}

export async function fetchAvatarStatus(): Promise<AvatarStatus> {
    const res = await fetch("/api/avatar/session", {
        method: "GET",
        headers: await authHeaders(),
    })
    if (!res.ok) await parseError(res)
    return res.json()
}

export async function startAvatarSession(): Promise<SessionInfo> {
    const res = await fetch("/api/avatar/session", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({}),
    })
    if (!res.ok) await parseError(res)
    return res.json()
}

export async function speakReading(
    sessionId: string,
    question: string,
): Promise<SpokenReading> {
    const res = await fetch("/api/avatar/speak", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ sessionId, question }),
    })
    if (!res.ok) await parseError(res)
    return res.json()
}

export async function stopAvatarSession(sessionId: string): Promise<void> {
    try {
        await fetch("/api/avatar/stop", {
            method: "POST",
            headers: await authHeaders(),
            body: JSON.stringify({ sessionId }),
            // keepalive so a stop fired during page unload still reaches the server.
            keepalive: true,
        })
    } catch {
        /* best effort */
    }
}
