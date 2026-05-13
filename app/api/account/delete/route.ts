import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(request: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "Service unavailable" },
                { status: 503 },
            )
        }

        const authHeader = request.headers.get("authorization")
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const token = authHeader.split(" ")[1]
        const {
            data: { user },
            error: authError,
        } = await supabaseAdmin.auth.getUser(token)

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // ON DELETE CASCADE on auth.users removes profile, stars, billing, etc.
        const { error: deleteError } =
            await supabaseAdmin.auth.admin.deleteUser(user.id)

        if (deleteError) {
            console.error("Account deletion error:", deleteError)
            return NextResponse.json(
                { error: "Failed to delete account" },
                { status: 500 },
            )
        }

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error("Account deletion error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        )
    }
}
