import { NextResponse } from "next/server"
import type Stripe from "stripe"

import { stripe } from "@/lib/stripe"
import { grantPackPurchase } from "@/lib/payments/grant-purchase"

// Stripe signature verification needs the raw, unparsed body.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Stripe webhook — the authoritative path for granting one-time star packs.
 *
 * Configure in the Stripe dashboard: add an endpoint pointing at
 * /api/stripe/webhook subscribed to `checkout.session.completed`, and set
 * STRIPE_WEBHOOK_SECRET to that endpoint's signing secret.
 *
 * Grants are idempotent (keyed on the checkout session id), so Stripe's
 * automatic retries and the /success-page safety net never double-grant.
 * Subscriptions are still finalized on the /success page and are ignored here.
 */
export async function POST(req: Request) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET
    if (!secret) {
        console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET not configured")
        return NextResponse.json(
            { error: "WEBHOOK_NOT_CONFIGURED" },
            { status: 500 },
        )
    }

    const signature = req.headers.get("stripe-signature")
    if (!signature) {
        return NextResponse.json({ error: "NO_SIGNATURE" }, { status: 400 })
    }

    const rawBody = await req.text()

    let event: Stripe.Event
    try {
        event = stripe.webhooks.constructEvent(rawBody, signature, secret)
    } catch (err) {
        console.error(
            "[stripe/webhook] signature verification failed",
            err instanceof Error ? err.message : err,
        )
        return NextResponse.json({ error: "BAD_SIGNATURE" }, { status: 400 })
    }

    try {
        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session

            // One-time packs only. Subscriptions are handled on /success.
            const mode = session.metadata?.mode || session.mode
            const isPack =
                session.mode === "payment" && mode !== "subscribe"

            if (!isPack) {
                return NextResponse.json({ received: true, skipped: "not_pack" })
            }

            // Never grant on unpaid sessions.
            if (session.payment_status !== "paid") {
                return NextResponse.json({
                    received: true,
                    skipped: "unpaid",
                })
            }

            const userId =
                session.metadata?.userId || session.client_reference_id || ""
            if (!userId) {
                console.error("[stripe/webhook] no userId on session", session.id)
                return NextResponse.json({ received: true, skipped: "no_user" })
            }

            // Resolve the purchased price id from the session's line items.
            const lineItems = await stripe.checkout.sessions.listLineItems(
                session.id,
                { limit: 1 },
            )
            const priceId = lineItems.data[0]?.price?.id
            if (!priceId) {
                console.error(
                    "[stripe/webhook] no price on session",
                    session.id,
                )
                return NextResponse.json({ received: true, skipped: "no_price" })
            }

            const result = await grantPackPurchase({
                userId,
                sessionId: session.id,
                priceId,
                amountCents: session.amount_total ?? 0,
                currency: (session.currency ?? "usd").toUpperCase(),
            })

            if (result.status === "error") {
                // Return 500 so Stripe retries the delivery.
                return NextResponse.json(
                    { error: result.error },
                    { status: 500 },
                )
            }

            return NextResponse.json({ received: true, result: result.status })
        }

        // Other event types are acknowledged but not acted on here.
        return NextResponse.json({ received: true })
    } catch (err) {
        console.error(
            "[stripe/webhook] handler error",
            err instanceof Error ? err.message : err,
        )
        return NextResponse.json({ error: "HANDLER_ERROR" }, { status: 500 })
    }
}
