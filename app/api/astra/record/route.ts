import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { resolveAstraSubject } from "@/lib/server/astra-subject"

/**
 * Her own track record, for the person she read for.
 *
 * The proof sheet used to open on ascendant degrees and an ayanamsa, which
 * proves rigour only to someone who already knows the craft — and this product
 * is built for people who explicitly do not. What proves she is not making it
 * up, to anyone, is the boring thing: here is what she said, on what day, and
 * whether it happened.
 *
 * Scoped to the caller's own predictions. Nobody sees anyone else's.
 */

export type AstraRecordEntry = {
    id: string
    question: string
    verdict: string
    askedOnIso: string
    dueDateIso: string | null
    outcome: "hit" | "miss" | "unclear" | null
}

export type AstraRecordResponse = {
    hits: number
    misses: number
    unclear: number
    /** Written down, due date not yet reached or not yet answered. */
    pending: number
    /** Most recent first. Capped — this is a sheet, not an archive. */
    entries: AstraRecordEntry[]
}

const EMPTY: AstraRecordResponse = {
    hits: 0,
    misses: 0,
    unclear: 0,
    pending: 0,
    entries: [],
}

const LIMIT = 20

type Row = {
    id: string
    question: string
    verdict: string
    created_at: string
    due_date: string | null
    outcome: "hit" | "miss" | "unclear" | null
}

export async function GET(req: NextRequest) {
    if (!supabaseAdmin) return NextResponse.json(EMPTY)
    const subject = await resolveAstraSubject(req)
    if (!subject) return NextResponse.json(EMPTY)

    const { data, error } = await supabaseAdmin
        .from("astra_predictions")
        .select("id, question, verdict, created_at, due_date, outcome")
        .eq("subject_type", subject.type)
        .eq("subject_id", subject.id)
        .order("created_at", { ascending: false })
        .limit(LIMIT)

    // A sheet that cannot load its history still has to open: the computed
    // values below it are the rest of the proof.
    if (error || !data) return NextResponse.json(EMPTY)

    const rows = data as Row[]
    const tally = { hit: 0, miss: 0, unclear: 0 }
    let pending = 0
    for (const row of rows) {
        if (row.outcome) tally[row.outcome] += 1
        else pending += 1
    }

    return NextResponse.json({
        hits: tally.hit,
        misses: tally.miss,
        unclear: tally.unclear,
        pending,
        entries: rows.map((row) => ({
            id: row.id,
            question: row.question,
            verdict: row.verdict,
            askedOnIso: row.created_at,
            dueDateIso: row.due_date,
            outcome: row.outcome,
        })),
    } satisfies AstraRecordResponse)
}
