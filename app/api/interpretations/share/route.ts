import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { readAndVerifyDid } from "@/lib/server/did"

// Create a new shared interpretation
export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "SUPABASE_NOT_CONFIGURED" }, { status: 500 })
    }

    const did = await readAndVerifyDid()
    if (!did) return NextResponse.json({ error: "NO_DID" }, { status: 400 })

    const body = await req.json()
    const question = (body?.question ?? "").toString().slice(0, 500)
    const cards = Array.isArray(body?.cards)
      ? body.cards.map((c: unknown) => String(c)).slice(0, 10)
      : []
    const interpretation = (body?.interpretation ?? "").toString().slice(0, 5000)

    if (!question || !interpretation) {
      return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 })
    }

    // Generate a short id
    const shortId = Math.random().toString(36).slice(2, 10)

    const { error } = await (supabaseAdmin as any)
      .from("shared_interpretations")
      .insert({
        id: shortId,
        did,
        question,
        cards,
        interpretation,
        created_at: new Date().toISOString(),
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ id: shortId })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "INTERNAL_ERROR" }, { status: 500 })
  }
}
