import { NextRequest, NextResponse } from "next/server"
import { readAndVerifyDid } from "@/lib/server/did"
import { supabase } from "@/lib/supabase"

// Award 1 star for sharing, ignoring refill caps.
// If authenticated, adds to user balance; otherwise, adds to device id (DID).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { user_id?: string | null }
    const userId: string | null = body?.user_id ?? null

    if (userId) {
      // Get current, then set to current + 1 (no cap)
      const { data: currentData, error: currentErr } = await supabase.rpc(
        "star_get_or_create",
        {
          p_anon_device_id: null,
          p_user_id: userId,
        }
      )
      if (currentErr) {
        return NextResponse.json({ error: currentErr.message }, { status: 400 })
      }
      const row = (currentData?.[0] ?? {}) as { current_stars?: number }
      const current = Number.isFinite(row.current_stars as number)
        ? (row.current_stars as number)
        : 0
      const next = Math.max(0, current + 1)
      const { data, error } = await supabase.rpc("star_set", {
        p_anon_device_id: null,
        p_new_balance: next,
        p_user_id: userId,
      })
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ data })
    }

    // Anonymous: use DID and increment by 1
    const did = await readAndVerifyDid()
    if (!did) return NextResponse.json({ error: "NO_DID" }, { status: 400 })
    const { data, error } = await supabase.rpc("star_add", {
      p_anon_device_id: did,
      p_amount: 1,
      p_user_id: null,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "INTERNAL_ERROR"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
