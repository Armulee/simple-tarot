import { NextRequest, NextResponse } from "next/server"
import React from "react"
import { Resend } from "resend"

import { requireAdmin } from "@/lib/admin-auth"
import { FeatureBroadcastEmail } from "@/components/email-templates"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const resend = new Resend(process.env.RESEND_API_KEY || "dummy-key-for-build")
const FROM = "AskingFate <updates@no-reply.askingfate.com>"

/** Subscribe-able features surfaced in the broadcast tool (plus "custom"). */
const FEATURES = [{ key: "avatar", label: "Avatar" }]

function parseEmails(input: unknown): string[] {
    if (Array.isArray(input)) {
        return input.map((v) => String(v).trim()).filter(Boolean)
    }
    if (typeof input === "string") {
        return input
            .split(/[,;\n]/)
            .map((v) => v.trim())
            .filter(Boolean)
    }
    return []
}

/**
 * GET — list broadcastable features with their subscriber emails/counts, so the
 * admin page can prefill the "to" field. Always includes a "custom" option
 * (arbitrary recipients, no subscribers).
 */
export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (!auth.ok) return auth.response
    const { admin } = auth

    const features: {
        key: string
        label: string
        emails: string[]
    }[] = []

    for (const f of FEATURES) {
        const { data } = await admin
            .from("feature_subscriptions")
            .select("email")
            .eq("feature", f.key)
        const emails = Array.from(
            new Set((data ?? []).map((r) => String(r.email).toLowerCase())),
        )
        features.push({ key: f.key, label: f.label, emails })
    }

    features.push({ key: "custom", label: "Custom", emails: [] })

    return NextResponse.json({ features })
}

/**
 * POST — send a broadcast email using the default template.
 * Body: { feature, subject, heading?, body, to?, cc? }
 *
 * - feature === "custom": send to the provided `to` (+ `cc`).
 * - otherwise: send to everyone subscribed to that feature (+ optional `cc`).
 * Emails are sent one recipient at a time so addresses aren't exposed to peers.
 */
export async function POST(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (!auth.ok) return auth.response
    const { admin } = auth

    if (
        !process.env.RESEND_API_KEY ||
        process.env.RESEND_API_KEY === "dummy-key-for-build"
    ) {
        return NextResponse.json(
            { error: "EMAIL_NOT_CONFIGURED" },
            { status: 500 },
        )
    }

    let payload: {
        feature?: string
        subject?: string
        heading?: string
        body?: string
        to?: unknown
        cc?: unknown
    }
    try {
        payload = await request.json()
    } catch {
        return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 })
    }

    const feature = (payload.feature ?? "").toLowerCase().trim()
    const subject = (payload.subject ?? "").trim()
    const body = (payload.body ?? "").trim()
    const heading = (payload.heading ?? subject).trim()
    const cc = parseEmails(payload.cc)

    if (!subject || !body) {
        return NextResponse.json(
            { error: "SUBJECT_AND_BODY_REQUIRED" },
            { status: 400 },
        )
    }

    // Resolve recipients.
    let recipients: string[] = []
    if (feature === "custom") {
        recipients = parseEmails(payload.to)
    } else if (FEATURES.some((f) => f.key === feature)) {
        const { data } = await admin
            .from("feature_subscriptions")
            .select("email")
            .eq("feature", feature)
        recipients = Array.from(
            new Set((data ?? []).map((r) => String(r.email).toLowerCase())),
        )
    } else {
        return NextResponse.json({ error: "UNKNOWN_FEATURE" }, { status: 400 })
    }

    if (recipients.length === 0) {
        return NextResponse.json({ error: "NO_RECIPIENTS" }, { status: 400 })
    }
    // Guardrail against accidental mass-send.
    if (recipients.length > 2000) {
        return NextResponse.json({ error: "TOO_MANY_RECIPIENTS" }, { status: 400 })
    }

    let sent = 0
    let failed = 0
    for (const email of recipients) {
        try {
            const res = await resend.emails.send({
                from: FROM,
                to: [email],
                cc: cc.length ? cc : undefined,
                subject,
                react: React.createElement(FeatureBroadcastEmail, {
                    heading,
                    body,
                }),
            })
            if (res.error) failed++
            else sent++
        } catch (err) {
            console.error("[admin/broadcast] send failed:", err)
            failed++
        }
    }

    return NextResponse.json({ sent, failed, total: recipients.length })
}
