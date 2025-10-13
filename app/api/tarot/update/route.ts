import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { readAndVerifyDid } from "@/lib/server/did"

// Update a tarot reading with interpretation
export async function POST(req: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "SUPABASE_NOT_CONFIGURED" },
                { status: 500 }
            )
        }

        const did = await readAndVerifyDid()
        if (!did) return NextResponse.json({ error: "NO_DID" }, { status: 400 })

        const body = await req.json()
        const id = body?.id
        const interpretation = (body?.interpretation ?? "")
            .toString()
            .slice(0, 5000)

        if (!id || !interpretation) {
            return NextResponse.json(
                { error: "MISSING_FIELDS" },
                { status: 400 }
            )
        }

        const { error } = await supabaseAdmin
            .from("tarot_readings")
            .update({
                interpretation,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "INTERNAL_ERROR"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}