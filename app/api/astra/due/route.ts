import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * She said it would show by a certain day. This is the day.
 *
 * The follow-up already existed — a new session opens by asking how the last
 * forecast turned out — but it only fired if the person happened to come back
 * on their own, which is the very thing the product is short of. So the reason
 * to return has to be delivered rather than waited for.
 *
 * This is not a marketing send. It is her keeping her word, once per
 * prediction, and it stops the moment the outcome is recorded.
 *
 * Run daily. Vercel cron authenticates with `Authorization: Bearer CRON_SECRET`.
 */

export const maxDuration = 60

const SITE_URL = "https://askingfate.com"
const BATCH = 100

const resend = new Resend(process.env.RESEND_API_KEY || "dummy-key-for-build")

function emailIsConfigured(): boolean {
    return Boolean(
        process.env.RESEND_API_KEY &&
            process.env.RESEND_API_KEY !== "dummy-key-for-build",
    )
}

type DueRow = {
    id: string
    subject_type: "user" | "device"
    subject_id: string
    question: string
    verdict: string
    due_date: string
    session_id: string | null
}

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = req.headers.get("authorization")
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
    }
    if (!supabaseAdmin) {
        return NextResponse.json(
            { error: "SUPABASE_NOT_CONFIGURED" },
            { status: 500 },
        )
    }
    const admin = supabaseAdmin
    const today = new Date().toISOString().slice(0, 10)

    // Due, still unanswered, and never chased before. `nudged_at` is what
    // keeps this to one reminder per prediction however often the cron runs.
    const { data, error } = await admin
        .from("astra_predictions")
        .select("id, subject_type, subject_id, question, verdict, due_date, session_id")
        .lte("due_date", today)
        .is("outcome", null)
        .is("nudged_at", null)
        .order("due_date", { ascending: true })
        .limit(BATCH)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const rows = (data ?? []) as DueRow[]

    let notified = 0
    let emailed = 0
    const failures: string[] = []

    for (const row of rows) {
        // Mark first, and in `nudged_at` — never in `asked_result_at`, which
        // means she has already put the question to them in the chat and is
        // what the opening turn checks. Writing the sweep there would bring
        // someone back to a fortune teller with nothing to say. A prediction
        // chased twice is worse than one missed, so the marker goes down
        // before the send, not after it.
        const { error: markError } = await admin
            .from("astra_predictions")
            .update({ nudged_at: new Date().toISOString() })
            .eq("id", row.id)
            .is("nudged_at", null)
        if (markError) {
            failures.push(`${row.id}: ${markError.message}`)
            continue
        }

        // An anonymous device has no inbox and no account row to notify. The
        // marker still moves, so the opening turn asks the moment they return.
        if (row.subject_type !== "user") continue

        const link = row.session_id ? `/chat/${row.session_id}` : "/"
        const title = "How did it go?"
        const body = `You asked: “${row.question}”. I said ${row.verdict}. Tell me how it turned out.`

        const { error: notifyError } = await admin.from("notifications").insert({
            user_id: row.subject_id,
            type: "astra_due",
            title,
            body,
            link,
            date_key: row.due_date,
        })
        if (notifyError) {
            failures.push(`${row.id}: ${notifyError.message}`)
            continue
        }
        notified += 1

        if (!emailIsConfigured()) continue
        const { data: userData } = await admin.auth.admin.getUserById(
            row.subject_id,
        )
        const email = userData?.user?.email
        if (!email) continue
        try {
            await resend.emails.send({
                from: "AskingFate <support@no-reply.askingfate.com>",
                to: [email],
                subject: title,
                text: `${body}\n\n${SITE_URL}${link}`,
            })
            emailed += 1
        } catch (sendError) {
            // The in-app notification already landed; a failed send is not a
            // reason to lose the whole sweep.
            failures.push(
                `${row.id}: email ${
                    sendError instanceof Error
                        ? sendError.message
                        : String(sendError)
                }`,
            )
        }
    }

    return NextResponse.json({
        ok: true,
        due: rows.length,
        notified,
        emailed,
        failures: failures.slice(0, 10),
    })
}
