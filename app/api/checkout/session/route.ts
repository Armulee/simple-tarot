"use server"

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { z } from "zod"
import {
    getPackById,
    getPackPrice,
    getSubscriptionPrice,
    normalizeCurrency,
    toMinorUnits,
    toStripeCurrency,
    type CurrencyCode,
} from "@/lib/payments/star-products"

const stripeSecretKey =
    process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_API_KEY ?? null

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null

const bodySchema = z.object({
    mode: z.enum(["pack", "subscribe"]),
    packId: z.string().optional(),
    plan: z.enum(["monthly", "annual"]).optional(),
    infinityTerm: z.enum(["month", "year"]).optional(),
    currency: z.enum(["USD", "THB"]).optional(),
    locale: z.string().optional(),
    userId: z.string().min(1),
    email: z.string().email().optional(),
})

type CheckoutBody = z.infer<typeof bodySchema>

type SessionConfig = {
    mode: Stripe.Checkout.SessionCreateParams.Mode
    line_items: Stripe.Checkout.SessionCreateParams.LineItem[]
}

function buildUrls(mode: CheckoutBody["mode"], locale: string | undefined, origin: string) {
    const safeLocale = locale ?? "en"
    const successPath = `/${safeLocale}/stars?checkout=success&session_id={CHECKOUT_SESSION_ID}`
    const cancelPath =
        mode === "pack"
            ? `/${safeLocale}/pricing?checkout=cancelled`
            : `/${safeLocale}/stars?checkout=cancelled`
    return {
        success: `${origin}${successPath}`,
        cancel: `${origin}${cancelPath}`,
    }
}

function requireStripe() {
    if (!stripe) {
        throw Object.assign(new Error("Stripe not configured"), {
            code: "STRIPE_NOT_CONFIGURED",
        })
    }
    return stripe
}

function buildPackLineItem(
    packId: string,
    currency: CurrencyCode
): SessionConfig {
    const pack = getPackById(packId)
    if (!pack) throw new Error("UNKNOWN_PACK")
    const amount = getPackPrice(packId, currency)
    if (amount === null) throw new Error("PACK_PRICE_UNAVAILABLE")
    const name =
        pack.stars === "infinity"
            ? "Infinity Stars Pass"
            : `${pack.stars} Star Pack`
    const description =
        pack.stars === "infinity"
            ? "Unlimited stars for 30 days"
            : `${pack.stars} stars with +${pack.bonus} bonus delivery`

    const stripeCurrency =
        toStripeCurrency(currency) as Stripe.Checkout.SessionCreateParams.LineItem.PriceData["currency"]

    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
        price_data: {
            currency: stripeCurrency,
            unit_amount: toMinorUnits(amount),
            product_data: {
                name,
                description,
            },
        },
        quantity: 1,
    }

    return {
        mode: "payment",
        line_items: [lineItem],
    }
}

function buildSubscriptionLineItem(
    plan: NonNullable<CheckoutBody["plan"]>,
    currency: CurrencyCode
): SessionConfig {
    const amount = getSubscriptionPrice(plan, currency)
    if (amount === null) throw new Error("PLAN_PRICE_UNAVAILABLE")

    const interval: Stripe.Checkout.SessionCreateParams.LineItem.PriceData.Recurring.Interval =
        plan === "annual" ? "year" : "month"
    const planName =
        plan === "annual"
            ? "Asking Fate Annual Subscription"
            : "Asking Fate Monthly Subscription"

    const stripeCurrency =
        toStripeCurrency(currency) as Stripe.Checkout.SessionCreateParams.LineItem.PriceData["currency"]

    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
        price_data: {
            currency: stripeCurrency,
            unit_amount: toMinorUnits(amount),
            recurring: { interval },
            product_data: {
                name: planName,
                description:
                    plan === "annual"
                        ? "Save over the monthly plan when billed yearly"
                        : "Flexible month-to-month access",
            },
        },
        quantity: 1,
    }

    return {
        mode: "subscription",
        line_items: [lineItem],
    }
}

export async function POST(req: NextRequest) {
    try {
        const raw = await req.json()
        const body = bodySchema.parse(raw) as CheckoutBody
        const currency = normalizeCurrency(body.currency) as CurrencyCode

        if (body.mode === "pack" && !body.packId) {
            return NextResponse.json(
                { error: "PACK_ID_REQUIRED" },
                { status: 400 }
            )
        }
        if (body.mode === "subscribe" && !body.plan) {
            return NextResponse.json(
                { error: "PLAN_REQUIRED" },
                { status: 400 }
            )
        }

        const stripeClient = requireStripe()
        const headerOrigin = req.headers.get("origin")
        const fallbackOrigin =
            headerOrigin ??
            process.env.NEXT_PUBLIC_SITE_URL ??
            (process.env.NEXT_PUBLIC_VERCEL_URL
                ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
                : null) ??
            "http://localhost:3000"

        const { success, cancel } = buildUrls(
            body.mode,
            body.locale,
            fallbackOrigin
        )
        const sessionConfig =
            body.mode === "pack"
                ? buildPackLineItem(body.packId!, currency)
                : buildSubscriptionLineItem(body.plan!, currency)

        const session = await stripeClient.checkout.sessions.create({
            mode: sessionConfig.mode,
            line_items: sessionConfig.line_items,
            success_url: success,
            cancel_url: cancel,
            customer_email: body.email,
            metadata: {
                mode: body.mode,
                packId: body.packId ?? "",
                plan: body.plan ?? "",
                userId: body.userId,
                locale: body.locale ?? "en",
                currency,
            },
            allow_promotion_codes: true,
        })

        return NextResponse.json({ id: session.id })
    } catch (error) {
        console.error("Stripe checkout error", error)
        const code =
            typeof error === "object" && error !== null && "code" in error
                ? (error as { code?: string }).code
                : undefined
        if (code === "STRIPE_NOT_CONFIGURED") {
            return NextResponse.json(
                { error: "Stripe not configured", code },
                { status: 503 }
            )
        }
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "INVALID_BODY", details: error.flatten() },
                { status: 400 }
            )
        }
        return NextResponse.json(
            { error: "CHECKOUT_FAILED" },
            { status: 500 }
        )
    }
}
