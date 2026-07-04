import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getUserFromAuthHeader } from "@/lib/chat/session-access"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * GET /api/users/search?email=
 *
 * Authenticated lookup used by the chat-session "Share access" UI to show
 * the existing app user's name + avatar before they're invited. Returns
 * `{ exists: false }` when the email isn't registered — a normal case, not
 * an error.
 */
export async function GET(req: NextRequest) {
    if (!supabaseAdmin) {
        return NextResponse.json(
            { error: "SUPABASE_NOT_CONFIGURED" },
            { status: 500 },
        )
    }

    const caller = await getUserFromAuthHeader(req)
    if (!caller) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
    }

    const emailRaw = req.nextUrl.searchParams.get("email") ?? ""
    const email = emailRaw.trim().toLowerCase()
    if (!email || !EMAIL_REGEX.test(email) || email.length > 320) {
        return NextResponse.json({ error: "BAD_EMAIL" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.rpc("find_user_by_email", {
        p_email: email,
    })

    if (error) {
        console.error("[users/search] rpc failed", error)
        return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const row = Array.isArray(data) && data.length > 0 ? data[0] : null
    if (!row) {
        return NextResponse.json({ exists: false })
    }

    return NextResponse.json({
        exists: true,
        userId: row.user_id as string,
        name: (row.name as string) ?? null,
        avatarUrl: (row.avatar_url as string) ?? null,
    })
}
