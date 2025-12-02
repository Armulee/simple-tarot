import { NextResponse } from "next/server"
import { headers } from "next/headers"

import { stripe } from "@/lib/stripe"

export async function POST(req: Request) {
    try {
        const { priceId } = await req.json()
        console.log(priceId)
        const headersList = await headers()
        const origin = headersList.get("origin")

        // Create Checkout Sessions from body params.
        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    // Provide the exact Price ID (for example, price_1234) of the product you want to sell
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
            automatic_tax: { enabled: true },
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
