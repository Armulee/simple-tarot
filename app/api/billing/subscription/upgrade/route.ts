import type Stripe from "stripe"

import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { supabaseAdmin } from "@/lib/supabase"
import { getPlanKeyFromPriceId } from "@/lib/payments/subscription-plans"

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
            .select("id, provider_subscription_id, status")
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
        const item = subscription.items.data[0]
        if (!item?.id) {
            return NextResponse.json(
                { error: "Subscription item not found" },
                { status: 400 }
            )
        }

        const nextPrice = await stripe.prices.retrieve(priceId)
        const currentAmount = item.price?.unit_amount ?? null
        const nextAmount = nextPrice.unit_amount ?? null
        const isDowngrade =
            typeof currentAmount === "number" &&
            typeof nextAmount === "number" &&
            nextAmount < currentAmount

        const updated = await stripe.subscriptions.update(subscription.id, {
            items: [{ id: item.id, price: priceId }],
            proration_behavior: isDowngrade ? "none" : "always_invoice",
            billing_cycle_anchor: isDowngrade ? "unchanged" : undefined,
        })
        const updatedSubscription = updated as Stripe.Subscription & {
            current_period_start?: number | null
            current_period_end?: number | null
            cancel_at_period_end?: boolean | null
        }

        const planKey = getPlanKeyFromPriceId(priceId)
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
                    updated_at: new Date().toISOString(),
                })
                .eq("id", subRow.id)
        }

        return NextResponse.json({ subscription: updated })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
