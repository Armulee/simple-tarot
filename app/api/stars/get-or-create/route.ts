import { NextRequest, NextResponse } from "next/server"
import { readAndVerifyDid, generateDid, setDidCookie } from "@/lib/server/did"
import { supabase, supabaseAdmin } from "@/lib/supabase"
import { getActiveSubscriptionInfo } from "@/lib/server/subscription"
// import { cookies } from "next/headers"

export async function GET(req: NextRequest) {
    const userId = req.nextUrl.searchParams.get("user_id")
    const supabaseClient = supabaseAdmin ?? supabase
    // If logged in, resolve strictly by user_id; otherwise require DID
    if (userId) {
        // Pass DID if present so first-login can grant (anon current + 10) to a new user row
        const did = await readAndVerifyDid()
        const { data, error } = await supabaseClient.rpc("star_get_or_create", {
            p_anon_device_id: did,
            p_user_id: userId,
        })
        if (error) {
            console.error("star_get_or_create(user) error", {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
                userId,
                hasDid: Boolean(did),
            })
            return NextResponse.json({ error: error.message }, { status: 400 })
        }
        if (supabaseAdmin && data?.[0]) {
            try {
                const subscription = await getActiveSubscriptionInfo(userId)
                if (
                    subscription?.totalStars &&
                    subscription.currentPeriodStart &&
                    subscription.currentPeriodStart > 0
                ) {
                    const row = data[0] as {
                        current_stars?: number
                        last_refill_at?: string | null
                        first_login_bonus_granted?: boolean
                        first_time_login_grant?: boolean
                    }
                    const lastRefillMs = row.last_refill_at
                        ? new Date(row.last_refill_at).getTime()
                        : null
                    if (
                        !lastRefillMs ||
                        lastRefillMs < subscription.currentPeriodStart
                    ) {
                        const nextBalance = Math.max(
                            Number(row.current_stars ?? 0),
                            subscription.totalStars
                        )
                        const { data: updated } = await supabaseAdmin
                            .from("stars")
                            .update({
                                current_stars: nextBalance,
                                last_refill_at: new Date(
                                    subscription.currentPeriodStart
                                ).toISOString(),
                                updated_at: new Date().toISOString(),
                            })
                            .eq("user_id", userId)
                            .select(
                                "current_stars,last_refill_at,first_login_bonus_granted,first_time_login_grant"
                            )
                            .maybeSingle()
                        if (updated) {
                            return NextResponse.json({
                                data: [
                                    {
                                        ...row,
                                        current_stars: updated.current_stars,
                                        last_refill_at: updated.last_refill_at,
                                        first_login_bonus_granted:
                                            updated.first_login_bonus_granted ??
                                            row.first_login_bonus_granted,
                                        first_time_login_grant:
                                            updated.first_time_login_grant ??
                                            row.first_time_login_grant,
                                    },
                                ],
                            })
                        }
                    }
                }
            } catch (err) {
                console.error("subscription refill check failed", err)
            }
        }
        return NextResponse.json({ data })
    }

    let did = await readAndVerifyDid()
    if (!did) {
        const newDid = generateDid()
        await setDidCookie(newDid)
        did = newDid
    }
    const { data, error } = await supabase.rpc("star_get_or_create", {
        p_anon_device_id: did,
        p_user_id: null,
    })
    if (error) {
        console.error("star_get_or_create(anon) error", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            hasDid: Boolean(did),
        })
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ data })
}
