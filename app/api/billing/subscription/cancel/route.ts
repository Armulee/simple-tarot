import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(req: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "SERVER_NOT_CONFIGURED" },
                { status: 500 }
            )
        }

        const { subscriptionId, userId } = await req.json()

        if (!subscriptionId || !userId) {
            return NextResponse.json(
                { error: "MISSING_REQUIRED_FIELDS" },
                { status: 400 }
            )
        }

        // 1. Verify the subscription belongs to the user
        const { data: sub, error: subErr } = await supabaseAdmin
            .from("billing_subscriptions")
            .select("provider_subscription_id, status")
            .eq("id", subscriptionId)
            .eq("user_id", userId)
            .maybeSingle()

        if (subErr || !sub) {
            return NextResponse.json(
                { error: "SUBSCRIPTION_NOT_FOUND" },
                { status: 404 }
            )
        }

        if (sub.status !== "active") {
            return NextResponse.json(
                { error: "SUBSCRIPTION_NOT_ACTIVE" },
                { status: 400 }
            )
        }

        if (!sub.provider_subscription_id) {
            return NextResponse.json(
                { error: "NOT_A_STRIPE_SUBSCRIPTION" },
                { status: 400 }
            )
        }

        // 2. Cancel in Stripe (set to cancel at period end)
        await stripe.subscriptions.update(sub.provider_subscription_id, {
            cancel_at_period_end: true,
        })

        // 3. Update database
        const { error: updateErr } = await supabaseAdmin
            .from("billing_subscriptions")
            .update({
                cancel_at_period_end: true,
                updated_at: new Date().toISOString(),
            })
            .eq("id", subscriptionId)

        if (updateErr) {
            return NextResponse.json(
                { error: updateErr.message },
                { status: 500 }
            )
        }

        return NextResponse.json({ ok: true })
    } catch (err: unknown) {
        console.error("Error cancelling subscription:", err)
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "SERVER_ERROR" },
            { status: 500 }
        )
    }
}



