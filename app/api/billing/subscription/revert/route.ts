import type Stripe from "stripe"

import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { supabaseAdmin } from "@/lib/supabase"
import {
    getPlanKeyFromPriceId,
    getSubscriptionPriceId,
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

        const { data: subRow, error: subError } = await supabaseAdmin!
            .from("billing_subscriptions")
            .select(
                "id, plan, pending_plan, provider_subscription_id, current_period_start, current_period_end"
            )
            .eq("user_id", user.id)
            .in("status", ["active", "trialing"])
            .maybeSingle()

        if (subError || !subRow?.provider_subscription_id) {
            return NextResponse.json(
                { error: "No active subscription found" },
                { status: 400 }
            )
        }

        if (!subRow.pending_plan) {
            return NextResponse.json(
                { error: "No pending downgrade to revert" },
                { status: 400 }
            )
        }

        const planInfo = parseSubscriptionPlanKey(subRow.plan)
        if (!planInfo) {
            return NextResponse.json(
                { error: "Invalid current plan" },
                { status: 400 }
            )
        }

        const priceId = getSubscriptionPriceId(planInfo.tier, planInfo.cycle)
        if (!priceId) {
            return NextResponse.json(
                { error: "Price ID not configured" },
                { status: 400 }
            )
        }

        const subscription = await stripe.subscriptions.retrieve(
            subRow.provider_subscription_id
        )
        const planItem =
            subscription.items.data.find((entry) =>
                getPlanKeyFromPriceId(entry.price?.id ?? null)
            ) ?? subscription.items.data[0]
        if (!planItem?.id) {
            return NextResponse.json(
                { error: "Subscription item not found" },
                { status: 400 }
            )
        }

        const updated = await stripe.subscriptions.update(subscription.id, {
            items: [{ id: planItem.id, price: priceId }],
            proration_behavior: "none",
            billing_cycle_anchor: "unchanged",
        })
        const updatedSubscription = updated as Stripe.Subscription & {
            current_period_start?: number | null
            current_period_end?: number | null
            cancel_at_period_end?: boolean | null
            customer?: string | null
        }

        await supabaseAdmin!
            .from("billing_subscriptions")
            .update({
                pending_plan: null,
                pending_change_at: null,
                status: updatedSubscription.status ?? "active",
                current_period_start:
                    typeof updatedSubscription.current_period_start === "number"
                        ? new Date(
                              updatedSubscription.current_period_start * 1000
                          ).toISOString()
                        : subRow.current_period_start ?? null,
                current_period_end:
                    typeof updatedSubscription.current_period_end === "number"
                        ? new Date(
                              updatedSubscription.current_period_end * 1000
                          ).toISOString()
                        : subRow.current_period_end ?? null,
                cancel_at_period_end:
                    updatedSubscription.cancel_at_period_end ?? false,
                provider_customer_id:
                    typeof updatedSubscription.customer === "string"
                        ? updatedSubscription.customer
                        : undefined,
                updated_at: new Date().toISOString(),
            })
            .eq("id", subRow.id)

        return NextResponse.json({ ok: true })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
