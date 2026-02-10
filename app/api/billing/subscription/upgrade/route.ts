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
            .select(
                "id, provider_subscription_id, status, plan, current_period_start, current_period_end"
            )
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
            expand: ["latest_invoice"],
        })
        const updatedSubscription = updated as Stripe.Subscription & {
            current_period_start?: number | null
            current_period_end?: number | null
            cancel_at_period_end?: boolean | null
            customer?: string | null
            latest_invoice?: string | Stripe.Invoice | null
        }

        const planKey = getPlanKeyFromPriceId(priceId)
        const prevPlanInfo = parseSubscriptionPlanKey(subRow.plan)
        const nextPlanInfo = parseSubscriptionPlanKey(planKey)
        if (planKey) {
            const periodStart =
                typeof updatedSubscription.current_period_start === "number"
                    ? new Date(
                          updatedSubscription.current_period_start * 1000
                      ).toISOString()
                    : subRow.current_period_start ?? null
            const periodEnd =
                typeof updatedSubscription.current_period_end === "number"
                    ? new Date(
                          updatedSubscription.current_period_end * 1000
                      ).toISOString()
                    : subRow.current_period_end ?? null
            await supabaseAdmin!
                .from("billing_subscriptions")
                .update({
                    plan: planKey,
                    status: updatedSubscription.status ?? "active",
                    current_period_start: periodStart,
                    current_period_end: periodEnd,
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

        if (prevPlanInfo && nextPlanInfo && supabaseAdmin) {
            const prevCap = getPlanStars(prevPlanInfo.tier, prevPlanInfo.cycle)
            const nextCap = getPlanStars(nextPlanInfo.tier, nextPlanInfo.cycle)
            const delta = nextCap - prevCap
            const { data: starData } = await supabaseAdmin.rpc(
                "star_get_or_create",
                {
                    p_anon_device_id: null,
                    p_user_id: user.id,
                }
            )
            const starRow = starData?.[0] as
                | {
                      daily_stars?: number
                      plan_stars?: number
                      addon_stars?: number
                      plan_last_refill_at?: string | null
                  }
                | undefined
            if (starRow) {
                const daily = Number(starRow.daily_stars ?? 0)
                const plan = Number(starRow.plan_stars ?? 0)
                const addon = Number(starRow.addon_stars ?? 0)
                let nextPlanStars = plan
                if (!isDowngrade && delta > 0) {
                    nextPlanStars = Math.max(plan + delta, nextCap)
                }
                const planRefillAt =
                    starRow.plan_last_refill_at ??
                    (typeof updatedSubscription.current_period_start ===
                    "number"
                        ? new Date(
                              updatedSubscription.current_period_start * 1000
                          ).toISOString()
                        : subRow.current_period_start ?? null)
                if (nextPlanStars !== plan || planRefillAt !== null) {
                    await supabaseAdmin
                        .from("stars")
                        .update({
                            plan_stars: nextPlanStars,
                            plan_last_refill_at: planRefillAt,
                            current_stars: daily + nextPlanStars + addon,
                            updated_at: new Date().toISOString(),
                        })
                        .eq("user_id", user.id)
                }
            }
        }

        const latestInvoice = updatedSubscription.latest_invoice
        if (!isDowngrade && latestInvoice) {
            const invoiceId =
                typeof latestInvoice === "string"
                    ? latestInvoice
                    : latestInvoice.id
            if (invoiceId) {
                const invoice =
                    typeof latestInvoice === "string"
                        ? await stripe.invoices.retrieve(invoiceId)
                        : latestInvoice
                const amountPaid = invoice.amount_paid ?? 0
                const amountDue = invoice.amount_due ?? 0
                const amountCents =
                    amountPaid > 0 ? amountPaid : Math.max(0, amountDue)
                if (amountCents > 0) {
                    await supabaseAdmin!
                        .from("billing_transactions")
                        .insert({
                            user_id: user.id,
                            type: "subscription_recurring",
                            provider: "stripe",
                            provider_payment_id: invoice.id,
                            amount_cents: amountCents,
                            currency: (invoice.currency || "usd").toUpperCase(),
                            reference: `Subscription change: ${subscription.id}`,
                            status: "succeeded",
                            stars_amount: nextPlanInfo
                                ? getPlanStars(
                                      nextPlanInfo.tier,
                                      nextPlanInfo.cycle
                                  )
                                : null,
                            pack_name: planKey ?? "subscription",
                            subscription_id: subRow.id,
                        })
                        .select("id")
                        .single()
                }
            }
        }

        return NextResponse.json({ subscription: updated })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
