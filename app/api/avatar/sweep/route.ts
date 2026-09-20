import { NextRequest, NextResponse } from "next/server"

import { supabaseAdmin } from "@/lib/supabase"
import { stopSession } from "@/lib/heygen"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Safety valve: a single run never stops more than this many sessions, so a
// large backlog can't hold the request open past the function timeout. The
// cron runs every 5 minutes, so the rest is picked up on the next tick.
const MAX_STOPS_PER_RUN = 50

/**
 * GET — scheduled sweep for leaked avatar sessions. Runs every 5 minutes via
 * GitHub Actions (.github/workflows/avatar-session-sweep.yml — Vercel Hobby
 * only allows daily crons), with the Vercel cron (vercel.json) as a
 * once-a-day backstop. Both hit this same idempotent endpoint.
 *
 * A session leaks when the browser closes without reaching /api/avatar/stop.
 * Two things then go wrong and `avatar_sweep_expired()` alone only fixes the
 * first:
 *   1. the row stays `active`, so `avatar_start_session` rejects that user's
 *      next attempt with SESSION_ALREADY_ACTIVE — forever;
 *   2. HeyGen still holds the seat, counting against the plan's concurrency
 *      limit until it times out on its own.
 *
 * So we read the expired rows first (while they still carry their HeyGen
 * token), force-close each one at HeyGen, and only then run the RPC that
 * marks them ended. Credits are intentionally not refunded: by expiry the
 * avatar has already spoken and the minute was genuinely used.
 */
export async function GET(request: NextRequest) {
    // Vercel cron authenticates with `Authorization: Bearer ${CRON_SECRET}`.
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get("authorization")
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
    }
    if (!supabaseAdmin) {
        return NextResponse.json({ error: "SERVER_NOT_CONFIGURED" }, { status: 500 })
    }
    const admin = supabaseAdmin

    // 1. Read the expired rows BEFORE the RPC ends them — this is the only
    //    moment their HeyGen token is still reachable.
    const { data: expired, error: readError } = await admin
        .from("avatar_sessions")
        .select("session_id, heygen_token")
        .eq("status", "active")
        .not("expires_at", "is", null)
        .lt("expires_at", new Date().toISOString())
        .limit(MAX_STOPS_PER_RUN)
    if (readError) {
        console.error("[avatar/sweep] read failed:", readError)
        return NextResponse.json({ error: "SWEEP_FAILED" }, { status: 500 })
    }

    // 2. Release the HeyGen seats. Best effort: a session HeyGen already
    //    timed out on its own returns an error we don't care about.
    let stopped = 0
    for (const row of (expired ?? []) as {
        session_id: string
        heygen_token: string | null
    }[]) {
        if (!row.heygen_token) continue
        try {
            await stopSession({ token: row.heygen_token, sessionId: row.session_id })
            stopped++
        } catch {
            /* already gone at HeyGen's end — the row still gets marked below */
        }
    }

    // 3. Mark every expired row ended. Idempotent, and it also catches rows
    //    beyond MAX_STOPS_PER_RUN so nobody stays locked out for a full tick.
    const { data: sweptCount, error: sweepError } = await admin.rpc(
        "avatar_sweep_expired",
    )
    if (sweepError) {
        console.error("[avatar/sweep] sweep rpc failed:", sweepError)
        return NextResponse.json({ error: "SWEEP_FAILED" }, { status: 500 })
    }

    return NextResponse.json({ swept: Number(sweptCount ?? 0), stopped })
}
