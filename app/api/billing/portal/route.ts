import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { stripe } from "@/lib/stripe"
import { supabaseAdmin } from "@/lib/supabase"

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
            .select("id, provider_subscription_id, provider_customer_id")
            .eq("user_id", user.id)
            .in("status", ["active", "trialing"])
            .maybeSingle()

        if (subError || !subRow?.provider_subscription_id) {
            return NextResponse.json(
                { error: "No active subscription found" },
                { status: 400 }
            )
        }

        let customerId = subRow.provider_customer_id
        if (!customerId) {
            const subscription = await stripe.subscriptions.retrieve(
                subRow.provider_subscription_id
            )
            customerId =
                typeof subscription.customer === "string"
                    ? subscription.customer
                    : null
            if (customerId) {
                await supabaseAdmin!
                    .from("billing_subscriptions")
                    .update({
                        provider_customer_id: customerId,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", subRow.id)
            }
        }

        if (!customerId) {
            return NextResponse.json(
                { error: "Customer record not found" },
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

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${origin}/billing`,
        })

        return NextResponse.json({ url: session.url }, { status: 200 })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
