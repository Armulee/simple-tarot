import { NextRequest, NextResponse } from "next/server"
import { readAndVerifyDid } from "@/lib/server/did"
import { supabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
    const body = await req.json()
    const amount = body?.amount
    const userId: string | null = body?.user_id ?? null
    if (!Number.isFinite(amount) || amount <= 0)
        return NextResponse.json({ error: "BAD_AMOUNT" }, { status: 400 })

    if (userId) {
        // For authenticated users, regular adds are capped to 12 (refill cap). Purchases should use /api/stars/set.
        const { data: currentData, error: currentErr } = await supabase.rpc(
            "star_get_or_create",
            {
                p_anon_device_id: null,
                p_user_id: userId,
            }
        )
        if (currentErr)
            return NextResponse.json(
                { error: currentErr.message },
                { status: 400 }
            )
        const row = (currentData?.[0] ?? {}) as { current_stars?: number }
        const current = Number.isFinite(row.current_stars as number)
            ? (row.current_stars as number)
            : 0
        const next = Math.min(12, Math.max(0, current + Number(amount)))
        const { data, error } = await supabase.rpc("star_set", {
            p_anon_device_id: null,
            p_new_balance: next,
            p_user_id: userId,
        })
        if (error)
            return NextResponse.json({ error: error.message }, { status: 400 })
        return NextResponse.json({ data })
    }

    const did = await readAndVerifyDid()
    if (!did) return NextResponse.json({ error: "NO_DID" }, { status: 400 })
    const { data, error } = await supabase.rpc("star_add", {
        p_anon_device_id: did,
        p_amount: amount,
        p_user_id: null,
    })
    if (error)
        return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data })
}
