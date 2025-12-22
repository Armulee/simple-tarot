import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { readAndVerifyDid } from "@/lib/server/did"

// Update an astrology reading (e.g. save AI summary)
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
        const summary = (body?.summary ?? "").toString().slice(0, 12000)

        if (!id || !summary) {
            return NextResponse.json(
                { error: "MISSING_FIELDS" },
                { status: 400 }
            )
        }

        const { error } = await supabaseAdmin
            .from("astrology_readings")
            .update({
                summary,
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


