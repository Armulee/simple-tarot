import type Stripe from "stripe"

import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { supabaseAdmin } from "@/lib/supabase"
import { getPackById } from "@/lib/payments/star-products"
import { getPlanStars, parseSubscriptionPlanKey } from "@/lib/payments/subscription-plans"

type AddonItem = {
    priceId: string
    name: string
    quantity: number
    unitPriceUsd: number
    totalPriceUsd: number
    starsPerPeriod: number
    totalStars: number
}

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

        const { priceId, action } = await request.json()
        const normalizedAction =
            action === "remove" || action === "delete" ? "remove" : "add"

        if (!priceId) {
            return NextResponse.json(
                { error: "Price ID is required" },
                { status: 400 }
            )
        }

        const pack = getPackById(priceId)
        if (!pack) {
            return NextResponse.json(
                { error: "Unknown add-on pack" },
                { status: 400 }
            )
        }

        const { data: subRow, error: subError } = await supabaseAdmin!
            .from("billing_subscriptions")
            .select("id, plan, provider_subscription_id")
            .eq("user_id", user.id)
            .in("status", ["active", "trialing"])
            .maybeSingle()

        if (subError || !subRow?.provider_subscription_id) {
            return NextResponse.json(
                { error: "No active subscription found" },
                { status: 400 }
            )
        }

        const planInfo = parseSubscriptionPlanKey(subRow.plan)
        if (!planInfo || planInfo.tier !== "pro") {
            return NextResponse.json(
                { error: "Add-on packs require a Pro plan" },
                { status: 400 }
            )
        }

        const subscription = await stripe.subscriptions.retrieve(
            subRow.provider_subscription_id
        )

        const existingItem = subscription.items.data.find(
            (item) => item.price?.id === priceId
        )

        const items: Stripe.SubscriptionUpdateParams.Item[] = []
        if (normalizedAction === "add") {
            if (existingItem?.id) {
                items.push({
                    id: existingItem.id,
                    quantity: (existingItem.quantity ?? 1) + 1,
                })
            } else {
                items.push({
                    price: priceId,
                    quantity: 1,
                })
            }
        } else {
            if (!existingItem?.id) {
                return NextResponse.json(
                    { error: "Add-on pack not found" },
                    { status: 400 }
                )
            }
            const quantity = existingItem.quantity ?? 1
            if (quantity > 1) {
                items.push({
                    id: existingItem.id,
                    quantity: quantity - 1,
                })
            } else {
                items.push({
                    id: existingItem.id,
                    deleted: true,
                })
            }
        }

        const updated = await stripe.subscriptions.update(subscription.id, {
            items,
            proration_behavior:
                normalizedAction === "add" ? "always_invoice" : "none",
            billing_cycle_anchor: "unchanged",
        })

        const addonItems = buildAddonItems(updated)
        const addonStars = addonItems.reduce(
            (total, item) => total + item.totalStars,
            0
        )
        const addonAmountUsd = addonItems.reduce(
            (total, item) => total + item.totalPriceUsd,
            0
        )

        await supabaseAdmin!
            .from("billing_subscriptions")
            .update({
                addon_items: addonItems,
                addon_stars: addonStars,
                addon_amount_usd: addonAmountUsd,
                updated_at: new Date().toISOString(),
            })
            .eq("id", subRow.id)

        if (normalizedAction === "add") {
            const baseStars = getPlanStars(planInfo.tier, planInfo.cycle)
            const addStars = pack.stars + pack.bonus
            const { data: currentRow } = await supabaseAdmin!
                .from("stars")
                .select("daily_stars,plan_stars,addon_stars,addon_last_refill_at")
                .eq("user_id", user.id)
                .maybeSingle()
            if (currentRow) {
                const currentDaily = Number(currentRow.daily_stars ?? 0)
                const currentPlan = Number(currentRow.plan_stars ?? baseStars)
                const currentAddon = Number(currentRow.addon_stars ?? 0)
                const nextAddonBalance = Math.min(
                    addonStars,
                    Math.max(0, currentAddon + addStars)
                )
                const nextTotal =
                    currentDaily + currentPlan + nextAddonBalance
                const addonRefillAt =
                    currentRow.addon_last_refill_at ??
                    (typeof subscription.current_period_start === "number"
                        ? new Date(
                              subscription.current_period_start * 1000
                          ).toISOString()
                        : null)
                await supabaseAdmin!
                    .from("stars")
                    .update({
                        addon_stars: nextAddonBalance,
                        addon_last_refill_at: addonRefillAt,
                        current_stars: nextTotal,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("user_id", user.id)
            }
        }

        return NextResponse.json({
            ok: true,
            addonItems,
            addonStars,
            addonAmountUsd,
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

function buildAddonItems(subscription: Stripe.Subscription): AddonItem[] {
    const items = subscription.items?.data ?? []
    const addons: AddonItem[] = []

    for (const item of items) {
        const priceId = item.price?.id ?? ""
        const pack = getPackById(priceId)
        if (!pack) continue
        const quantity = item.quantity ?? 1
        const starsPerPeriod = pack.stars + pack.bonus
        const totalStars = starsPerPeriod * quantity
        const unitPriceUsd = pack.baseUsdPrice
        const totalPriceUsd = unitPriceUsd * quantity
        addons.push({
            priceId,
            name: pack.name,
            quantity,
            unitPriceUsd,
            totalPriceUsd,
            starsPerPeriod,
            totalStars,
        })
    }

    return addons
}
