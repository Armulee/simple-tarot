import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase"
import { resolveAstraSubject } from "@/lib/server/astra-subject"

/**
 * How a forecast actually turned out.
 *
 * She wrote down what she said and the day it should show; this is the other
 * half — the person telling her whether it did. Scoped to the caller's own
 * predictions, so nobody can mark someone else's reading.
 */

const patchSchema = z.object({
    id: z.string().uuid(),
    outcome: z.enum(["hit", "miss", "unclear"]),
    note: z.string().max(500).optional(),
})

export async function PATCH(req: NextRequest) {
    if (!supabaseAdmin) {
        return NextResponse.json({ error: "SUPABASE_NOT_CONFIGURED" }, { status: 500 })
    }
    const subject = await resolveAstraSubject(req)
    if (!subject) return NextResponse.json({ error: "NO_SUBJECT" }, { status: 400 })

    const parsed = patchSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
        return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 })
    }

    const { error } = await supabaseAdmin
        .from("astra_predictions")
        .update({
            outcome: parsed.data.outcome,
            outcome_note: parsed.data.note ?? null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", parsed.data.id)
        .eq("subject_type", subject.type)
        .eq("subject_id", subject.id)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
}
