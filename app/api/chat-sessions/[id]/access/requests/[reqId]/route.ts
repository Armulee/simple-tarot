import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { resolveSessionAuth } from "@/lib/chat/session-access"

/**
 * PATCH — Owner-only. Approve or deny an access request.
 *   Body: { decision: "approve" | "deny" }
 *
 * Approve: ensures a grant row exists in chat_session_access (by user_id and
 * email), marks the request approved, and posts an in-app notification to
 * the requester.
 *
 * Deny: marks the request denied and posts an in-app notification.
 */
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string; reqId: string }> },
) {
    if (!supabaseAdmin) {
        return NextResponse.json(
            { error: "SUPABASE_NOT_CONFIGURED" },
            { status: 500 },
        )
    }

    const { id: rawId, reqId: rawReqId } = await context.params
    const sessionId = (rawId ?? "").toString().slice(0, 64)
    const reqId = (rawReqId ?? "").toString().slice(0, 64)
    if (!sessionId || !reqId) {
        return NextResponse.json({ error: "BAD_ID" }, { status: 400 })
    }

    const resolved = await resolveSessionAuth(req, sessionId)
    if (!resolved.ok) {
        return NextResponse.json(
            { error: resolved.error },
            { status: resolved.status },
        )
    }
    if (!resolved.auth.isOwner || !resolved.user) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const decision = body?.decision
    if (decision !== "approve" && decision !== "deny") {
        return NextResponse.json({ error: "BAD_DECISION" }, { status: 400 })
    }

    const { data: requestRow, error: fetchError } = await supabaseAdmin
        .from("chat_session_access_requests")
        .select("id, session_id, requester_user_id, requester_email, status")
        .eq("id", reqId)
        .eq("session_id", sessionId)
        .maybeSingle()

    if (fetchError) {
        return NextResponse.json(
            { error: fetchError.message },
            { status: 400 },
        )
    }
    if (!requestRow) {
        return NextResponse.json(
            { error: "REQUEST_NOT_FOUND" },
            { status: 404 },
        )
    }
    if (requestRow.status !== "pending") {
        return NextResponse.json(
            { error: "ALREADY_RESOLVED" },
            { status: 409 },
        )
    }

    const requesterUserId = requestRow.requester_user_id as string
    const requesterEmail = (requestRow.requester_email as string).toLowerCase()

    if (decision === "approve") {
        // Ensure a grant exists. If a prior email-only grant exists, leave it
        // (it already matches by email); otherwise insert a fresh one with
        // both identifiers known.
        const { data: existingGrant } = await supabaseAdmin
            .from("chat_session_access")
            .select("id")
            .eq("session_id", sessionId)
            .or(
                `grantee_user_id.eq.${requesterUserId},grantee_email.eq.${requesterEmail}`,
            )
            .limit(1)

        if (!existingGrant || existingGrant.length === 0) {
            const { error: insertError } = await supabaseAdmin
                .from("chat_session_access")
                .insert({
                    session_id: sessionId,
                    grantee_user_id: requesterUserId,
                    grantee_email: requesterEmail,
                    granted_by_user_id: resolved.user.id,
                })
            if (insertError) {
                return NextResponse.json(
                    { error: insertError.message },
                    { status: 400 },
                )
            }
        }
    }

    const newStatus = decision === "approve" ? "approved" : "denied"
    const { error: updateError } = await supabaseAdmin
        .from("chat_session_access_requests")
        .update({
            status: newStatus,
            resolved_at: new Date().toISOString(),
            resolved_by_user_id: resolved.user.id,
        })
        .eq("id", reqId)

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    // In-app notification for the requester (best-effort).
    try {
        const title =
            decision === "approve"
                ? "Your access request was approved"
                : "Your access request was declined"
        const verbBody =
            decision === "approve"
                ? "You can now continue the conversation."
                : "The owner declined this request."
        await supabaseAdmin.from("notifications").insert({
            user_id: requesterUserId,
            type: "access_request_decision",
            title,
            body: verbBody,
            link: `/${sessionId}`,
            shared_id: sessionId,
        })
    } catch {
        // ignore
    }

    return NextResponse.json({ ok: true, status: newStatus })
}
