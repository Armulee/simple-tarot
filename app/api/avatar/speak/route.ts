import { NextResponse } from "next/server"

import { getUserFromBearer } from "@/lib/server/auth"
import { speak, stopSession, HeygenError } from "@/lib/heygen"
import { getSession, markSpoke, endSession } from "@/lib/wishes"
import { generateAvatarReading } from "@/lib/avatar/reading"

export const runtime = "nodejs"

/**
 * POST — generate a reading with OUR LLM and have the avatar speak it live.
 *
 * Body: { sessionId, question }
 *
 * Order matters for the gating contract:
 *   1. generate the reading text (our model),
 *   2. send it to HeyGen to speak,
 *   3. ONLY THEN mark the credit consumed (markSpoke).
 * If anything fails before step 2 succeeds, we end the session, which refunds
 * the free reveal / wish (it was never actually used).
 */
export async function POST(req: Request) {
    const user = await getUserFromBearer(req)
    if (!user) {
        return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 })
    }

    let body: { sessionId?: string; question?: string }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 })
    }

    const sessionId = typeof body.sessionId === "string" ? body.sessionId : ""
    const question = (typeof body.question === "string" ? body.question : "").trim().slice(0, 500)
    if (!sessionId || !question) {
        return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 })
    }

    const session = await getSession(sessionId)
    if (!session || session.userId !== user.id) {
        return NextResponse.json({ error: "SESSION_NOT_FOUND" }, { status: 404 })
    }
    if (session.status !== "active") {
        return NextResponse.json({ error: "SESSION_ENDED" }, { status: 409 })
    }
    if (!session.heygenToken) {
        return NextResponse.json({ error: "SESSION_NOT_READY" }, { status: 409 })
    }

    // 1. Our LLM authors the reading. Free reveal ends on an in-character
    //    closing line inviting a wish; the reading itself is always complete.
    let reading: Awaited<ReturnType<typeof generateAvatarReading>>
    try {
        reading = await generateAvatarReading({
            question,
            closing: session.mode === "free",
        })
    } catch (error) {
        console.error("[avatar/speak] reading generation failed:", error)
        // Nothing was spoken — release and refund.
        await safeEndAndRefund(session.heygenToken, sessionId)
        return NextResponse.json({ error: "READING_FAILED" }, { status: 502 })
    }

    // 2. Speak it live over WebRTC.
    try {
        await speak({ token: session.heygenToken, sessionId, text: reading.text })
    } catch (error) {
        if (error instanceof HeygenError) {
            console.error("[avatar/speak] HeyGen speak failed:", error.status, error.message)
        } else {
            console.error("[avatar/speak] unexpected speak error:", error)
        }
        // Avatar never spoke → do NOT burn the credit.
        await safeEndAndRefund(session.heygenToken, sessionId)
        return NextResponse.json({ error: "SPEAK_FAILED" }, { status: 502 })
    }

    // 3. The reveal happened — consume the credit.
    try {
        await markSpoke(sessionId)
    } catch (error) {
        console.error("[avatar/speak] markSpoke failed:", error)
    }

    return NextResponse.json({
        text: reading.text,
        card: { name: reading.card.name, isReversed: reading.card.isReversed },
        mode: session.mode,
        // Free reveal = exactly one spoken reading, then close.
        closeAfter: session.mode === "free",
    })
}

async function safeEndAndRefund(token: string | null, sessionId: string) {
    if (token) {
        try {
            await stopSession({ token, sessionId })
        } catch {
            /* best effort */
        }
    }
    try {
        await endSession(sessionId) // auto-refunds because spoke = false
    } catch {
        /* best effort */
    }
}
