import { NextResponse } from "next/server"
import { readAndVerifyDid } from "@/lib/server/did"
import { supabase } from "@/lib/supabase"

export async function POST(req: Request) {
    const { amount, user_id: userId } = await req.json()
    const did = await readAndVerifyDid()
    if (!Number.isFinite(amount) || amount <= 0)
        return NextResponse.json({ error: "BAD_AMOUNT" }, { status: 400 })

    // If logged in, strictly use user_id and do not require DID
    if (userId) {
        const { data, error } = await supabase.rpc("star_spend", {
            p_anon_device_id: null,
            p_amount: amount,
            p_user_id: userId,
        })

        // REMOVED: Don't deduct from anonymous device when user is logged in
        // This was causing double deduction

        if (error) {
            console.error(data, error)
            return NextResponse.json({ error: error.message }, { status: 400 })
        }
        return NextResponse.json({ data })
    }

    // Anonymous: require DID
    if (!did) return NextResponse.json({ error: "NO_DID" }, { status: 400 })
    const { data, error } = await supabase.rpc("star_spend", {
        p_anon_device_id: did,
        p_amount: amount,
        p_user_id: null,
    })
    console.log(data)
    if (error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ data })
}
