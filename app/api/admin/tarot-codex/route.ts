import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export const dynamic = "force-dynamic"

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

export async function GET(request: NextRequest) {
    const err = await requireAdmin(request)
    if (err) return err

    try {
        const { data, error } = await supabaseAdmin!
            .from("tarot_codex")
            .select("*")
            .order("id", { ascending: true })

        if (error) {
            console.error("[admin-tarot-codex] GET error:", error)
            return NextResponse.json(
                { error: "FAILED_TO_LOAD" },
                { status: 500 }
            )
        }

        return NextResponse.json(data ?? [], { status: 200 })
    } catch (e) {
        console.error("[admin-tarot-codex] GET failed", e)
        return NextResponse.json(
            { error: "FAILED_TO_LOAD" },
            { status: 500 }
        )
    }
}
