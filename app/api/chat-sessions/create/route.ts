import { NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { generateText } from "ai"
import { createClient } from "@supabase/supabase-js"
import { readAndVerifyDid } from "@/lib/server/did"
import { supabaseAdmin } from "@/lib/supabase"

const MODEL = "deepseek/deepseek-v3.2"

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

async function getUserFromAuth(req: NextRequest) {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) return null

    const token = authHeader.slice(7)
    if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
        return null
    }

    const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )

    const {
        data: { user },
        error,
    } = await supabaseClient.auth.getUser(token)
    if (error || !user) return null
    return user
}

function cleanTopic(raw: string): string {
    return (
        raw
            .replace(/^["'“”‘’]+/, "")
            .replace(/["'“”‘’]+$/, "")
            .replace(/[.。!?！？:：;；]+$/g, "")
            .replace(/\s+/g, " ")
            .trim()
    )
}

async function generateTopicFromQuestion(
    question: string,
    abortSignal?: AbortSignal,
): Promise<string> {
    const system = `You create a descriptive session topic from the user's first message.

Rules:
- Output ONLY the topic phrase. No quotes. No markdown. No punctuation at the end.
- Length: 3–12 words (or equivalent length in non-spaced languages like Thai).
- Be descriptive enough that the user can distinguish this session from others.
- Match the user's language.
- Be specific and calm (not clickbait).
`

    const prompt = `User's first message:
${question}

Return a clear, descriptive session topic now.`

    const result = await generateText({
        model: MODEL,
        temperature: 0.2,
        system,
        prompt,
        abortSignal,
    })

    const topic = cleanTopic(result.text ?? "")
    return topic || cleanTopic(question)
}

export async function POST(req: NextRequest) {
    try {
        throwIfAborted(req.signal)
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "SUPABASE_NOT_CONFIGURED" },
                { status: 500 }
            )
        }

        const did = await readAndVerifyDid()
        if (!did) return NextResponse.json({ error: "NO_DID" }, { status: 400 })

        const body = await req.json()
        throwIfAborted(req.signal)
        const requestedId = (body?.id ?? "").toString().slice(0, 32).trim()
        const question = (body?.question ?? "").toString()
        const verifiedUser = await getUserFromAuth(req)
        const ownerUserId = verifiedUser?.id ?? null
        const rawMessages = Array.isArray(body?.messages)
            ? body.messages
            : []
        const messages =
            rawMessages.length > 0
                ? rawMessages
                : question
                  ? [
                        {
                            id: `user-${Date.now()}`,
                            role: "user",
                            text: question,
                        },
                    ]
                  : []
        const decision = typeof body?.decision === "object" ? body.decision : null

        if (!question || messages.length === 0) {
            return NextResponse.json(
                { error: "MISSING_FIELDS" },
                { status: 400 }
            )
        }

        let topic = question
        try {
            topic = await generateTopicFromQuestion(question, req.signal)
        } catch {
            topic = cleanTopic(question)
        }
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
