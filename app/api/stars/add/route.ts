import { NextRequest, NextResponse } from "next/server"
import { readAndVerifyDid } from "@/lib/server/did"
import { supabase, supabaseAdmin } from "@/lib/supabase"
import { getActiveSubscriptionInfo } from "@/lib/server/subscription"

export async function POST(req: NextRequest) {
    const body = await req.json()
    const amount = body?.amount
    const userId: string | null = body?.user_id ?? null
    if (!Number.isFinite(amount) || amount <= 0)
        return NextResponse.json({ error: "BAD_AMOUNT" }, { status: 400 })

    if (userId) {
        // For authenticated users, regular adds are capped to plan stars (or 12 for free). Purchases should use /api/stars/set.
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
        const row = (currentData?.[0] ?? {}) as {
            current_stars?: number
            last_refill_at?: string | null
        }
        let current = Number.isFinite(row.current_stars as number)
            ? (row.current_stars as number)
            : 0
        let lastRefillAt = row.last_refill_at ?? null
        const subscription = supabaseAdmin
            ? await getActiveSubscriptionInfo(userId)
            : null
        if (
            supabaseAdmin &&
            subscription?.currentPeriodStart &&
            subscription.currentPeriodStart > 0
        ) {
            const lastRefillMs = lastRefillAt
                ? new Date(lastRefillAt).getTime()
                : null
            if (
                !lastRefillMs ||
                lastRefillMs < subscription.currentPeriodStart
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
        }
        const cap = subscription?.totalStars ?? 12
        const next =
            current >= cap
                ? current
                : Math.min(cap, Math.max(0, current + Number(amount)))
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
