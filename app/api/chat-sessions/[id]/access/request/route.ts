import { NextRequest, NextResponse } from "next/server"
import React from "react"
import { Resend } from "resend"
import { supabaseAdmin } from "@/lib/supabase"
import {
    getUserFromAuthHeader,
    fetchSessionRow,
    checkComposeAuth,
} from "@/lib/chat/session-access"
import { readAndVerifyDid } from "@/lib/server/did"
import { AccessRequestEmail } from "@/components/email-templates"

const SITE_URL = "https://askingfate.com"

const resend = new Resend(process.env.RESEND_API_KEY || "dummy-key-for-build")

/**
 * POST — An authenticated viewer asks the session owner for compose access.
 * Notifies the owner via email and an in-app notification row.
 *   Body: { message?: string }
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

    const requester = await getUserFromAuthHeader(req)
    if (!requester || !requester.email) {
        return NextResponse.json(
            { error: "REQUESTER_NOT_AUTHENTICATED" },
            { status: 401 },
        )
    }

    const session = await fetchSessionRow(sessionId)
    if (!session) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
    }
    if (!session.owner_user_id) {
        // Anonymous (device-only) sessions have no email/notification target.
        return NextResponse.json(
            { error: "OWNER_NOT_REACHABLE" },
            { status: 409 },
        )
    }
    if (session.owner_user_id === requester.id) {
        return NextResponse.json(
            { error: "REQUESTER_IS_OWNER" },
            { status: 400 },
        )
    }

    // If the requester already has compose access, nothing to do.
    const did = await readAndVerifyDid()
    const auth = await checkComposeAuth({
        session,
        user: requester,
        requestDid: did,
    })
    if (auth.canCompose) {
        return NextResponse.json(
            { error: "ALREADY_HAS_ACCESS" },
            { status: 409 },
        )
    }

    const body = await req.json().catch(() => ({}))
    const rawMessage =
        typeof body?.message === "string" ? body.message.trim() : ""
    const message = rawMessage ? rawMessage.slice(0, 500) : null

    // Upsert-by-pending: if a pending request already exists, return it.
    const { data: existing } = await supabaseAdmin
        .from("chat_session_access_requests")
        .select("id, status, created_at")
        .eq("session_id", sessionId)
        .eq("requester_user_id", requester.id)
        .eq("status", "pending")
        .maybeSingle()

    if (existing) {
        return NextResponse.json({
            request: existing,
            alreadyExists: true,
        })
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
        .from("chat_session_access_requests")
        .insert({
            session_id: sessionId,
            requester_user_id: requester.id,
            requester_email: requester.email.toLowerCase(),
            message,
        })
        .select("id, status, created_at")
        .maybeSingle()

    if (insertError || !inserted) {
        return NextResponse.json(
            { error: insertError?.message || "INSERT_FAILED" },
            { status: 400 },
        )
    }

    // Best-effort: look up owner email + session question for the notification.
    let ownerEmail: string | null = null
    try {
        const { data } = await supabaseAdmin.auth.admin.getUserById(
            session.owner_user_id,
        )
        ownerEmail = data.user?.email ?? null
    } catch {
        ownerEmail = null
    }

    let sessionQuestion = ""
    try {
        const { data: row } = await supabaseAdmin
            .from("chat_sessions")
            .select("question")
            .eq("id", sessionId)
            .maybeSingle()
        sessionQuestion = (row?.question as string) ?? ""
    } catch {
        sessionQuestion = ""
    }

    const sessionLink = `${SITE_URL}/${sessionId}?share=requests`
    const requesterName = requester.email.split("@")[0] || "Someone"

    // In-app notification for the owner (best-effort; ignore errors).
    try {
        await supabaseAdmin.from("notifications").insert({
            user_id: session.owner_user_id,
            type: "access_request",
            title: "Someone wants to join your session",
            body: `${requester.email} requested access${
                message ? `: ${message.slice(0, 120)}` : ""
            }`,
            link: `/${sessionId}?share=requests`,
            shared_id: sessionId,
        })
    } catch {
        // ignore
    }

    // Email the owner (best-effort).
    if (
        ownerEmail &&
        process.env.RESEND_API_KEY &&
        process.env.RESEND_API_KEY !== "dummy-key-for-build"
    ) {
        try {
            await resend.emails.send({
                from: "AskingFate <notifications@no-reply.askingfate.com>",
                to: [ownerEmail],
                subject: `${requester.email} is requesting access to your session`,
                react: React.createElement(AccessRequestEmail, {
                    requesterName,
                    requesterEmail: requester.email,
                    sessionQuestion,
                    sessionLink,
                    message,
                }),
            })
        } catch {
            // ignore — the in-app notification + DB row still let the owner respond
        }
    }

    return NextResponse.json({ request: inserted })
}
