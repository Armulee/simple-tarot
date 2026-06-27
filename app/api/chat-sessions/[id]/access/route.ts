import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { resolveSessionAuth } from "@/lib/chat/session-access"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * GET — Viewer-specific permissions for a session.
 *   Body: { canCompose, isOwner, grants? }
 *   `grants` is only included when the requester is the owner.
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
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

    const { auth } = resolved
    const response: {
        canCompose: boolean
        isOwner: boolean
        grants?: Array<{
            id: string
            email: string | null
            userId: string | null
            createdAt: string
        }>
    } = {
        canCompose: auth.canCompose,
        isOwner: auth.isOwner,
    }

    if (auth.isOwner && supabaseAdmin) {
        const { data } = await supabaseAdmin
            .from("chat_session_access")
            .select("id, grantee_user_id, grantee_email, created_at")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: true })

        response.grants =
            (data ?? []).map((g) => ({
                id: g.id as string,
                email: (g.grantee_email as string) ?? null,
                userId: (g.grantee_user_id as string) ?? null,
                createdAt: g.created_at as string,
            })) ?? []
    }

    return NextResponse.json(response)
}

/**
 * POST — Owner-only. Add an access grant by email.
 *   Body: { email: string }
 */
export async function POST(
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
    if (!resolved.auth.isOwner || !resolved.user) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const rawEmail = typeof body?.email === "string" ? body.email : ""
    const email = rawEmail.trim().toLowerCase()
    if (!email || !EMAIL_REGEX.test(email) || email.length > 320) {
        return NextResponse.json({ error: "BAD_EMAIL" }, { status: 400 })
    }
    if (resolved.user.email && email === resolved.user.email.toLowerCase()) {
        return NextResponse.json(
            { error: "CANNOT_GRANT_SELF" },
            { status: 400 },
        )
    }

    // The grant is stored by email; if/when the invited person already has
    // an account, hasGrant() will still match them by email (and by user_id
    // once we backfill grantee_user_id from auth.users via a follow-up flow).
    const { data: existing } = await supabaseAdmin
        .from("chat_session_access")
        .select("id, grantee_user_id, grantee_email, created_at")
        .eq("session_id", sessionId)
        .eq("grantee_email", email)
        .maybeSingle()

    if (existing) {
        return NextResponse.json({
            grant: {
                id: existing.id,
                email: existing.grantee_email,
                userId: existing.grantee_user_id,
                createdAt: existing.created_at,
            },
            alreadyExists: true,
        })
    }

    const { data: inserted, error } = await supabaseAdmin
        .from("chat_session_access")
        .insert({
            session_id: sessionId,
            grantee_email: email,
            granted_by_user_id: resolved.user.id,
        })
        .select("id, grantee_user_id, grantee_email, created_at")
        .maybeSingle()

    if (error || !inserted) {
        return NextResponse.json(
            { error: error?.message || "INSERT_FAILED" },
            { status: 400 },
        )
    }

    return NextResponse.json({
        grant: {
            id: inserted.id,
            email: inserted.grantee_email,
            userId: inserted.grantee_user_id,
            createdAt: inserted.created_at,
        },
    })
}

/**
 * DELETE — Owner-only. Remove a grant by id.
 *   Query: ?id=<grant-id>
 */
export async function DELETE(
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

    const grantId = req.nextUrl.searchParams.get("id")
    if (!grantId) {
        return NextResponse.json({ error: "BAD_GRANT_ID" }, { status: 400 })
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

    const { error } = await supabaseAdmin
        .from("chat_session_access")
        .delete()
        .eq("id", grantId)
        .eq("session_id", sessionId)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
}
