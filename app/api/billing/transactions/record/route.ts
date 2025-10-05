import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

type RecordBody = {
    userId?: string
    type?:
        | "one_time"
        | "subscription_initial"
        | "subscription_recurring"
        | "refund"
        | "chargeback"
    amountUsd?: number
    currency?: string
    reference?: string
    provider?: string
    providerPaymentId?: string | null
    subscription?: {
        providerSubscriptionId?: string
        plan?: string
        status?: string
        currentPeriodStart?: string | null
        currentPeriodEnd?: string | null
        cancelAtPeriodEnd?: boolean
    } | null
}

export async function POST(req: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "SERVER_NOT_CONFIGURED" },
                { status: 500 }
            )
        }

        const body = (await req.json()) as RecordBody
        const {
            userId,
            type,
            amountUsd,
            currency = "USD",
            reference,
            provider = "checkout_com",
            providerPaymentId = null,
            subscription,
        } = body || {}

        if (!userId) {
            return NextResponse.json(
                { error: "MISSING_USER_ID" },
                { status: 400 }
            )
        }
        if (!type) {
            return NextResponse.json({ error: "MISSING_TYPE" }, { status: 400 })
        }
        if (
            !Number.isFinite(amountUsd as number) ||
            (amountUsd as number) < 0
        ) {
            return NextResponse.json({ error: "BAD_AMOUNT" }, { status: 400 })
        }

        let subscriptionId: string | null = null

        if (subscription?.providerSubscriptionId) {
            // Upsert subscription row
            const { data: existing, error: findErr } = await supabaseAdmin
                .from("billing_subscriptions")
                .select("id")
                .eq(
                    "provider_subscription_id",
                    subscription.providerSubscriptionId
                )
                .maybeSingle()

            if (findErr)
                return NextResponse.json(
                    { error: findErr.message },
                    { status: 400 }
                )

            if (existing?.id) {
                subscriptionId = existing.id
                const { error: updErr } = await supabaseAdmin
                    .from("billing_subscriptions")
                    .update({
                        plan: subscription.plan ?? undefined,
                        status: subscription.status ?? undefined,
                        current_period_start:
                            subscription.currentPeriodStart ?? undefined,
                        current_period_end:
                            subscription.currentPeriodEnd ?? undefined,
                        cancel_at_period_end:
                            subscription.cancelAtPeriodEnd ?? undefined,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", subscriptionId)
                if (updErr)
                    return NextResponse.json(
                        { error: updErr.message },
                        { status: 400 }
                    )
            } else {
                const { data: ins, error: insErr } = await supabaseAdmin
                    .from("billing_subscriptions")
                    .insert({
                        user_id: userId,
                        provider,
                        provider_subscription_id:
                            subscription.providerSubscriptionId,
                        plan: subscription.plan ?? null,
                        status: subscription.status ?? "active",
                        current_period_start:
                            subscription.currentPeriodStart ?? null,
                        current_period_end:
                            subscription.currentPeriodEnd ?? null,
                        cancel_at_period_end: Boolean(
                            subscription.cancelAtPeriodEnd
                        ),
                    })
                    .select("id")
                    .single()
                if (insErr)
                    return NextResponse.json(
                        { error: insErr.message },
                        { status: 400 }
                    )
                subscriptionId = ins.id
            }
        }

        const { data, error } = await supabaseAdmin
            .from("billing_transactions")
            .insert({
                user_id: userId,
                type,
                provider,
                provider_payment_id: providerPaymentId,
                amount_cents: Math.round((amountUsd as number) * 100),
                currency: (currency || "USD").toUpperCase(),
                reference: reference ?? null,
                status: "succeeded",
                subscription_id: subscriptionId,
            })
            .select("id")
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }
        return NextResponse.json({ ok: true, id: data?.id })
    } catch (err: unknown) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "SERVER_ERROR" },
            { status: 500 }
        )
    }
}
