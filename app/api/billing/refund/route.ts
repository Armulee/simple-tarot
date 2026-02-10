import type Stripe from "stripe"

import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { supabaseAdmin } from "@/lib/supabase"

const REFUND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export async function POST(request: Request) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "SUPABASE_ADMIN_NOT_CONFIGURED" },
                { status: 500 }
            )
        }
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

        const { transactionId } = await request.json()
        if (!transactionId) {
            return NextResponse.json(
                { error: "Transaction ID is required" },
                { status: 400 }
            )
        }

        const { data: tx, error: txError } = await supabaseAdmin!
            .from("billing_transactions")
            .select("id, user_id, provider, provider_payment_id, status, created_at")
            .eq("id", transactionId)
            .eq("user_id", user.id)
            .maybeSingle()

        if (txError || !tx) {
            return NextResponse.json(
                { error: "Transaction not found" },
                { status: 404 }
            )
        }

        if (tx.status === "refunded") {
            return NextResponse.json(
                { error: "Transaction already refunded" },
                { status: 400 }
            )
        }

        const createdAtMs = new Date(tx.created_at).getTime()
        if (Number.isFinite(createdAtMs)) {
            const ageMs = Date.now() - createdAtMs
            if (ageMs > REFUND_WINDOW_MS) {
                return NextResponse.json(
                    { error: "Refund window expired" },
                    { status: 400 }
                )
            }
        }

        if (tx.provider !== "stripe") {
            return NextResponse.json(
                { error: "Refunds only supported for Stripe payments" },
                { status: 400 }
            )
        }

        const paymentId = tx.provider_payment_id
        if (!paymentId) {
            return NextResponse.json(
                { error: "Missing payment reference" },
                { status: 400 }
            )
        }

        let paymentIntentId: string | null = null
        if (paymentId.startsWith("pi_")) {
            paymentIntentId = paymentId
        } else if (paymentId.startsWith("cs_")) {
            const session = await stripe.checkout.sessions.retrieve(paymentId, {
                expand: ["payment_intent"],
            })
            const pi = session.payment_intent
            paymentIntentId =
                typeof pi === "string" ? pi : pi?.id ?? null
        } else if (paymentId.startsWith("in_")) {
            type InvoiceWithPaymentIntent = Stripe.Invoice & {
                payment_intent?: string | Stripe.PaymentIntent | null
            }
            const invoice = await stripe.invoices.retrieve(paymentId, {
                expand: ["payment_intent"],
            })
            const invoiceData = invoice as InvoiceWithPaymentIntent
            const pi = invoiceData.payment_intent
            paymentIntentId =
                typeof pi === "string" ? pi : pi?.id ?? null
        }

        if (!paymentIntentId) {
            return NextResponse.json(
                { error: "Unable to resolve payment intent" },
                { status: 400 }
            )
        }

        const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
        })

        await supabaseAdmin!
            .from("billing_transactions")
            .update({
                status: "refunded",
            })
            .eq("id", tx.id)

        return NextResponse.json({ ok: true, refundId: refund.id })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
