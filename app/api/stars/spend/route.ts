import { NextResponse } from "next/server"
import { readAndVerifyDid } from "@/lib/server/did"
import { supabase, supabaseAdmin } from "@/lib/supabase"
import { getActiveSubscriptionInfo } from "@/lib/server/subscription"

export async function POST(req: Request) {
    const { amount, user_id: userId } = await req.json()
    const did = await readAndVerifyDid()
    if (!Number.isFinite(amount) || amount <= 0)
        return NextResponse.json({ error: "BAD_AMOUNT" }, { status: 400 })

    // If logged in, strictly use user_id and do not require DID
    if (userId) {
        if (supabaseAdmin) {
            const subscription = await getActiveSubscriptionInfo(userId)
            if (subscription) {
                const { data: currentData, error: currentErr } =
                    await supabaseAdmin.rpc("star_get_or_create", {
                        p_anon_device_id: null,
                        p_user_id: userId,
                    })
                if (currentErr) {
                    return NextResponse.json(
                        { error: currentErr.message },
                        { status: 400 }
                    )
                }
                const row = (currentData?.[0] ?? {}) as {
                    current_stars?: number
                    last_refill_at?: string | null
                }
                let current = Number.isFinite(row.current_stars as number)
                    ? (row.current_stars as number)
                    : 0
                let lastRefillAt = row.last_refill_at ?? null
                const lastRefillMs = lastRefillAt
                    ? new Date(lastRefillAt).getTime()
                    : null
                if (
                    subscription.currentPeriodStart &&
                    (!lastRefillMs ||
                        lastRefillMs < subscription.currentPeriodStart)
                ) {
                    const nextBalance = Math.max(current, subscription.totalStars)
                    const targetRefillAt = new Date(
                        subscription.currentPeriodStart
                    ).toISOString()
                    const { data: updated } = await supabaseAdmin
                        .from("stars")
                        .update({
                            current_stars: nextBalance,
                            last_refill_at: targetRefillAt,
                            updated_at: new Date().toISOString(),
                        })
                        .eq("user_id", userId)
                        .select("current_stars,last_refill_at")
                        .maybeSingle()
                    if (updated) {
                        current = updated.current_stars ?? current
                        lastRefillAt = updated.last_refill_at ?? lastRefillAt
                    }
                }

                if (current < amount) {
                    return NextResponse.json({
                        data: [
                            {
                                ok: false,
                                current_stars: current,
                                last_refill_at: lastRefillAt,
                            },
                        ],
                    })
                }

                const nextBalance = Math.max(0, current - amount)
                const { data: updated } = await supabaseAdmin
                    .from("stars")
                    .update({
                        current_stars: nextBalance,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("user_id", userId)
                    .select("current_stars,last_refill_at")
                    .maybeSingle()
                return NextResponse.json({
                    data: [
                        {
                            ok: true,
                            current_stars: updated?.current_stars ?? nextBalance,
                            last_refill_at:
                                updated?.last_refill_at ?? lastRefillAt,
                        },
                    ],
                })
            }
        }

        const { data, error } = await supabase.rpc("star_spend", {
            p_anon_device_id: null,
            p_amount: amount,
            p_user_id: userId,
        })

        // REMOVED: Don't deduct from anonymous device when user is logged in
        // This was causing double deduction

        if (error) {
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
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ data })
}
