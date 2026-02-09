import { supabaseAdmin } from "@/lib/supabase"
import {
    getPlanStars,
    parseSubscriptionPlanKey,
    type BillingCycle,
    type SubscriptionPlanTier,
} from "@/lib/payments/subscription-plans"

export type ActiveSubscriptionInfo = {
    planKey: string
    tier: SubscriptionPlanTier
    cycle: BillingCycle
    baseStars: number
    addonStars: number
    totalStars: number
    currentPeriodStart: number | null
    currentPeriodEnd: number | null
    cancelAtPeriodEnd: boolean
    status: string
}

export async function getActiveSubscriptionInfo(
    userId: string
): Promise<ActiveSubscriptionInfo | null> {
    if (!supabaseAdmin) return null
    const { data, error } = await supabaseAdmin
        .from("billing_subscriptions")
        .select(
            "plan, status, current_period_start, current_period_end, cancel_at_period_end, addon_stars"
        )
        .eq("user_id", userId)
        .in("status", ["active", "trialing", "canceled", "cancelled"])
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle()

    if (error || !data?.plan) return null
    const planInfo = parseSubscriptionPlanKey(data.plan)
    if (!planInfo) return null

    const now = Date.now()
    if (
        (data.status === "canceled" || data.status === "cancelled") &&
        (!data.current_period_end ||
            new Date(data.current_period_end).getTime() <= now)
    ) {
        return null
    }

    const baseStars = getPlanStars(planInfo.tier, planInfo.cycle)
    const addonStars =
        typeof data.addon_stars === "number" ? data.addon_stars : 0
    const totalStars = baseStars + addonStars

    return {
        planKey: data.plan,
        tier: planInfo.tier,
        cycle: planInfo.cycle,
        baseStars,
        addonStars,
        totalStars,
        currentPeriodStart: data.current_period_start
            ? new Date(data.current_period_start).getTime()
            : null,
        currentPeriodEnd: data.current_period_end
            ? new Date(data.current_period_end).getTime()
            : null,
        cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
        status: data.status,
    }
}
