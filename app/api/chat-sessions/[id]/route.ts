import { NextRequest, NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase"
import { readAndVerifyDid } from "@/lib/server/did"

const MAX_QUESTION_LENGTH = 500
const MAX_MESSAGE_COUNT = 200
const MAX_TOPIC_LENGTH = 80

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
            .select("id, question, topic, messages, decision, created_at, updated_at")
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
            update.question = body.question.slice(0, MAX_QUESTION_LENGTH)
        }
        if (typeof body?.topic === "string") {
            update.topic = body.topic.slice(0, MAX_TOPIC_LENGTH)
        }
        if (Array.isArray(body?.messages)) {
            update.messages = body.messages.slice(0, MAX_MESSAGE_COUNT)
        }
        if (body?.decision && typeof body.decision === "object") {
            update.decision = body.decision
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
