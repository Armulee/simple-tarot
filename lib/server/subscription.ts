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
    stars: number
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
            "plan, status, current_period_start, current_period_end, cancel_at_period_end"
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

    return {
        planKey: data.plan,
        tier: planInfo.tier,
        cycle: planInfo.cycle,
        stars: getPlanStars(planInfo.tier, planInfo.cycle),
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
