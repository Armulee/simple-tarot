import { NextRequest, NextResponse } from "next/server"
import React from "react"
import { Resend } from "resend"

import { supabaseAdmin } from "@/lib/supabase"
import { StarsRefilledEmail } from "@/components/email-templates"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const resend = new Resend(process.env.RESEND_API_KEY || "dummy-key-for-build")
const FROM = "AskingFate <updates@no-reply.askingfate.com>"
const REFILL_STARS = 5

// Safety valve: never email more than this many users in a single sweep run
// (the cron runs every 10 minutes, so the backlog drains quickly anyway).
const MAX_EMAILS_PER_RUN = 500

/**
 * GET — scheduled sweep. Runs every 10 minutes via GitHub Actions
 * (.github/workflows/star-refill-sweep.yml — Vercel Hobby only allows daily
 * crons), with the Vercel cron (vercel.json) as a once-a-day backstop. Both
 * hit this same idempotent endpoint.
 *
 * Applies every matured 5-hour batch refill proactively (the star RPCs would
 * otherwise apply it lazily on the user's next visit), then for each refilled
 * user:
 *   1. writes a "stars_refilled" notification into the notification tab, and
 *   2. sends a reminder email — skipped when the user has the mobile app
 *      (has_mobile_app, false for everyone until the app ships) or has turned
 *      off reading-reminder emails in settings.
 *
 * Note: a refill that lands lazily (user opens the site between cron ticks)
 * is already visible to that user in-app, so the sweep intentionally only
 * covers users who are away.
 */
export async function GET(request: NextRequest) {
    // Vercel cron authenticates with `Authorization: Bearer ${CRON_SECRET}`.
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get("authorization")
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
    }
    if (!supabaseAdmin) {
        return NextResponse.json(
            { error: "SERVER_NOT_CONFIGURED" },
            { status: 500 },
        )
    }
    const admin = supabaseAdmin

    // 1. Apply all matured refills atomically; get back who was refilled.
    const { data: refilled, error: sweepError } = await admin.rpc(
        "star_sweep_matured_refills",
    )
    if (sweepError) {
        console.error("[refill-sweep] sweep failed:", sweepError)
        return NextResponse.json({ error: "SWEEP_FAILED" }, { status: 500 })
    }
    const userIds: string[] = Array.from(
        new Set(
            ((refilled ?? []) as { user_id: string }[]).map((r) => r.user_id),
        ),
    )
    if (userIds.length === 0) {
        return NextResponse.json({ refilled: 0, notified: 0, emailed: 0 })
    }

    // 2. In-app notifications (notification tab).
    const nowIso = new Date().toISOString()
    let notified = 0
    try {
        const { error } = await admin.from("notifications").insert(
            userIds.map((userId) => ({
                user_id: userId,
                type: "stars_refilled",
                title: "Your stars have returned ✨",
                body: `All ${REFILL_STARS} daily stars are back. Come draw a card.`,
                link: "/",
                created_at: nowIso,
            })),
        )
        if (error) console.error("[refill-sweep] notification insert failed:", error)
        else notified = userIds.length
    } catch (err) {
        console.error("[refill-sweep] notification insert failed:", err)
    }

    // 3. Reminder emails. Skip: mobile-app users (push will cover them once
    //    the app exists) and users who disabled reading-reminder emails.
    const { data: settingsRows } = await admin
        .from("user_settings")
        .select("user_id, has_mobile_app, email_reading_reminders")
        .in("user_id", userIds)
    const settingsByUser = new Map(
        (settingsRows ?? []).map((row) => [row.user_id as string, row]),
    )

    const { data: profileRows } = await admin
        .from("profiles")
        .select("id, name")
        .in("id", userIds)
    const nameByUser = new Map(
        (profileRows ?? []).map((row) => [row.id as string, row.name as string | null]),
    )

    const emailConfigured =
        Boolean(process.env.RESEND_API_KEY) &&
        process.env.RESEND_API_KEY !== "dummy-key-for-build"

    let emailed = 0
    let skipped = 0
    for (const userId of emailConfigured
        ? userIds.slice(0, MAX_EMAILS_PER_RUN)
        : []) {
        const settings = settingsByUser.get(userId)
        // Missing settings row → defaults (no mobile app, reminders on).
        if (settings?.has_mobile_app === true) {
            skipped++
            continue
        }
        if (settings?.email_reading_reminders === false) {
            skipped++
            continue
        }
        try {
            const { data: userRes } = await admin.auth.admin.getUserById(userId)
            const email = userRes?.user?.email
            if (!email) {
                skipped++
                continue
            }
            const res = await resend.emails.send({
                from: FROM,
                to: [email],
                subject: "Your stars are back ✨ — AskingFate",
                react: React.createElement(StarsRefilledEmail, {
                    name: nameByUser.get(userId) ?? null,
                    stars: REFILL_STARS,
                }),
            })
            if (res.error) {
                console.error("[refill-sweep] email failed:", res.error)
            } else {
                emailed++
            }
        } catch (err) {
            console.error("[refill-sweep] email failed:", err)
        }
    }

    return NextResponse.json({
        refilled: userIds.length,
        notified,
        emailed,
        skipped,
    })
}
