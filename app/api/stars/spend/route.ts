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
                daily_stars?: number
                plan_stars?: number
                addon_stars?: number
                engagement_stars_current?: number
                engagement_stars_total?: number
                daily_last_refill_at?: string | null
                plan_last_refill_at?: string | null
                addon_last_refill_at?: string | null
            }
            const dailyStars = Number(row.daily_stars ?? 0)
            let planStars = Number(row.plan_stars ?? 0)
            let addonStars = Number(row.addon_stars ?? 0)
            const engagementStarsCurrent = Number(
                row.engagement_stars_current ?? 0
            )
            const engagementStarsTotal = Number(row.engagement_stars_total ?? 0)
            let planLastRefillMs = row.plan_last_refill_at
                ? new Date(row.plan_last_refill_at).getTime()
                : null
            let addonLastRefillMs = row.addon_last_refill_at
                ? new Date(row.addon_last_refill_at).getTime()
                : null
            let dailyLastRefillAt = row.daily_last_refill_at ?? null

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

            let remaining = amount
            let nextDaily = dailyStars
            let nextPlan = planStars
            let nextAddon = addonStars

            if (nextDaily >= remaining) {
                nextDaily -= remaining
                remaining = 0
            } else {
                remaining -= nextDaily
                nextDaily = 0
            }

            if (remaining > 0) {
                if (nextPlan >= remaining) {
                    nextPlan -= remaining
                    remaining = 0
                } else {
                    remaining -= nextPlan
                    nextPlan = 0
                }
            }

            if (remaining > 0) {
                if (nextAddon >= remaining) {
                    nextAddon -= remaining
                    remaining = 0
                } else {
                    remaining -= nextAddon
                    nextAddon = 0
                }
            }

            if (remaining > 0) {
                return NextResponse.json({
                    data: [
                        {
                            ok: false,
                            daily_stars: dailyStars,
                            plan_stars: planStars,
                            addon_stars: addonStars,
                            engagement_stars_current: Math.max(
                                0,
                                engagementStarsCurrent - amount
                            ),
                            engagement_stars_total: engagementStarsTotal,
                            current_stars: dailyStars + planStars + addonStars,
                            daily_last_refill_at: dailyLastRefillAt,
                        },
                    ],
                })
            }

            if (dailyStars >= 12 && nextDaily < 12) {
                dailyLastRefillAt = new Date().toISOString()
            }

            const { data: updated } = await supabaseAdmin
                .from("stars")
                .update({
                    daily_stars: nextDaily,
                    plan_stars: nextPlan,
                    addon_stars: nextAddon,
                    engagement_stars_current: Math.max(
                        0,
                        engagementStarsCurrent - amount
                    ),
                    engagement_stars_total: engagementStarsTotal,
                    plan_last_refill_at: planLastRefillMs
                        ? new Date(planLastRefillMs).toISOString()
                        : null,
                    addon_last_refill_at: addonLastRefillMs
                        ? new Date(addonLastRefillMs).toISOString()
                        : null,
                    daily_last_refill_at: dailyLastRefillAt,
                    last_refill_at: dailyLastRefillAt,
                    current_stars: nextDaily + nextPlan + nextAddon,
                    updated_at: new Date().toISOString(),
                })
                .eq("user_id", userId)
                .select(
                    "daily_stars,plan_stars,addon_stars,engagement_stars_current,engagement_stars_total,current_stars,daily_last_refill_at"
                )
                .maybeSingle()

            return NextResponse.json({
                data: [
                    {
                        ok: true,
                        daily_stars: updated?.daily_stars ?? nextDaily,
                        plan_stars: updated?.plan_stars ?? nextPlan,
                        addon_stars: updated?.addon_stars ?? nextAddon,
                        engagement_stars_current:
                            updated?.engagement_stars_current ??
                            Math.max(0, engagementStarsCurrent - amount),
                        engagement_stars_total:
                            updated?.engagement_stars_total ??
                            engagementStarsTotal,
                        current_stars:
                            updated?.current_stars ??
                            nextDaily + nextPlan + nextAddon,
                        daily_last_refill_at:
                            updated?.daily_last_refill_at ?? dailyLastRefillAt,
                    },
                ],
            })
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
