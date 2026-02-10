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
                if (data?.[0]) {
                    const row = data[0] as {
                        daily_stars?: number
                        plan_stars?: number
                        addon_stars?: number
                        daily_last_refill_at?: string | null
                        plan_last_refill_at?: string | null
                        addon_last_refill_at?: string | null
                        first_login_bonus_granted?: boolean
                        first_time_login_grant?: boolean
                    }
                    let dailyStars = Number(row.daily_stars ?? 0)
                    const prevPlanStars = Number(row.plan_stars ?? 0)
                    const prevAddonStars = Number(row.addon_stars ?? 0)
                    let planStars = prevPlanStars
                    let addonStars = prevAddonStars
                    let planLastRefillMs = row.plan_last_refill_at
                        ? new Date(row.plan_last_refill_at).getTime()
                        : null
                    let addonLastRefillMs = row.addon_last_refill_at
                        ? new Date(row.addon_last_refill_at).getTime()
                        : null
                    const prevPlanLastRefillMs = planLastRefillMs
                    const prevAddonLastRefillMs = addonLastRefillMs

                    if (
                        subscription?.currentPeriodStart &&
                        subscription.currentPeriodStart > 0
                    ) {
                        if (
                            !planLastRefillMs ||
                            planLastRefillMs < subscription.currentPeriodStart
                        ) {
                            planStars = subscription.baseStars
                            planLastRefillMs = subscription.currentPeriodStart
                        }
                        if (
                            !addonLastRefillMs ||
                            addonLastRefillMs < subscription.currentPeriodStart
                        ) {
                            addonStars = subscription.addonStars
                            addonLastRefillMs = subscription.currentPeriodStart
                        }
                    } else if (planStars > 0 || addonStars > 0) {
                        planStars = 0
                        addonStars = 0
                        planLastRefillMs = null
                        addonLastRefillMs = null
                    }

                    const shouldUpdate =
                        planStars !== prevPlanStars ||
                        addonStars !== prevAddonStars ||
                        planLastRefillMs !== prevPlanLastRefillMs ||
                        addonLastRefillMs !== prevAddonLastRefillMs

                    if (shouldUpdate) {
                        const { data: updated } = await supabaseAdmin
                            .from("stars")
                            .update({
                                plan_stars: planStars,
                                addon_stars: addonStars,
                                plan_last_refill_at: planLastRefillMs
                                    ? new Date(planLastRefillMs).toISOString()
                                    : null,
                                addon_last_refill_at: addonLastRefillMs
                                    ? new Date(addonLastRefillMs).toISOString()
                                    : null,
                                current_stars:
                                    dailyStars + planStars + addonStars,
                                updated_at: new Date().toISOString(),
                            })
                            .eq("user_id", userId)
                            .select(
                                "daily_stars,plan_stars,addon_stars,daily_last_refill_at,plan_last_refill_at,addon_last_refill_at,first_login_bonus_granted,first_time_login_grant,current_stars"
                            )
                            .maybeSingle()
                        if (updated) {
                            return NextResponse.json({ data: [updated] })
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
