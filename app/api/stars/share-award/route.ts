import { NextRequest, NextResponse } from "next/server"
import { readAndVerifyDid } from "@/lib/server/did"
import { supabase } from "@/lib/supabase"

// Award 1 star for sharing, ignoring refill caps.
// If authenticated, adds to user balance; otherwise, adds to device id (DID).
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      user_id?: string | null
      owner_user_id?: string | null
      owner_did?: string | null
      shared_id?: string | null
    }
    const userId: string | null = body?.user_id ?? null
    const ownerUserId: string | null = body?.owner_user_id ?? null
    const ownerDid: string | null = body?.owner_did ?? null
    const sharedId: string | null = body?.shared_id ?? null

    if (userId) {
      // If visitor is the owner (by user id), do not award
      if (ownerUserId && ownerUserId === userId) {
        return NextResponse.json({ data: { ok: true, skipped: true } })
      }
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
      // Cap total awards for this visitor to 5 across all shares
      // We use a separate table to track visitor awards per owner/share
      if (sharedId) {
        const { data: visit, error: visitErr } = await supabase
          .from("share_visit_awards")
          .select("id")
          .eq("shared_id", sharedId)
          .eq("visitor_user_id", userId)
          .maybeSingle()
        if (!visit && !visitErr) {
          // Before award, check global cap 5 for this visitor
          const { count, error: cntErr } = await supabase
            .from("share_visit_awards")
            .select("id", { count: "exact", head: true })
            .eq("visitor_user_id", userId)
          if (!cntErr && typeof count === "number" && count >= 5) {
            return NextResponse.json({ data: { ok: true, capped: true } })
          }
          await supabase.from("share_visit_awards").insert({
            shared_id: sharedId,
            visitor_user_id: userId,
          })
        } else if (visit) {
          return NextResponse.json({ data: { ok: true, duplicate: true } })
        }
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
    // If visitor is the owner (by DID), do not award
    if (ownerDid && ownerDid === did) {
      return NextResponse.json({ data: { ok: true, skipped: true } })
    }
    if (sharedId) {
      const { data: visit, error: visitErr } = await supabase
        .from("share_visit_awards")
        .select("id")
        .eq("shared_id", sharedId)
        .eq("visitor_did", did)
        .maybeSingle()
      if (!visit && !visitErr) {
        const { count, error: cntErr } = await supabase
          .from("share_visit_awards")
          .select("id", { count: "exact", head: true })
          .eq("visitor_did", did)
        if (!cntErr && typeof count === "number" && count >= 5) {
          return NextResponse.json({ data: { ok: true, capped: true } })
        }
        await supabase.from("share_visit_awards").insert({
          shared_id: sharedId,
          visitor_did: did,
        })
      } else if (visit) {
        return NextResponse.json({ data: { ok: true, duplicate: true } })
      }
    }
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
