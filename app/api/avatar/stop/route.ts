import { NextResponse } from "next/server"

import { getUserFromBearer } from "@/lib/server/auth"
import { stopSession } from "@/lib/heygen"
import { getSession, endSession } from "@/lib/wishes"

export const runtime = "nodejs"

/**
 * POST — force-close a session server-side.
 *
 * Body: { sessionId }
 *
 * Called when: the reveal is done, the paid minute is up (client countdown
 * hits zero), or the user leaves. endSession refunds the free reveal / wish if
 * the avatar never actually spoke; otherwise the credit stays consumed.
 */
export async function POST(req: Request) {
    const user = await getUserFromBearer(req)
    if (!user) {
        return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 })
    }

    let body: { sessionId?: string }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 })
    }

    const sessionId = typeof body.sessionId === "string" ? body.sessionId : ""
    if (!sessionId) {
        return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 })
    }

    const session = await getSession(sessionId)
    if (!session || session.userId !== user.id) {
        // Idempotent: nothing to close, treat as success.
        return NextResponse.json({ ended: true, refunded: false })
    }

    if (session.heygenToken) {
        try {
            await stopSession({ token: session.heygenToken, sessionId })
        } catch {
            /* best effort — still settle the DB side below */
        }
    }

    const result = await endSession(sessionId)
    return NextResponse.json({
        ended: result.ended,
        refunded: result.refunded,
        mode: result.mode,
    })
}
