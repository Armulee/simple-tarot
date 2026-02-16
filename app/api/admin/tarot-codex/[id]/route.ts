import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export const dynamic = "force-dynamic"

const UPDATABLE_COLUMNS = [
    "card_name",
    "meaning_general",
    "reversed_meaning_general",
    "meaning_love",
    "reversed_meaning_love",
    "meaning_career",
    "reversed_meaning_career",
    "meaning_financial",
    "reversed_meaning_financial",
    "advice",
    "astrology",
    "timing",
    "yes_no",
] as const

async function requireAdmin(request: NextRequest) {
    if (!supabaseAdmin) {
        return NextResponse.json(
            { error: "SERVER_NOT_CONFIGURED" },
            { status: 500 }
        )
    }

    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const {
        data: { user },
        error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
    }

    const { data: adminRow, error: adminError } = await supabaseAdmin
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle()

    if (adminError || !adminRow) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
    }

    return null
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const err = await requireAdmin(request)
    if (err) return err

    const { id } = await params
    const idNum = parseInt(id, 10)
    if (isNaN(idNum) || idNum < 0) {
        return NextResponse.json({ error: "INVALID_ID" }, { status: 400 })
    }

    let body: Record<string, unknown>
    try {
        body = (await request.json()) as Record<string, unknown>
    } catch {
        return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    for (const col of UPDATABLE_COLUMNS) {
        if (col in body) {
            const val = body[col]
            if (val === null || typeof val === "string") {
                updates[col] = val
            }
        }
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: "NO_UPDATES" }, { status: 400 })
    }

    try {
        const { data, error } = await supabaseAdmin!
            .from("tarot_codex")
            .update(updates)
            .eq("id", idNum)
            .select()
            .single()

        if (error) {
            console.error("[admin-tarot-codex] PATCH error:", error)
            return NextResponse.json(
                { error: "FAILED_TO_UPDATE" },
                { status: 500 }
            )
        }

        return NextResponse.json(data, { status: 200 })
    } catch (e) {
        console.error("[admin-tarot-codex] PATCH failed", e)
        return NextResponse.json(
            { error: "FAILED_TO_UPDATE" },
            { status: 500 }
        )
    }
}
