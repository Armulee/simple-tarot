import { NextResponse } from "next/server"
import { headers } from "next/headers"

import { stripe } from "@/lib/stripe"

export async function POST(req: Request) {
    try {
        const { priceId, userId, mode, couponId, email } = await req.json()
        
        // Validate required fields
        if (!priceId || (typeof priceId === "string" && priceId.trim() === "")) {
            return NextResponse.json(
                { error: "Price ID is required. Please ensure Stripe price IDs are configured in your environment variables." },
                { status: 400 }
            )
        }

        const headersList = await headers()
        const origin = headersList.get("origin")

        if (!origin) {
            return NextResponse.json(
                { error: "Origin header is required" },
                { status: 400 }
            )
        }

        // Determine Stripe checkout mode based on request mode
        // "subscribe" mode requires "subscription" in Stripe, "pack" mode uses "payment"
        const stripeMode = mode === "subscribe" ? "subscription" : "payment"

        // Create Checkout Sessions from body params.
        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    // Provide the exact Price ID (for example, price_1234) of the product you want to sell
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: stripeMode,
            discounts: couponId ? [{ coupon: couponId }] : undefined,
            success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            customer_creation: stripeMode === "payment" ? "always" : undefined,
            customer_email: typeof email === "string" ? email : undefined,
            client_reference_id: typeof userId === "string" ? userId : undefined,
            automatic_tax: { enabled: true },
            metadata: {
                userId: userId || "",
                mode: mode || "pack",
            },
        })
        if (!session.url) {
            return NextResponse.json(
                { error: "No session URL" },
                { status: 500 }
            )
        }
        return NextResponse.json({ url: session.url }, { status: 200 })
    } catch (err) {
        if (err instanceof Error) {
            return NextResponse.json({ error: err.message }, { status: 500 })
        }
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
