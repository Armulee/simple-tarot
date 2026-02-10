import type Stripe from "stripe"

import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { supabaseAdmin } from "@/lib/supabase"
import {
    getPlanKeyFromPriceId,
    getPlanStars,
    parseSubscriptionPlanKey,
} from "@/lib/payments/subscription-plans"

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get("authorization")
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const token = authHeader.split(" ")[1]
        const {
            data: { user },
            error: authError,
        } = await supabaseAdmin!.auth.getUser(token)

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { priceId } = await request.json()
        if (!priceId) {
            return NextResponse.json(
                { error: "Price ID is required" },
                { status: 400 }
            )
        }

        const { data: subRow, error: subError } = await supabaseAdmin!
            .from("billing_subscriptions")
            .select("id, provider_subscription_id, status, plan")
            .eq("user_id", user.id)
            .in("status", ["active", "trialing"])
            .maybeSingle()

        if (subError) {
            return NextResponse.json(
                { error: subError.message },
                { status: 500 }
            )
        }

        if (!subRow?.provider_subscription_id) {
            return NextResponse.json(
                { error: "No active subscription found" },
                { status: 400 }
            )
        }

        const subscription = await stripe.subscriptions.retrieve(
            subRow.provider_subscription_id
        )
        const planItem =
            subscription.items.data.find(
                (entry) => getPlanKeyFromPriceId(entry.price?.id ?? null)
            ) ?? subscription.items.data[0]
        if (!planItem?.id) {
            return NextResponse.json(
                { error: "Subscription item not found" },
                { status: 400 }
            )
        }

        const nextPrice = await stripe.prices.retrieve(priceId)
        const currentAmount = planItem.price?.unit_amount ?? null
        const nextAmount = nextPrice.unit_amount ?? null
        const isDowngrade =
            typeof currentAmount === "number" &&
            typeof nextAmount === "number" &&
            nextAmount < currentAmount

        const updated = await stripe.subscriptions.update(subscription.id, {
            items: [{ id: planItem.id, price: priceId }],
            proration_behavior: isDowngrade ? "none" : "always_invoice",
            billing_cycle_anchor: "unchanged",
        })
        const updatedSubscription = updated as Stripe.Subscription & {
            current_period_start?: number | null
            current_period_end?: number | null
            cancel_at_period_end?: boolean | null
            customer?: string | null
        }

        const planKey = getPlanKeyFromPriceId(priceId)
        const prevPlanInfo = parseSubscriptionPlanKey(subRow.plan)
        const nextPlanInfo = parseSubscriptionPlanKey(planKey)
        if (planKey) {
            await supabaseAdmin!
                .from("billing_subscriptions")
                .update({
                    plan: planKey,
                    status: updatedSubscription.status ?? "active",
                    current_period_start:
                        updatedSubscription.current_period_start
                        ? new Date(
                              updatedSubscription.current_period_start * 1000
                          ).toISOString()
                        : null,
                    current_period_end: updatedSubscription.current_period_end
                        ? new Date(
                              updatedSubscription.current_period_end * 1000
                          ).toISOString()
                        : null,
                    cancel_at_period_end:
                        updatedSubscription.cancel_at_period_end ?? false,
                    provider_customer_id:
                        typeof updatedSubscription.customer === "string"
                            ? updatedSubscription.customer
                            : undefined,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", subRow.id)
        }

        if (!isDowngrade && prevPlanInfo && nextPlanInfo && supabaseAdmin) {
            const prevCap = getPlanStars(prevPlanInfo.tier, prevPlanInfo.cycle)
            const nextCap = getPlanStars(nextPlanInfo.tier, nextPlanInfo.cycle)
            const delta = nextCap - prevCap
            if (delta > 0) {
                const { data: starRow } = await supabaseAdmin
                    .from("stars")
                    .select("daily_stars,plan_stars,addon_stars")
                    .eq("user_id", user.id)
                    .maybeSingle()
                if (starRow) {
                    const daily = Number(starRow.daily_stars ?? 0)
                    const plan = Number(starRow.plan_stars ?? 0)
                    const addon = Number(starRow.addon_stars ?? 0)
                    const nextPlanStars = Math.max(0, plan + delta)
                    await supabaseAdmin
                        .from("stars")
                        .update({
                            plan_stars: nextPlanStars,
                            current_stars: daily + nextPlanStars + addon,
                            updated_at: new Date().toISOString(),
                        })
                        .eq("user_id", user.id)
                }
            }
        }

        return NextResponse.json({ subscription: updated })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
