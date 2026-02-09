import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import {
    getPlanStars,
    parseSubscriptionPlanKey,
    type BillingCycle,
    type SubscriptionPlanTier,
} from "@/lib/payments/subscription-plans"

type ActiveSubscription = {
    id: string
    planKey: string
    tier: SubscriptionPlanTier
    cycle: BillingCycle
    baseStars: number
    addonStars: number
    totalStars: number
    status: string
    currentPeriodStart: number | null
    currentPeriodEnd: number | null
    cancelAtPeriodEnd: boolean
}

export function useActiveSubscription() {
    const { user } = useAuth()
    const [subscription, setSubscription] = useState<ActiveSubscription | null>(
        null
    )
    const [loading, setLoading] = useState(false)

    const refresh = useCallback(async () => {
        if (!user) {
            setSubscription(null)
            return
        }
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from("billing_subscriptions")
                .select(
                    "id, plan, status, current_period_start, current_period_end, cancel_at_period_end, addon_stars"
                )
                .eq("user_id", user.id)
                .in("status", ["active", "trialing", "canceled", "cancelled"])
                .order("current_period_end", { ascending: false })
                .limit(1)
                .maybeSingle()

            if (error || !data?.plan) {
                setSubscription(null)
                return
            }

            const planInfo = parseSubscriptionPlanKey(data.plan)
            if (!planInfo) {
                setSubscription(null)
                return
            }

            const now = Date.now()
            if (
                (data.status === "canceled" ||
                    data.status === "cancelled") &&
                (!data.current_period_end ||
                    new Date(data.current_period_end).getTime() <= now)
            ) {
                setSubscription(null)
                return
            }

            const baseStars = getPlanStars(planInfo.tier, planInfo.cycle)
            const addonStars =
                typeof data.addon_stars === "number" ? data.addon_stars : 0
            const totalStars = baseStars + addonStars

            setSubscription({
                id: data.id,
                planKey: data.plan,
                tier: planInfo.tier,
                cycle: planInfo.cycle,
                baseStars,
                addonStars,
                totalStars,
                status: data.status,
                currentPeriodStart: data.current_period_start
                    ? new Date(data.current_period_start).getTime()
                    : null,
                currentPeriodEnd: data.current_period_end
                    ? new Date(data.current_period_end).getTime()
                    : null,
                cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
            })
        } catch {
            setSubscription(null)
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        void refresh()
    }, [refresh])

    return { subscription, loading, refresh }
}
