import { NextRequest, NextResponse } from "next/server"
import {
    sanitizeMessagesForPersistence,
    sanitizePromptForPersistence,
} from "@/lib/privacy/prompt-redaction"
import { supabase, supabaseAdmin } from "@/lib/supabase"
import { readAndVerifyDid } from "@/lib/server/did"
import {
    getUserFromAuthHeader,
    resolveSessionAuth,
} from "@/lib/chat/session-access"

export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: rawId } = await context.params
        const id = (rawId ?? "").toString().slice(0, 32)
        if (!id) return NextResponse.json({ error: "BAD_ID" }, { status: 400 })

        const { data, error } = await supabase
            .from("chat_sessions")
            .select("id, question, topic, messages, decision, show_insufficient_stars, show_card_draw, created_at, updated_at")
            .eq("id", id)
            .maybeSingle()

        if (error) return NextResponse.json({ error: error.message }, { status: 400 })
        if (!data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })

        return NextResponse.json({ data })
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "INTERNAL_ERROR"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "SUPABASE_NOT_CONFIGURED" },
                { status: 500 }
            )
        }

        const { id: rawId } = await context.params
        const id = (rawId ?? "").toString().slice(0, 32)
        if (!id) return NextResponse.json({ error: "BAD_ID" }, { status: 400 })

        // Only the owner (auth or matching did) or an explicitly granted user
        // can mutate a session.
        const resolved = await resolveSessionAuth(req, id)
        if (!resolved.ok) {
            return NextResponse.json(
                { error: resolved.error },
                { status: resolved.status },
            )
        }
        if (!resolved.auth.canCompose) {
            return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
        }

        const body = await req.json()
        const update: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        }

        if (typeof body?.question === "string") {
            update.question = sanitizePromptForPersistence(body.question)
        }
        if (typeof body?.topic === "string") {
            update.topic = body.topic
        }
        if (Array.isArray(body?.messages)) {
            update.messages = sanitizeMessagesForPersistence(body.messages)
        }
        if (body?.decision && typeof body.decision === "object") {
            update.decision = body.decision
        }
        if (typeof body?.showInsufficientStars === "boolean") {
            update.show_insufficient_stars = body.showInsufficientStars
        }
        if (typeof body?.showCardDraw === "boolean") {
            update.show_card_draw = body.showCardDraw
        }

        const { error } = await supabaseAdmin
            .from("chat_sessions")
            .update(update)
            .eq("id", id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ ok: true })
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "INTERNAL_ERROR"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "SUPABASE_NOT_CONFIGURED" },
                { status: 500 }
            )
        }

        // Allow deletion by signed-in owner or the same DID used to create it.
        const user = await getUserFromAuthHeader(req)
        const did = await readAndVerifyDid()
        if (!user && !did) {
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
        }

        const { id: rawId } = await context.params
        const id = (rawId ?? "").toString().slice(0, 32)
        if (!id) return NextResponse.json({ error: "BAD_ID" }, { status: 400 })

        // First verify the user owns this chat session
        const { data: session, error: fetchError } = await supabaseAdmin
            .from("chat_sessions")
            .select("id, owner_user_id, did")
            .eq("id", id)
            .maybeSingle()

        if (fetchError) {
            return NextResponse.json({ error: fetchError.message }, { status: 400 })
        }

        if (!session) {
            return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
        }

        const ownedByUser = !!user && session.owner_user_id === user.id
        const ownedByDid = !!did && session.did === did

        // Check ownership
        if (!ownedByUser && !ownedByDid) {
            return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
        }

        // Delete the chat session
        const { error: deleteError } = await supabaseAdmin
            .from("chat_sessions")
            .delete()
            .eq("id", id)

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 400 })
        }

        return NextResponse.json({ ok: true })
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "INTERNAL_ERROR"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
