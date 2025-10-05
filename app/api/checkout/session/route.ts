import { NextRequest, NextResponse } from "next/server"

// Create a Checkout.com Payment Session (server-side)
// Docs: https://www.checkout.com/docs/get-started
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { amountUsd, reference, currency, customer } = (body ?? {}) as {
            amountUsd?: number
            reference?: string
            currency?: string
            customer?: { name?: string; email?: string }
        }

        if (!Number.isFinite(amountUsd) || (amountUsd as number) <= 0) {
            return NextResponse.json({ error: "BAD_AMOUNT" }, { status: 400 })
        }

        const secretKey = process.env.CHECKOUT_SECRET_KEY
        const publicKey = process.env.NEXT_PUBLIC_CHECKOUT_PUBLIC_KEY
        const processingChannelId = process.env.CHECKOUT_PROCESSING_CHANNEL_ID

        if (!secretKey || !publicKey) {
            return NextResponse.json(
                { error: "CHECKOUT_ENV_MISSING" },
                { status: 500 }
            )
        }

        const url = new URL(req.url)
        const origin = `${url.protocol}//${url.host}`
        const successUrl = `${origin}/stars?payment_status=success`
        const failureUrl = `${origin}/stars?payment_status=failure`
        const data = JSON.stringify({
            amount: Math.round((amountUsd as number) * 100),
            currency: (currency || "USD").toUpperCase(),
            reference: reference || `stars-${Date.now()}`,
            processing_channel_id: processingChannelId,
            customer:
                customer?.email || customer?.name
                    ? {
                          name: customer?.name,
                          email: customer?.email,
                      }
                    : undefined,
            billing: {
                address: {
                    country: "US",
                },
            },
            success_url: successUrl,
            failure_url: failureUrl,
        })

        const response = await fetch(
            "https://toxtltqc.api.sandbox.checkout.com/payment-sessions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${secretKey}`,
                },
                body: data,
            }
        )

        const session = await response.text()

        if (!response.ok) {
            console.error(response)
            return NextResponse.json(
                {
                    error: "SESSION_CREATE_FAILED",
                    details: session,
                },
                { status: response.status }
            )
        }

        return NextResponse.json({ ...JSON.parse(session) }, { status: 200 })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 })
    }
}
