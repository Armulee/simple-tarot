import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// Fetch a shared interpretation by id
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = (params?.id ?? "").toString().slice(0, 32)
    if (!id) return NextResponse.json({ error: "BAD_ID" }, { status: 400 })

    const { data, error } = await supabase
      .from("shared_interpretations")
      .select("id, question, cards, interpretation, created_at")
      .eq("id", id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })

    return NextResponse.json({ data })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "INTERNAL_ERROR"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
