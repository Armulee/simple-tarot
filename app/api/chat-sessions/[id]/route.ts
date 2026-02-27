import { NextRequest, NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase"
import { readAndVerifyDid } from "@/lib/server/did"
import { createClient } from "@supabase/supabase-js"

// Helper to get user from authorization header
async function getUserFromAuth(req: NextRequest) {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) return null
    
    const token = authHeader.slice(7)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return null
    }
    
    const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    const { data: { user }, error } = await supabaseClient.auth.getUser(token)
    if (error || !user) return null
    return user
}

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

        const did = await readAndVerifyDid()
        if (!did) return NextResponse.json({ error: "NO_DID" }, { status: 400 })

        const { id: rawId } = await context.params
        const id = (rawId ?? "").toString().slice(0, 32)
        if (!id) return NextResponse.json({ error: "BAD_ID" }, { status: 400 })

        const body = await req.json()
        const update: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        }

        if (typeof body?.question === "string") {
            update.question = body.question
        }
        if (typeof body?.topic === "string") {
            update.topic = body.topic
        }
        if (Array.isArray(body?.messages)) {
            update.messages = body.messages
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

        // Get user from auth header
        const user = await getUserFromAuth(req)
        if (!user) {
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
        }

        const { id: rawId } = await context.params
        const id = (rawId ?? "").toString().slice(0, 32)
        if (!id) return NextResponse.json({ error: "BAD_ID" }, { status: 400 })

        // First verify the user owns this chat session
        const { data: session, error: fetchError } = await supabaseAdmin
            .from("chat_sessions")
            .select("id, owner_user_id")
            .eq("id", id)
            .maybeSingle()

        if (fetchError) {
            return NextResponse.json({ error: fetchError.message }, { status: 400 })
        }

        if (!session) {
            return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
        }

        // Check ownership
        if (session.owner_user_id !== user.id) {
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
