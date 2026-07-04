import { NextResponse } from "next/server"

import { getUserFromBearer } from "@/lib/server/auth"
import {
    createSessionToken,
    newSession,
    stopSession,
    HeygenConcurrencyError,
    HeygenError,
} from "@/lib/heygen"
import {
    getEntitlement,
    startSession,
    attachHeygenToken,
} from "@/lib/wishes"

export const runtime = "nodejs"

const FREE_DURATION_SECONDS = 90 // one complete reveal, never cut off mid-sentence
const PAID_DURATION_SECONDS = 60 // 1 wish = 1 minute

function avatarConfigured(): boolean {
    return Boolean(process.env.HEYGEN_API_KEY && process.env.HEYGEN_AVATAR_ID)
}

/**
 * GET — entitlement status for the /avatar page's default-mode logic.
 * Returns whether the avatar is configured, the free-reveal flag, and the wish
 * balance. Does NOT start a session or charge anything.
 */
export async function GET(req: Request) {
    const user = await getUserFromBearer(req)
    if (!user) {
        return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 })
    }
    try {
        const ent = await getEntitlement(user.id)
        return NextResponse.json({
            configured: avatarConfigured(),
            freeRevealUsed: ent.freeRevealUsed,
            wishBalance: ent.wishBalance,
            eligible: !ent.freeRevealUsed || ent.wishBalance >= 1,
        })
    } catch (error) {
        console.error("[avatar/session] status error:", error)
        return NextResponse.json({ error: "STATUS_FAILED" }, { status: 500 })
    }
}

/**
 * POST — start a real-time avatar session.
 *
 * 1. Verify auth.
 * 2. Mint a HeyGen session (token + LiveKit url/access_token). The API key
 *    never leaves the server; only the short-lived token/url go to the client.
 * 3. Atomically gate + reserve (free reveal or 1 wish) keyed to the session id.
 *    If ineligible, the just-created HeyGen session is torn down so nothing
 *    leaks, and no credit is consumed.
 */
export async function POST(req: Request) {
    const user = await getUserFromBearer(req)
    if (!user) {
        return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 })
    }

    if (!avatarConfigured()) {
        return NextResponse.json({ error: "AVATAR_NOT_CONFIGURED" }, { status: 503 })
    }

    // Decide the intended duration from the current entitlement. The authoritative
    // atomic decision happens in startSession below; this only sizes HeyGen's
    // own hard cap so a paid minute can't overrun.
    let intendedFree = false
    try {
        const ent = await getEntitlement(user.id)
        if (!ent.freeRevealUsed) {
            intendedFree = true
        } else if (ent.wishBalance < 1) {
            return NextResponse.json(
                { error: "NO_WISHES", wishBalance: ent.wishBalance },
                { status: 402 },
            )
        }
    } catch (error) {
        console.error("[avatar/session] entitlement read failed:", error)
        return NextResponse.json({ error: "STATUS_FAILED" }, { status: 500 })
    }

    const durationSeconds = intendedFree ? FREE_DURATION_SECONDS : PAID_DURATION_SECONDS

    // Mint the HeyGen session.
    let token: string
    let session: Awaited<ReturnType<typeof newSession>>
    try {
        token = await createSessionToken()
        session = await newSession({ token, durationSeconds })
    } catch (error) {
        if (error instanceof HeygenConcurrencyError) {
            return NextResponse.json({ error: "CONCURRENCY_LIMIT" }, { status: 503 })
        }
        if (error instanceof HeygenError) {
            console.error("[avatar/session] HeyGen error:", error.status, error.message)
            return NextResponse.json({ error: "HEYGEN_FAILED" }, { status: 502 })
        }
        console.error("[avatar/session] unexpected error:", error)
        return NextResponse.json({ error: "HEYGEN_FAILED" }, { status: 502 })
    }

    // Atomically gate + reserve. Keyed to the real HeyGen session id.
    const reserve = await startSession({
        userId: user.id,
        sessionId: session.sessionId,
        durationSeconds,
    })

    if (!reserve.ok) {
        // We reserved nothing — tear the HeyGen session down so it doesn't count
        // against the concurrency limit.
        try {
            await stopSession({ token, sessionId: session.sessionId })
        } catch {
            /* best effort */
        }
        const status =
            reserve.reason === "NO_WISHES"
                ? 402
                : reserve.reason === "SESSION_ALREADY_ACTIVE"
                  ? 409
                  : 500
        return NextResponse.json(
            { error: reserve.reason, wishBalance: reserve.wishBalance },
            { status },
        )
    }

    // Persist the HeyGen token so speak/stop (separate requests) can authorize.
    try {
        await attachHeygenToken(session.sessionId, token)
    } catch (error) {
        console.error("[avatar/session] failed to persist token:", error)
    }

    return NextResponse.json({
        sessionId: session.sessionId,
        accessToken: session.accessToken,
        url: session.url,
        mode: reserve.mode,
        durationSeconds,
        wishBalance: reserve.wishBalance,
    })
}
