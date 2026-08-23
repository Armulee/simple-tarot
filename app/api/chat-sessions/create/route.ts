import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { readAndVerifyDid } from "@/lib/server/did"
import {
    sanitizeMessagesForPersistence,
    sanitizePromptForPersistence,
} from "@/lib/privacy/prompt-redaction"
import { supabaseAdmin } from "@/lib/supabase"
import { normalizeOriginContext } from "@/lib/chat/origin-context"
import { threadTitleFromQuestion } from "@/lib/chat/thread-title"

function isAbortError(error: unknown) {
    return (
        error instanceof Error &&
        (error.name === "AbortError" || error.message === "REQUEST_ABORTED")
    )
}

function throwIfAborted(signal: AbortSignal) {
    if (signal.aborted) {
        const error = new Error("REQUEST_ABORTED")
        error.name = "AbortError"
        throw error
    }
}

export async function POST(req: NextRequest) {
    try {
        throwIfAborted(req.signal)
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "SUPABASE_NOT_CONFIGURED" },
                { status: 500 },
            )
        }

        const did = await readAndVerifyDid()
        if (!did) return NextResponse.json({ error: "NO_DID" }, { status: 400 })

        const body = await req.json()
        throwIfAborted(req.signal)
        const requestedId = (body?.id ?? "").toString().slice(0, 32).trim()
        const question = sanitizePromptForPersistence(
            (body?.question ?? "").toString(),
        )
        const ownerUserId: string | null =
            typeof body?.user_id === "string" && body.user_id
                ? body.user_id
                : null
        const rawMessages = Array.isArray(body?.messages) ? body.messages : []
        const messages =
            rawMessages.length > 0
                ? sanitizeMessagesForPersistence(rawMessages)
                : question
                  ? [
                        {
                            id: `user-${Date.now()}`,
                            role: "user",
                            text: question,
                        },
                    ]
                  : []
        const decision =
            typeof body?.decision === "object" ? body.decision : null
        const originContext = normalizeOriginContext(body?.originContext)

        // An empty session is the normal case now: the room opens with the
        // fortune teller speaking, so there is no question to record yet. It
        // gets its title from the first thing the person asks (see the PATCH
        // handler).
        const topic = question ? threadTitleFromQuestion(question) : null
        throwIfAborted(req.signal)

        const sessionId = requestedId || nanoid(12)
        let attempts = 0
        let finalId = sessionId
        while (attempts < 5) {
            throwIfAborted(req.signal)
            const { data: existing } = await supabaseAdmin
                .from("chat_sessions")
                .select("id")
                .eq("id", finalId)
                .maybeSingle()

            if (!existing) break
            finalId = nanoid(12)
            attempts++
        }

        throwIfAborted(req.signal)
        const { error } = await supabaseAdmin.from("chat_sessions").insert({
            id: finalId,
            did,
            owner_user_id: ownerUserId,
            question,
            topic,
            messages,
            decision,
            origin_context: originContext,
            show_insufficient_stars: body?.showInsufficientStars ?? false,
            show_card_draw: body?.showCardDraw ?? false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ id: finalId })
    } catch (e: unknown) {
        if (isAbortError(e)) {
            return new NextResponse(null, { status: 499 })
        }
        const message = e instanceof Error ? e.message : "INTERNAL_ERROR"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
