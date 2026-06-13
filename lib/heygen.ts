/**
 * Server-side HeyGen LiveAvatar (Lite / bring-your-own-LLM) REST client.
 *
 * This module is the ONLY place that touches HEYGEN_API_KEY. It runs on the
 * server exclusively — never import it into a client component. The browser
 * connects to the live video itself over WebRTC (LiveKit) using the short
 * lived `access_token` + `url` we mint here; the API key never leaves the
 * server.
 *
 * Flow (see the /avatar feature doc):
 *   1. createSessionToken()  → POST /v1/streaming.create_token  (uses API key)
 *   2. newSession()          → POST /v1/streaming.new           (uses token)
 *   3. speak()               → POST /v1/streaming.task          (uses token)
 *   4. stopSession()         → POST /v1/streaming.stop          (uses token)
 *
 * NOTE: HeyGen iterates on their LiveAvatar API. The endpoint paths and field
 * names below match the v1 streaming API as documented at
 * https://docs.heygen.com. If HeyGen renames things, this is the single file
 * to update — the routes and client treat it as an opaque client.
 */

const HEYGEN_BASE_URL = process.env.HEYGEN_BASE_URL ?? "https://api.heygen.com"

export class HeygenError extends Error {
    status: number
    code?: string
    constructor(message: string, status: number, code?: string) {
        super(message)
        this.name = "HeygenError"
        this.status = status
        this.code = code
    }
}

/** Thrown when the HeyGen plan's concurrency limit is reached. */
export class HeygenConcurrencyError extends HeygenError {
    constructor(message = "HeyGen concurrency limit reached") {
        super(message, 429, "CONCURRENCY_LIMIT")
        this.name = "HeygenConcurrencyError"
    }
}

function requireApiKey(): string {
    const key = process.env.HEYGEN_API_KEY
    if (!key) {
        throw new HeygenError("HEYGEN_API_KEY is not configured", 500, "NO_API_KEY")
    }
    return key
}

type HeygenResponse<T> = {
    code?: number
    message?: string
    data?: T
    error?: { code?: string; message?: string } | string | null
}

async function heygenFetch<T>(
    path: string,
    body: Record<string, unknown>,
    auth: { apiKey?: string; token?: string },
): Promise<T> {
    const headers: Record<string, string> = {
        "content-type": "application/json",
        accept: "application/json",
    }
    // create_token authenticates with the account API key; every subsequent
    // call authenticates with the per-session token returned by create_token.
    if (auth.token) headers["authorization"] = `Bearer ${auth.token}`
    if (auth.apiKey) headers["x-api-key"] = auth.apiKey

    const res = await fetch(`${HEYGEN_BASE_URL}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        cache: "no-store",
    })

    let json: HeygenResponse<T> | null = null
    try {
        json = (await res.json()) as HeygenResponse<T>
    } catch {
        // Non-JSON body (gateway error page, etc.)
    }

    if (!res.ok) {
        const code =
            (typeof json?.error === "object" && json?.error?.code) ||
            (json?.code ? String(json.code) : undefined)
        const message =
            (typeof json?.error === "object" && json?.error?.message) ||
            (typeof json?.error === "string" ? json.error : undefined) ||
            json?.message ||
            `HeyGen request failed (${res.status})`

        // HeyGen returns 400/429 with a concurrency-limit code when the plan's
        // simultaneous-session cap is hit. Surface it distinctly so the UI can
        // show a graceful "all readers are busy" message instead of hanging.
        if (
            res.status === 429 ||
            /concurrent|concurrency|limit/i.test(message) ||
            code === "concurrent_limit_reached"
        ) {
            throw new HeygenConcurrencyError(message)
        }
        throw new HeygenError(message, res.status, code)
    }

    if (!json?.data) {
        throw new HeygenError("HeyGen returned an empty response", 502)
    }
    return json.data
}

/** Step 1 — mint a short-lived session token from the account API key. */
export async function createSessionToken(): Promise<string> {
    const data = await heygenFetch<{ token: string }>(
        "/v1/streaming.create_token",
        {},
        { apiKey: requireApiKey() },
    )
    return data.token
}

export type NewSessionResult = {
    sessionId: string
    /** LiveKit access token the browser uses to join the room. */
    accessToken: string
    /** wss:// LiveKit URL the browser connects to. */
    url: string
    /** Server-enforced cap (seconds) HeyGen will honor for this session. */
    sessionDurationLimit?: number
}

/**
 * Step 2 — create a new streaming session bound to our custom avatar + cloned
 * voice. `durationSeconds` is sent as HeyGen's own hard cap so a paid minute
 * cannot overrun even if our own stop call is lost.
 */
export async function newSession(opts: {
    token: string
    durationSeconds: number
}): Promise<NewSessionResult> {
    const avatarId = process.env.HEYGEN_AVATAR_ID
    const voiceId = process.env.HEYGEN_VOICE_ID
    if (!avatarId) {
        throw new HeygenError("HEYGEN_AVATAR_ID is not configured", 500, "NO_AVATAR")
    }

    const data = await heygenFetch<{
        session_id: string
        access_token: string
        url: string
        session_duration_limit?: number
    }>(
        "/v1/streaming.new",
        {
            version: "v2",
            avatar_id: avatarId,
            quality: "high",
            video_encoding: "H264",
            // Lite mode: we never use HeyGen's LLM. We only ever send text to
            // speak (task_type "repeat"), so no knowledge base / STT is set.
            voice: voiceId
                ? {
                      voice_id: voiceId,
                      // ElevenLabs multilingual model so Thai is spoken clearly.
                      model: process.env.HEYGEN_VOICE_MODEL ?? "eleven_multilingual_v2",
                      rate: 1.0,
                  }
                : undefined,
            session_duration_limit: opts.durationSeconds,
        },
        { token: opts.token },
    )

    return {
        sessionId: data.session_id,
        accessToken: data.access_token,
        url: data.url,
        sessionDurationLimit: data.session_duration_limit,
    }
}

/**
 * Step 3 — make the avatar speak the given text live over WebRTC.
 * `task_type: "repeat"` = speak exactly this text (our LLM authored it); we
 * never ask HeyGen to generate anything.
 */
export async function speak(opts: {
    token: string
    sessionId: string
    text: string
}): Promise<void> {
    await heygenFetch(
        "/v1/streaming.task",
        {
            session_id: opts.sessionId,
            text: opts.text,
            task_type: "repeat",
            task_mode: "sync",
        },
        { token: opts.token },
    )
}

/** Step 4 — force-close the session server-side. */
export async function stopSession(opts: {
    token: string
    sessionId: string
}): Promise<void> {
    await heygenFetch(
        "/v1/streaming.stop",
        { session_id: opts.sessionId },
        { token: opts.token },
    )
}
