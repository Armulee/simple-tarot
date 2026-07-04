import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { resolveSessionAuth } from "@/lib/chat/session-access"

/**
 * GET — Owner-only. List access requests for this session.
 *   Query: ?status=pending|all (default: pending)
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    if (!supabaseAdmin) {
        return NextResponse.json(
            { error: "SUPABASE_NOT_CONFIGURED" },
            { status: 500 },
        )
    }

    const { id: rawId } = await context.params
    const sessionId = (rawId ?? "").toString().slice(0, 64)
    if (!sessionId) {
        return NextResponse.json({ error: "BAD_ID" }, { status: 400 })
    }

    const resolved = await resolveSessionAuth(req, sessionId)
    if (!resolved.ok) {
        return NextResponse.json(
            { error: resolved.error },
            { status: resolved.status },
        )
    }
    if (!resolved.auth.isOwner) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
    }

    const statusFilter = req.nextUrl.searchParams.get("status") ?? "pending"

    let query = supabaseAdmin
        .from("chat_session_access_requests")
        .select("id, requester_user_id, requester_email, message, status, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })

    if (statusFilter !== "all") {
        query = query.eq("status", statusFilter)
    }

    const { data, error } = await query
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
        requests: (data ?? []).map((r) => ({
            id: r.id,
            requesterUserId: r.requester_user_id,
            requesterEmail: r.requester_email,
            message: r.message,
            status: r.status,
            createdAt: r.created_at,
        })),
    })
}
