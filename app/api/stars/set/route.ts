import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
    const body = await req.json()
    const userId: string | null = body?.user_id ?? null
    const balance = body?.balance
    if (!userId)
        return NextResponse.json({ error: "USER_REQUIRED" }, { status: 400 })
    if (!Number.isFinite(balance) || balance < 0)
        return NextResponse.json({ error: "BAD_BALANCE" }, { status: 400 })

    const { data, error } = await supabase.rpc("star_set", {
        p_anon_device_id: null,
        p_new_balance: Math.floor(balance),
        p_user_id: userId,
    })
    if (error)
        return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data })
}
