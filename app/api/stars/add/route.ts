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
        // For authenticated users, regular adds are capped to the daily-star cap (5,
        // must match `v_cap` in supabase-schema.sql). Purchases should use subscription add-ons.
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
            daily_stars?: number
            plan_stars?: number
            addon_stars?: number
            engagement_stars_current?: number
            engagement_stars_total?: number
            daily_last_refill_at?: string | null
            plan_last_refill_at?: string | null
            addon_last_refill_at?: string | null
        }
        let dailyStars = Number(row.daily_stars ?? 0)
        let planStars = Number(row.plan_stars ?? 0)
        let addonStars = Number(row.addon_stars ?? 0)
        const engagementStarsCurrent = Number(row.engagement_stars_current ?? 0)
        const engagementStarsTotal = Number(row.engagement_stars_total ?? 0)
        let planLastRefillMs = row.plan_last_refill_at
            ? new Date(row.plan_last_refill_at).getTime()
            : null
        let addonLastRefillMs = row.addon_last_refill_at
            ? new Date(row.addon_last_refill_at).getTime()
            : null
        const subscription = supabaseAdmin
            ? await getActiveSubscriptionInfo(userId)
            : null
        if (
            supabaseAdmin &&
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

        if (!supabaseAdmin) {
            const { data, error } = await supabase.rpc("star_add", {
                p_anon_device_id: null,
                p_amount: amount,
                p_user_id: userId,
            })
            if (error)
                return NextResponse.json(
                    { error: error.message },
                    { status: 400 }
                )
            return NextResponse.json({ data })
        }

        const dailyCap = 5
        const nextDaily =
            dailyStars >= dailyCap
                ? dailyStars
                : Math.min(dailyCap, Math.max(0, dailyStars + Number(amount)))
        const { data, error } = await supabaseAdmin
            .from("stars")
            .update({
                daily_stars: nextDaily,
                plan_stars: planStars,
                addon_stars: addonStars,
                engagement_stars_current:
                    engagementStarsCurrent + Number(amount),
                engagement_stars_total: engagementStarsTotal + Number(amount),
                plan_last_refill_at: planLastRefillMs
                    ? new Date(planLastRefillMs).toISOString()
                    : null,
                addon_last_refill_at: addonLastRefillMs
                    ? new Date(addonLastRefillMs).toISOString()
                    : null,
                current_stars: nextDaily + planStars + addonStars,
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId)
            .select(
                "daily_stars,plan_stars,addon_stars,engagement_stars_current,engagement_stars_total,current_stars,daily_last_refill_at,plan_last_refill_at,addon_last_refill_at"
            )
            .maybeSingle()
        if (error)
            return NextResponse.json({ error: error.message }, { status: 400 })
        return NextResponse.json({ data: data ? [data] : [] })
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
